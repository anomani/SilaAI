const twilio = require('twilio');
const path = require('path');
require('dotenv').config({ path: '../../.env' });
const { handleUserInput, createThread } = require('../ai/scheduling');
const { saveMessage, toggleLastMessageReadStatus, saveSuggestedResponse, clearSuggestedResponse } = require('../model/messages');
const { getClientByPhoneNumber, getClientAutoRespond } = require('../model/clients');
const dbUtils = require('../model/dbUtils')
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const { getUserPushTokens } = require('../model/pushToken');
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

    // Clear the suggested response after sending a message
    await clearSuggestedResponse(clientId);
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
    let client = await getClientByPhoneNumber(Author);
    let clientId = '';
    const localDate = new Date().toLocaleString();
    const adjustedDate = adjustDate(localDate);

    if (!client || client.id === '') {
      // Create a new client if one doesn't exist
      clientId = await createClient('', '', Author, '', '');
      client = await getClientByPhoneNumber(Author);
    } else {
      clientId = client.id;
    }

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
      await sendNotificationToUser(
        'New Message from ' + client.firstname,
        `${client.firstname} ${client.lastname}: "${Body.substring(0, 50)}${Body.length > 50 ? '...' : ''}"`,
        clientId,
        client.firstname + ' ' + client.lastname,
        Body,
        false
      );
      return res.status(200).send('Message received');
    }
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
      if (client.id != '') {
        await toggleLastMessageReadStatus(client.id);
        if (responseMessage === "user" || responseMessage === "User") {
          await sendNotificationToUser(
            'New Message from ' + client.firstname,
            `${client.firstname} ${client.lastname}: "${lastMessage.substring(0, 50)}${lastMessage.length > 50 ? '...' : ''}"`,
            client.id,
            client.firstname + ' ' + client.lastname,
            lastMessage,
            false
          );
        }
        else {
          // Save the suggested response
          await saveSuggestedResponse(client.id, responseMessage);
          await sendNotificationToUser(
            client.firstname + ' ' + client.lastname,
            responseMessage,
            client.id,
            client.firstname + ' ' + client.lastname,
            lastMessage,
            true
          );
        }
      } 
      
        else {
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
  const barberPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const barber = await getUserByPhoneNumber(barberPhoneNumber);

  if (!barber) {
    console.log('No barber found with the given phone number');
    return;
  }

  const pushTokens = await getUserPushTokens(barber.id);

  if (!pushTokens || pushTokens.length === 0) {
    console.log('No push tokens found for the barber');
    return;
  }
  const notifications = pushTokens.map(token => ({
    to: token,
    sound: 'default',
    title: clientName,
    body: clientMessage,
    data: { 
      clientId, 
      clientName, 
      clientMessage,
      suggestedResponse: isSuggestedResponse ? body : null,
      notificationType: isSuggestedResponse ? 'suggestedResponse' : 'clientMessage'
    },
  }));

  try {
    console.log('Sending notifications:', notifications);
    let ticketChunks = await expo.sendPushNotificationsAsync(notifications);
    console.log('Notification results:', ticketChunks);

    // If it's a suggested response, save it to the database
    if (isSuggestedResponse) {
      await saveSuggestedResponse(clientId, body);
    }
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}

module.exports = {
  sendMessage,
  handleIncomingMessage,
  sendMessages,
  sendNotificationToUser,
  formatPhoneNumber
};