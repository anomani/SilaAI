const { MongoClient, ObjectId } = require('mongodb');
const dbUtils = require('./dbUtils');

/*
from, to, body, date, clientId
*/

async function saveMessage(from, to, body, date, clientId) {
  const db = await dbUtils.getDB();
  const messageCollection = db.collection('Messages');
  const message = { from, to, body, date, clientId };
  const result = await messageCollection.insertOne(message);
  await dbUtils.closeMongoDBConnection();
  console.log("Message saved: ", result);
  return result;
}

async function getAllMessages() {
  const db = await dbUtils.getDB();
  const messageCollection = db.collection('Messages');
  const messages = await messageCollection.find({}).toArray();
  await dbUtils.closeMongoDBConnection();
  return messages;
}

async function getMessagesByClientId(clientId) {
  const db = await dbUtils.getDB();
  const messageCollection = db.collection('Messages');
  const messages = await messageCollection.find({ clientId }).toArray();
  await dbUtils.closeMongoDBConnection();
  return messages;
}
async function deleteMessagesByClientId(clientId) {
  const db = await dbUtils.getDB();
  const messageCollection = db.collection('Messages');
  try {
    const result = await messageCollection.deleteMany({ clientId });
    console.log(`Messages deleted for clientId ${clientId}: `, result.deletedCount);
    return result;
  } catch (error) {
    console.error('Error deleting messages by clientId:', error);
    throw error;
  } finally {
    await dbUtils.closeMongoDBConnection();
  }
}


module.exports = { saveMessage, getAllMessages, getMessagesByClientId, deleteMessagesByClientId };