require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.db_user}:${process.env.db_password}@cluster0.cjjjauk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const admin = require("firebase-admin");
const serviceAccount = require("./firebase-admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//verify token:
const verifyFirebaseToken = async(req, res, next) =>{
  const authorizationString = req.headers?.authorization;

  if(!authorizationString || !authorizationString.startsWith('Bearer ')){
    return res.status(401).send({message : 'unauthorized access'});
  }

  const token = authorizationString.split(' ')[1];
  
  try{
    const decoded = await admin.auth().verifyIdToken(token);
    console.log(decoded);
    req.decoded = decoded;
    next();
  }
  catch(error){
    return res.status(401).send({ message: 'unauthorized access.' })
  }
}


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const db = client.db("jobportal");
    const jobsCollection = db.collection("jobs");
    const applicationCollection = db.collection("applications");

    //job api
    app.get('/jobs', async(req, res)=>{
      const email = req.query.email;
      const query = {};
      if(email){
        query.hr_email = email;
      }
      const jobs = await jobsCollection.find(query).toArray();
      res.send(jobs);
    })

    app.get('/jobs/:id', async(req, res)=>{
      const id = req.params.id;
      const query = { _id : new ObjectId(id) };
      const job = await jobsCollection.findOne(query);
      res.send(job);
    })

    app.post('/jobs', async(req, res)=>{
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    })

    //job application related apis
    app.get('/applications', verifyFirebaseToken, async(req, res)=>{
      const email = req.query.email;

      const query = { applicant : email };
      const result = await applicationCollection.find(query).toArray();
      res.send(result); 
    })
    
    //get all the application on a job for recruiter:
    app.get('/applications/job/:job_id', async(req, res)=>{
      const job_id = req.params.job_id;
      const query = { jobId : job_id};
      console.log(job_id);
      const result = await applicationCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/applications', async(req, res)=>{
      const application = req.body;
      const result = await applicationCollection.insertOne(application);
      res.send(result);
    })

    app.patch('/applications/:id', async(req, res) =>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: req.body.status
        }
      }
      const result = await applicationCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res)=>{
  res.send('job portal loading...');
})

app.listen(port, ()=>{
  console.log("running on port:", port);
})