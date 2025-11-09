const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
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

// middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// mongodb connection
async function run() {
  try {
    await client.connect();

    const db = client.db('model_stack');
    const modelsCollection = db.collection('models');

    // get all models
    app.get('/models', async (req, res) => {
      const cursor = modelsCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
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
