const path = require('path');
const { readCSV } = require('../services/csvService');
const { sendMessage } = require('../config/twilio');
const {getClients, getCSV} = require('../config/headlessBrowser')
const fs = require('fs');


async function fetchClients(req, res) {
    try {
      const minDaysSinceLast = 1; 
      const filePath = path.resolve(__dirname, '../../data/list.csv');
      const clients = await readCSV(filePath, minDaysSinceLast);
      res.status(200).json(clients);
    } catch (error) {
      res.status(500).send(`Error fetching clients: ${error.message}`);
    }
  }

  async function sendFollowUpMessages(req, res) {
    try {
        const selectedClients = req.body.clients; // Expect an array of selected clients

        const messages = selectedClients.map(client => {
            const messageBody = `Hello ${client['First Name']}, we miss you at the barbershop! It's been a while since your last appointment. Schedule your next visit now!`;
            return sendMessage(client['Phone'], messageBody);
        });

        await Promise.all(messages);

        res.status(200).send('Messages sent successfully');
    } catch (error) {
        res.status(500).send(`Error sending messages: ${error.message}`);
    }
}

async function updateClientData(req, res) {
    try {
        await getClients();
        await getCSV();
        res.status(200).send('Client data updated successfully');
    } catch (error) {
        res.status(500).send(`Error updating client data: ${error.message}`);
    }
}


module.exports = {
    sendFollowUpMessages,
    fetchClients,
    updateClientData
};