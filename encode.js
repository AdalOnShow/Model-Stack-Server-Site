const fs = require('fs');
const key = fs.readFileSync("./model-stack-firebase-adminsdk.json", 'utf8');
const base64Key = Buffer.from(key).toString('base64');
console.log(base64Key);