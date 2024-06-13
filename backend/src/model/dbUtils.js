const dotenv = require('dotenv')
dotenv.config({path : '../../.env'})

// import the mongodb driver
const { MongoClient } = require('mongodb');

// the mongodb server URL
const dbURL = process.env.DB_URL;
// MongoDB database connection
let client;
let database;

// connection to the db
const connect = async () => {
  // always use try/catch to handle any exception
  try {
    client = new MongoClient(dbURL);
    database = client.db('Uzi');
    console.log('connected to db: Uzi');
  } catch (err) {
    console.log(err.message);
  }
  return client; // we return the entire client, not just the DB
};
/**
 *
 * @returns the database attached to this MongoDB connection
 */
const getDB = async () => {
  // test if there is an active connection
  if (!client) {
    await connect();
  }
  return database;
};

/**
 *
 * Close the mongodb connection
 */
const closeMongoDBConnection = async () => {
  await client.close();
};

// export the functions
module.exports = {
  closeMongoDBConnection,
  getDB,
  connect,
};

