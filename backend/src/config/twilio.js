const twilio = require('twilio');
const path = require('path');
require('dotenv').config({ path: '../../.env' });
const { handleUserInput, createThread } = require('../ai/scheduling');
const { saveMessage, toggleLastMessageReadStatus } = require('../model/messages');
const { getClientByPhoneNumber, getClientAutoRespond } = require('../model/clients');
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

// Add this near the top of the file, with other imports and global variables
const pendingMessages = new Map();

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

function adjustDate(date) {
  const adjustedDate = new Date(date);
  adjustedDate.setHours(adjustedDate.getHours() - 4);
  return adjustedDate.toLocaleString();
}

async function sendMessage(to, body, initialMessage = true, manual = true) {
  const to_formatted = formatPhoneNumber(to);
  const customer = await getClientByPhoneNumber(to);
  const localDate = new Date().toLocaleString();
  const adjustedDate = adjustDate(localDate);
  console.log("lolocalDate", localDate)
  console.log("loladjustedDate", adjustedDate)
  let clientId;
  if (customer.id != '') {
    clientId = customer.id
    await saveMessage(process.env.TWILIO_PHONE_NUMBER, to, body, adjustedDate, clientId, true, !manual);
    console.log(initialMessage, manual)
    // Create or get the thread, passing the initialMessage parameter
    const thread = await createThread(to_formatted, initialMessage);
    if (manual) {
      await openai.beta.threads.messages.create(thread.id, {
        role: "assistant",
        content: body,
      });
    }
    // List the messages of the thread and print them out
    const messages = await openai.beta.threads.messages.list(thread.id);
    messages.data.forEach((message, index) => {
      console.log(`Message ${index + 1}:`);
      console.log(`Role: ${message.role}`);
      console.log(`Content: ${message.content[0].text.value}`);
      console.log('---');
    });
  }
  
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
  };
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
    const client = await getClientByPhoneNumber(Author);
    let clientId = '';
    const localDate = new Date().toLocaleString();
    const adjustedDate = adjustDate(localDate);
    if (client.id != '') {
      clientId = client.id;
      try {
        // Set isAI to true for incoming messages
        await saveMessage(Author, process.env.TWILIO_PHONE_NUMBER, Body, adjustedDate, clientId, true);
      } catch (saveError) {
        if (saveError.code !== '23505') {
          console.error('Error saving message:', saveError);
        } else {
          console.log('Duplicate message detected, skipping save');
        }
      }

      // Check auto_respond status
      const autoRespond = await getClientAutoRespond(clientId);
      if (!autoRespond) {
        // If auto_respond is false, don't process the message with AI
        await toggleLastMessageReadStatus(clientId);
        await sendNotificationToUser(client.firstname + ' ' + client.lastname, Body, clientId);
        return res.status(200).send('Message received');
      }
    }

    // Add message to pending messages
    if (!pendingMessages.has(Author)) {
      pendingMessages.set(Author, []);
      // Schedule processing after a random delay between 1 and 5 minutes
      // const delayInMs = Math.floor(Math.random() * (5 * 60 * 1000 - 1 * 60 * 1000 + 1)) + 1 * 60 * 1000;
      setTimeout(() => processDelayedResponse(Author), 10000);
    }
    pendingMessages.get(Author).push(Body);

    // Immediately respond to Twilio
    res.status(200).send('Message received');

  } catch (error) {
    console.error('Error handling incoming message:', error);
    res.status(500).send('Error processing message');
  }
}

async function processDelayedResponse(phoneNumber) {
  console.log(`Processing delayed response for ${phoneNumber}`);
  const messages = pendingMessages.get(phoneNumber);
  const lastMessage = messages[messages.length - 1];
  try {
    pendingMessages.delete(phoneNumber);
    if (messages && messages.length > 0) {
      const responseMessage = await handleUserInput(messages, phoneNumber);
      console.log(responseMessage)
      
      const client = await getClientByPhoneNumber(phoneNumber);
      await toggleLastMessageReadStatus(client.id);

      // Check if the response contains any numbers or is a user response
      // if (/\d/.test(responseMessage)) {
      //   // Send a notification for AI suggested response
      //   await sendNotificationToUser(
      //     'Confirm AI Response',
      //     responseMessage,
      //     client.id,
      //     client.firstname + ' ' + client.lastname,
      //     lastMessage,
      //     true
      //   );
      // } else 
      if (responseMessage === "user" || responseMessage === "User") {
        // Send a notification for client message
        await sendNotificationToUser(
          'New Client Message',
          `${client.firstname} ${client.lastname}: ${lastMessage}`,
          client.id,
          client.firstname + ' ' + client.lastname,
          lastMessage,
          false
        );
      } else {
        // Send the AI response to the client
        await sendMessage(phoneNumber, responseMessage, false, false);
      }
    }
  } catch (error) {
    console.error('Error processing delayed response:', error);
    const client = await getClientByPhoneNumber(phoneNumber);
    await sendNotificationToUser(
      'New Client Message',
      `${client.firstname} ${client.lastname}: ${lastMessage}`,
      client.id,
      client.firstname + ' ' + client.lastname,
      lastMessage,
      false
    );
  }
}

async function sendNotificationToUser(title, body, clientId, clientName, clientMessage, isSuggestedResponse) {
  console.log("SENDING NOTIFICATION", body)
  // const barberPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  // const barber = await getUserByPhoneNumber(barberPhoneNumber);

  // if (!barber) {
  //   console.log('No barber found with the given phone number');
  //   return;
  // }

  // const pushToken = await getUserPushToken(barber.id);

  // if (!pushToken) {
  //   console.log('No push token found for the barber');
  //   return;
  // }

  // const notification = {
  //   to: pushToken,
  //   sound: 'default',
  //   title: title,
  //   body: body,
  //   data: { 
  //     clientId, 
  //     clientName, 
  //     clientMessage,
  //     suggestedResponse: isSuggestedResponse ? body : null,
  //     notificationType: isSuggestedResponse ? 'suggestedResponse' : 'clientMessage'
  //   },
  // };

  // try {
  //   console.log(notification)
  //   let ticketChunk = await expo.sendPushNotificationsAsync([notification]);
  //   console.log(ticketChunk);
  // } catch (error) {
  //   console.error('Error sending push notification:', error);
  // }
}

module.exports = {
  sendMessage,
  handleIncomingMessage,
  sendMessages,
  sendNotificationToUser,
  formatPhoneNumber
};