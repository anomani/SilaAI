const twilio = require('twilio');
const path = require('path');
require('dotenv').config({ path: '../../.env' });
const { handleUserInput, createThread } = require('../ai/scheduling');
const { saveMessage, toggleLastMessageReadStatus } = require('../model/messages');
const { getClientByPhoneNumber } = require('../model/clients');
const dbUtils = require('../model/dbUtils')
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const { getUserPushToken } = require('../model/pushToken');
const { getUserByPhoneNumber } = require('../model/users');
const { Expo } = require('expo-server-sdk');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize the Expo SDK
let expo = new Expo();

function formatPhoneNumber(phoneNumber) {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Ensure the number has 10 digits
  if (cleaned.length === 10) {
    // Add the +1 country code
    cleaned = '1' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
  } else {
    return null;
  }
  
  return '+' + cleaned;
}


async function sendMessage(to, body) {
  console.log("To: ", to)
  const customer = await getClientByPhoneNumber(to);
  const localDate = new Date().toLocaleString();
  let clientId;
  if (customer.id != '') {
    clientId = customer.id
    await saveMessage(process.env.TWILIO_PHONE_NUMBER, to, body, localDate, clientId);

    // Add the message to the thread as an assistant message
    const thread = await createThread(to);
    
    await openai.beta.threads.messages.create(thread.id, {
      role: "assistant",
      content: body,
    });
  }
  const to_formatted = formatPhoneNumber(to);
  console.log("To formatted: ", to_formatted)
  return client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to_formatted,
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
  for (const client of clients) {
    await sendMessage(client, message);
  }
};


async function handleIncomingMessage(req, res) {
  if (!req.body) {
    return res.status(400).send('No request body!');
  }

  const { EventType } = req.body;
  let Author, Body;

  if (EventType === 'onConversationAdd') {
    Author = req.body['MessagingBinding.Address'];
    Body = req.body.MessageBody;
  } else if (EventType === 'onMessageAdd') {
    Author = req.body.Author;
    Body = req.body.Body;
  } else {
    return res.status(400).send('Unsupported EventType');
  }

  try {
    console.log(Author)
    const client = await getClientByPhoneNumber(Author);
    console.log(client)
    let clientId;
    const localDate = new Date().toLocaleString();
    if (client.id != '') {
      clientId = client.id
      try {
        await saveMessage(Author, process.env.TWILIO_PHONE_NUMBER, Body, localDate, clientId);
      } catch (saveError) {
        if (saveError.code !== '23505') {  // If it's not a duplicate key error, rethrow
          throw saveError;
        }
        // If it's a duplicate key error, log it and continue
        console.log('Duplicate message detected, skipping save');
      }
    }
    // const areeb = '+16478985997'
    const responseMessage = await handleUserInput(Body, Author);
    console.log(responseMessage)
    if (responseMessage === "user" || responseMessage === "User")  {
      await toggleLastMessageReadStatus(clientId);
      await sendNotificationToUser(client.firstname, Body, clientId);  // Pass clientId here
    } else {
      await sendMessage(Author, responseMessage);
    }

    res.status(200).send('Message sent');
  } catch (error) {
    console.error('Error handling incoming message:', error);
    res.status(500).send('Error processing message');
  }
};




async function sendNotificationToUser(clientName, message, clientId) {
  const barberPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const barber = await getUserByPhoneNumber(barberPhoneNumber);

  if (!barber) {
    console.log('No barber found with the given phone number');
    return;
  }

  const pushToken = await getUserPushToken(barber.id);

  if (!pushToken) {
    console.log('No push token found for the barber');
    return;
  }

  const notification = {
    to: pushToken,
    sound: 'default',
    title: 'New Client Message',
    body: `${clientName}: ${message}`,
    data: { clientName, message, clientId },  // Add clientId to the data
  };

  try {
    console.log(notification)
    let ticketChunk = await expo.sendPushNotificationsAsync([notification]);
    console.log(ticketChunk);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}



module.exports = {
  sendMessage,
  handleIncomingMessage,
  sendMessages,
  sendNotificationToUser,
  formatPhoneNumber
};