const { getAllClients, createClient, searchForClients, deleteClient, followUp, getClientById } = require('../model/clients');
const dbUtils = require('../model/dbUtils');


async function getClients(req, res) {
    try {
        await dbUtils.connect();
        const clients = await getAllClients();
        await dbUtils.closeMongoDBConnection();
        res.status(200).json(clients);
    } catch (error) {
        res.status(500).send(`Error fetching clients: ${error.message}`);
    }
}

async function addClient(req, res) {
    const { firstName, lastName, number, email } = req.body;
    try {
        await dbUtils.connect();
        const result = await createClient(firstName, lastName, number, email);
        const client = {
            _id: result.insertedId,
            firstName,
            lastName,
            number,
            email
        };
        console.log("Client",client._id.toString());
        await dbUtils.closeMongoDBConnection();
        res.status(201).json(client);
    } catch (error) {
        res.status(500).send(`Error creating client: ${error.message}`);
    }
}

async function searchClients(req, res) {
  try {
    const { query } = req.query;
    await dbUtils.connect();
    const clients = await searchForClients(query);
    await dbUtils.closeMongoDBConnection();
    console.log(clients);
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).send(`Error searching clients: ${error.message}`);
  }
}

async function delClient(req, res) {
  const { id } = req.params;
  try {
    await dbUtils.connect();
    await deleteClient(id);
    await dbUtils.closeMongoDBConnection();
    res.status(200).send(`Client deleted: ${id}`);
  } catch (error) {
    res.status(500).send(`Error deleting client: ${error.message}`);
  }
}

async function getSuggestedFollowUps(req, res) {
    const { days } = req.params;
    await dbUtils.connect();
    const suggestedFollowUps = await followUp(days);
    await dbUtils.closeMongoDBConnection();
    res.status(200).json({suggestedFollowUps});
}

async function clientIDGet(req, res) {
    const { id } = req.params;
    await dbUtils.connect();
    const client = await getClientById(id);
    res.status(200).json(client);
}


module.exports = { getClients, addClient, searchClients, delClient, getSuggestedFollowUps, clientIDGet };
