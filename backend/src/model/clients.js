const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const dbUtils = require('./dbUtils');
dotenv.config({ path: '../../.env' });


/*

Clients:
- Client Id
- First Name
- Last Name
- Number 
- Email
*/

async function createClient(firstName, lastName, number, email) {
    const db = await dbUtils.getDB();
    const clientCollection = db.collection('Client');
    const newClient = {
        firstName: firstName,
        lastName: lastName,
        number: number,
        email: email
    };
    const result = await clientCollection.insertOne(newClient);
    await dbUtils.closeMongoDBConnection()
    return result;
}

async function getClientById(clientId) {
    const db = await dbUtils.getDB();
    const clientCollection = db.collection('Client');
    const client = await clientCollection.findOne({ _id: new ObjectId(clientId) });
    await dbUtils.closeMongoDBConnection()
    return client;
}

async function updateClient(clientId, updateData) {
    const db = await dbUtils.getDB();
    const clientCollection = db.collection('Client');
    const result = await clientCollection.findOneAndUpdate(
        { _id: new ObjectId(clientId) },
        { $set: updateData },
        { returnOriginal: false }
    );
    await dbUtils.closeMongoDBConnection()
    return result.value;
}

async function deleteClient(clientId) {
    const db = await dbUtils.getDB();
    const clientCollection = db.collection('Client');
    const result = await clientCollection.findOneAndDelete({ _id: new ObjectId(clientId) });
    await dbUtils.closeMongoDBConnection()
    return result.value;
}

async function getAllClients() {
    const db = await dbUtils.getDB();
    const clientCollection = db.collection('Client');
    const clients = await clientCollection.find({}).toArray();
    await dbUtils.closeMongoDBConnection()
    return clients;
}

module.exports = {
    createClient,
    getClientById,
    updateClient,
    deleteClient,
    getAllClients
};

