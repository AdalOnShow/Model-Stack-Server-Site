const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const dotenv = require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

// mongodb uri and client
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3gfisca.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// firebase admin connection
const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, 'base64').toString('utf8');
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(cors());
app.use(express.json());

const verifyFirebaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (authorization) {
    const token = authorization.split(' ')[1];
    admin.auth().verifyIdToken(token)
      .then(decodedToken => {
        req.decodedEmail = decodedToken.email;
        next();
      })
      .catch(error => {
        res.status(401).send({ message: 'unauthorized access' });
      });
  } else {
    res.status(401).send({ message: 'unauthorized access' });
  }
};

app.get('/', (req, res) => {
  res.send('Model Stack API Server Is Running!....');
});

// mongodb connection
async function run() {
  try {
    // await client.connect();

    const db = client.db('model_stack');
    const modelsCollection = db.collection('models');
    const purchasesCollection = db.collection('purchases');

    // get all models
    app.get('/models', async (req, res) => {
      const email = req.query.email;
      const { search, frameworks } = req.query;
      const project = { name: 1, image: 1, framework: 1, description: 1, _id: 1, useCase: 1, createdBy: 1 };
      const query = {}

      if (email) {
        query.createdBy = email;
      }

      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }
      if (frameworks) {
        query.framework = { $in: frameworks.split(',') };
      }
      const cursor = modelsCollection.find(query).project(project);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get lastest models
    app.get('/latest-models', async (req, res) => {
      const cursor = modelsCollection.find({}).sort({ createdAt: -1 }).project({ name: 1, image: 1, framework: 1, description: 1, _id: 1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get one model using _id
    app.get('/models/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await modelsCollection.findOne(query);
      res.send(result);
    });

    // get models frameworksList
    app.get('/frameworks', async (req, res) => {
      const cursor = modelsCollection.aggregate([
        { $group: { _id: "$framework" } },
        { $project: { _id: 0, framework: "$_id" } }
      ])
      const result = await cursor.toArray();
      const frameworks = result.map(f => f.framework);
      res.send(frameworks);
    });


    // create model
    app.post('/models', verifyFirebaseToken, async (req, res) => {
      const model = req.body;
      const result = await modelsCollection.insertOne(model);
      res.send(result);
    });

    // update model usging patch method
    app.patch('/models/:id', verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const updatedModel = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedModel
      };
      const result = await modelsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // query models by creaded email
    app.get('/purchases', verifyFirebaseToken, async (req, res) => {
      const email = req.query.email;
      const query = { purchasedEmail: email };
      if (email !== req.decodedEmail) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const cursor = purchasesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // delete a model
    app.delete('/models/:id', verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await modelsCollection.deleteOne(query);
      res.send(result);
    });

    // post a new purchase
    app.post('/purchases', verifyFirebaseToken, async (req, res) => {
      const purchase = req.body;
      const result = await purchasesCollection.insertOne(purchase);
      res.send(result);
    });

    // increase model purchase value after purchase
    app.patch('/models/:id', verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: {
          purchased: 1
        }
      };
      const result = await modelsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}

// mongodb run
run().catch(console.dir);

// server listening
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
