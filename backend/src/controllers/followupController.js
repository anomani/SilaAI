const path = require('path');
const { readCSV } = require('../services/csvService');
const { sendMessage } = require('../config/twilio');
const {getClients, getCSV} = require('../config/headlessBrowser')
const fs = require('fs');


async function sendFollowUpMessages(req, res) {
    try {
        await getClients();
        await getCSV();
        const filePath = path.resolve(__dirname, '../../data/list.csv');
        const minDaysSinceLast = 1; 

        const clients = await readCSV(filePath, minDaysSinceLast);


        fs.unlink(filePath, (err) => {

            if (err) {
                console.error('Error deleting file:', err);
            } else {
                console.log('File deleted successfully');
            }
        });

        
        const messages = clients.map(client => {
            console.log(client['First Name'])
            console.log(client['Phone'])
            const messageBody = `Hello ${client['First Name']}, we miss you at the barbershop! It's been a while since your last appointment. Schedule your next visit now!`;
            return sendMessage(client['Phone'], messageBody);
        });

        await Promise.all(messages);

        


        res.status(200).send('Messages sent successfully');
    } catch (error) {
        res.status(500).send(`Error sending messages: ${error.message}`);
    }
}


module.exports = {
    sendFollowUpMessages
};