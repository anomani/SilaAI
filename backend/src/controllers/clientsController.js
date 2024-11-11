const { getAllClients, createClient, searchForClients, 
    deleteClient, followUp, getClientById, updateClient, getDaysSinceLastAppointment, 
    updateClientOutreachDate, getClientAutoRespond, updateClientAutoRespond, getClientByPhoneNumber } = require('../model/clients');
const dbUtils = require('../model/dbUtils');
const { authenticateToken } = require('../middleware/authMiddleware');

async function getClients(req, res) {
    try {
        const userId = req.user.id;
        const clients = await getAllClients(userId);
        res.status(200).json(clients);
    } catch (error) {
        res.status(500).send(`Error fetching clients: ${error.message}`);
    }
}


async function addClient(req, res) {
    const userId = req.user.id;
    const { firstname, lastname, phonenumber, email } = req.body;
    try {
        const result = await createClient(firstname, lastname, phonenumber, email, "", userId);
        const client = {
            id: result.insertedId,
            firstname,
            lastname,
            phonenumber,
            email
        };
        res.status(201).json(client);
    } catch (error) {
        res.status(500).send(`Error creating client: ${error.message}`);
    }
}



async function searchClients(req, res) {
    const userId = req.user.id;
  try {
    const { query } = req.query;
    const clients = await searchForClients(query, userId);
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
    const userId = req.user.id;
    const { days } = req.params;
    const suggestedFollowUps = await followUp(days, userId);
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
        const { firstname, lastname, phonenumber, email, notes } = req.body;
        const result = await updateClient(id, firstname, lastname, phonenumber, email);
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

async function updateClientOutreachDateController(req, res) {
    const { id } = req.params;
    const { outreachDate } = req.body;
    await updateClientOutreachDate(id, outreachDate);
    res.status(200).send(`Client outreach date updated: ${id}`);
}

async function getClientAutoRespondController(req, res) {
    const { id } = req.params;
    try {
        const autoRespond = await getClientAutoRespond(id);
        res.status(200).json({ autoRespond });
    } catch (error) {
        res.status(500).send(`Error fetching client auto_respond status: ${error.message}`);
    }
}

async function updateClientAutoRespondController(req, res) {
    const { id } = req.params;
    const { autoRespond } = req.body;
    try {
        const updatedClient = await updateClientAutoRespond(id, autoRespond);
        res.status(200).json(updatedClient);
    } catch (error) {
        res.status(500).send(`Error updating client auto_respond status: ${error.message}`);
    }
}

async function getClientNameByPhone(req, res) {
    const { phoneNumber, userId } = req.params;
    try {
        const client = await getClientByPhoneNumber(phoneNumber, userId);
        res.status(200).json({
            firstName: client.firstname || '',
            lastName: client.lastname || ''
        });
    } catch (error) {
        res.status(500).send(`Error fetching client name: ${error.message}`);
    }
}

module.exports = { getClients, addClient, searchClients, delClient, getSuggestedFollowUps, clientIDGet, updateTheClient, daysSinceLastAppointment, updateClientOutreachDateController, getClientAutoRespondController, updateClientAutoRespondController, getClientNameByPhone };