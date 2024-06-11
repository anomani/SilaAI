const twilio = require('twilio');
const path = require('path');
require('dotenv').config({ path: '../../.env' });
const { handleUserInput } = require('../ai/scheduling');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function sendMessage(to, body) {
  return client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to,
    body: body
  })
  .then(message => {
    console.log(`Message sent: ${message.sid}`);
    return message;
  })
  .catch(error => {
    console.error(`Failed to send message: ${error.message}`);
    throw error;
  });
};

async function sendMessages(clients, message) {
  console.log(clients) 
  console.log(message)

  for (const client of clients) {
    await sendMessage(client, message);
  }
};

async function handleIncomingMessage(req, res) {
  if (!req.body) {
    return res.status(400).send('No request body!');
  }

  const { Author, Body } = req.body;
  try {
    const responseMessage = await handleUserInput(Body);
    sendMessage(Author, responseMessage);
    res.status(200).send('Message sent');
  } catch (error) {
    console.error('Error handling incoming message:', error);
    res.status(500).send('Error processing message');
  }
};

module.exports = {
  sendMessage,
  handleIncomingMessage,
  sendMessages
};

