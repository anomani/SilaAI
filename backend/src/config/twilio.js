const twilio = require('twilio');
const path = require('path');
require('dotenv').config({ path: '../../.env' });
const { handleUserInput } = require('../ai/scheduling');
const { saveMessage, toggleLastMessageReadStatus } = require('../model/messages');
const { getClientByPhoneNumber } = require('../model/clients');
const dbUtils = require('../model/dbUtils')
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const { getUserPushToken } = require('../model/pushToken');
const { getUserByPhoneNumber } = require('../model/users');

// const { Expo } = require('expo-server-sdk');

// // Initialize the Expo SDK
// let expo = new Expo();

async function sendMessage(to, body) {
  const customer = await getClientByPhoneNumber(to);
  const name = customer.firstname;
  const clientId = customer.id
  const localDate = new Date().toLocaleString();
  await saveMessage(process.env.TWILIO_PHONE_NUMBER, to, body, localDate, clientId);

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
    const clientId = client.id;
    const clientName = `${client.firstname} ${client.lastname}`;
    const localDate = new Date().toLocaleString();

    await saveMessage(Author, process.env.TWILIO_PHONE_NUMBER, Body, localDate, clientId);

    const responseMessage = await handleUserInput(Body, Author);
    if (responseMessage === "user")  {
      await toggleLastMessageReadStatus(clientId);
      // await sendNotificationToUser(clientName, Body);
    } else {
      await sendMessage(Author, responseMessage);
    }

    res.status(200).send('Message sent');
  } catch (error) {
    console.error('Error handling incoming message:', error);
    res.status(500).send('Error processing message');
  }
};



// async function sendNotificationToUser(clientName, message) {
//   const barberPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
//   const barber = await getUserByPhoneNumber(barberPhoneNumber);

//   if (!barber) {
//     console.log('No barber found with the given phone number');
//     return;
//   }

//   const pushToken = await getUserPushToken(barber.id);

//   if (!pushToken) {
//     console.log('No push token found for the barber');
//     return;
//   }

//   const notification = {
//     to: pushToken,
//     sound: 'default',
//     title: 'New Client Message',
//     body: `${clientName}: ${message}`,
//     data: { clientName, message },
//   };

//   console.log(notification)

//   try {
//     let ticketChunk = await expo.sendPushNotificationsAsync([notification]);
//     console.log(ticketChunk);
//   } catch (error) {
//     console.error('Error sending push notification:', error);
//   }
// }



module.exports = {
  sendMessage,
  handleIncomingMessage,
  sendMessages,
  sendNotificationToUser
};
