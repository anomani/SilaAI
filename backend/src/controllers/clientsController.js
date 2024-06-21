const { getAllClients, createClient, searchForClients, deleteClient, followUp, getClientById, updateClient, getDaysSinceLastAppointment } = require('../model/clients');
const dbUtils = require('../model/dbUtils');


async function getClients(req, res) {
    try {
        const clients = await getAllClients();
        res.status(200).json(clients);
    } catch (error) {
        res.status(500).send(`Error fetching clients: ${error.message}`);
    }
}

async function addClient(req, res) {
    const { firstName, lastName, phoneNumber, email } = req.body;
    try {
        const result = await createClient(firstName, lastName, phoneNumber, email);
        const client = {
            id: result.insertedId,
            firstName,
            lastName,
            phoneNumber,
            email
        };
        res.status(201).json(client);
    } catch (error) {
        res.status(500).send(`Error creating client: ${error.message}`);
    }
}



async function searchClients(req, res) {
  try {
    const { query } = req.query;
    const clients = await searchForClients(query);
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).send(`Error searching clients: ${error.message}`);
  }
}

async function delClient(req, res) {
  const { id } = req.params;
  try {
    await deleteClient(id);
    res.status(200).send(`Client deleted: ${id}`);
  } catch (error) {
    res.status(500).send(`Error deleting client: ${error.message}`);
  }
}

async function getSuggestedFollowUps(req, res) {
    const { days } = req.params;
    const suggestedFollowUps = await followUp(days);
    res.status(200).json({suggestedFollowUps});
}

async function clientIDGet(req, res) {
    const { id } = req.params;
    const client = await getClientById(id);
    res.status(200).json(client);
}

async function updateTheClient(req, res) {
    try {
        const { id } = req.params;
        const { firstName, lastName, phoneNumber, email, notes } = req.body;
        const result = await updateClient(id, firstName, lastName, phoneNumber, email);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).send(`Error updating client: ${error.message}`);
    }
}

async function daysSinceLastAppointment(req, res) {
    const { id } = req.params;
    const daysSinceLastAppointment = await getDaysSinceLastAppointment(id);
    res.status(200).json({ daysSinceLastAppointment });
}
module.exports = { getClients, addClient, searchClients, delClient, getSuggestedFollowUps, clientIDGet, updateTheClient, daysSinceLastAppointment };
