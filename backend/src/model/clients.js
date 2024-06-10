const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const dbUtils = require('./dbUtils');
dotenv.config({ path: '../../.env' });


/*

Clients:
- First Name
- Last Name
- Number 
- Email
- Days since last appointment
- Notes
*/

async function createClient(firstName, lastName, number, email, daysSinceLastAppointment, notes) {
    const db = await dbUtils.getDB();
    const clientCollection = db.collection('Client');
    const newClient = {
        firstName: firstName,
        lastName: lastName,
        number: number,
        email: email,
        daysSinceLastAppointment: daysSinceLastAppointment,
        notes: notes
    };
    const result = await clientCollection.insertOne(newClient);
    await dbUtils.closeMongoDBConnection()
    console.log(result)
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

async function searchForClients(query) {
    const db = await dbUtils.getDB();
    const clientCollection = db.collection('Client');
    
    // Validate and convert query to string
    if (query == null) {
        throw new Error("Query parameter is required");
    }
    const searchQuery = String(query);

    try {
        // Use the $regex operator to search for the query string
        const clients = await clientCollection.find({
            $or: [
                { firstName: { $regex: searchQuery, $options: 'i' } },
                { lastName: { $regex: searchQuery, $options: 'i' } }
            ]
        }).toArray();
        return clients;
    } catch (error) {
        console.error(`Error searching for clients: ${error.message}`);
        throw error;
    } finally {
        await dbUtils.closeMongoDBConnection();
    }
}

// async function createTextIndex() {
//     const db = await dbUtils.getDB();
//     const clientCollection = db.collection('Client');
//     await clientCollection.createIndex({ firstName: "text", lastName: "text"});
//     await dbUtils.closeMongoDBConnection();
// }

// Call this function once when setting up your application
// createTextIndex().catch(console.error);


async function followUp(days) {
    const db = await dbUtils.getDB();
    const clientCollection = db.collection('Client');

    // Ensure days is a number
    const daysNumber = parseInt(days, 10);
    if (isNaN(daysNumber)) {
        throw new Error("The 'days' parameter must be a valid number");
    }

    try {
        const clients = await clientCollection.find({ daysSinceLastAppointment: { $gte: daysNumber } }).toArray();
        console.log('Clients found:', clients);
        return clients;
    } catch (error) {
        console.error('Error fetching clients for follow-up:', error);
        throw error;
    } finally {
        await dbUtils.closeMongoDBConnection();
    }
}



module.exports = {
    createClient,
    getClientById,
    updateClient,
    deleteClient,
    getAllClients,
    searchForClients,
    followUp
};

