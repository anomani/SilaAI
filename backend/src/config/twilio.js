const twilio = require('twilio');
require('dotenv').config({ path: '../../.env' });
const { handleUserInput, createThread } = require('../ai/scheduling');
const { saveMessage, toggleLastMessageReadStatus, saveSuggestedResponse, clearSuggestedResponse } = require('../model/messages');
const { createClient, getClientByPhoneNumber, getClientAutoRespond } = require('../model/clients');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const { getUserPushTokens } = require('../model/pushToken');
const { getUserByPhoneNumber, getUserByBusinessNumber, getUserById } = require('../model/users');
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

async function sendMessage(to, body, userId, initialMessage = true, manual = true) {
  const to_formatted = formatPhoneNumber(to);
  const customer = await getClientByPhoneNumber(to, userId);
  const localDate = new Date().toLocaleString();
  const adjustedDate = adjustDate(localDate);
  const user = await getUserById(userId);
  let clientId;
  if (customer.id != '') {
    clientId = customer.id
    console.log("userId: ", userId)
    await saveMessage(user.business_number, to, body, adjustedDate, clientId, true, !manual, userId);
    console.log(initialMessage, manual)
    // Create or get the thread, passing the initialMessage parameter
    const thread = await createThread(to_formatted, initialMessage, userId);
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
    from: user.business_number,
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

async function sendMessages(clients, message, userId) {
  for (const client of clients) {
    console.log("user_id: ", userId)
    await sendMessage(client, message, userId);
  };
};

async function handleIncomingMessage(req, res) {
  if (!req.body) {
    return res.status(400).send('No request body!');
  }
  console.log(req.body)
  const { EventType } = req.body;
  let Author, Body, ConversationSid;

  if (EventType === 'onConversationAdd') {
    Author = req.body['MessagingBinding.Address'];
    Body = req.body.MessageBody;
  } else if (EventType === 'onMessageAdd') {
    Author = req.body.Author;
    Body = req.body.Body;
    ConversationSid = req.body.ConversationSid;
  } else {
    return res.status(400).send('Unsupported EventType');
  }

  try {
    console.log(ConversationSid)
    const business_number = await getContactPhoneNumberFromConversation(ConversationSid)
    console.log("Business Number: ", business_number)
    const user = await getUserByBusinessNumber(business_number)
    console.log(user)
    let client = await getClientByPhoneNumber(Author, user.id);
    let clientId = '';
    const localDate = new Date().toLocaleString();
    const adjustedDate = adjustDate(localDate);

    if (!client || client.id === '') {
      // Create a new client if one doesn't exist
      clientId = await createClient('', '', Author, '', '', user.id);
      client = await getClientByPhoneNumber(Author, user.id);
    } else {
      clientId = client.id;
    }

    try {
      // Set isAI to true for incoming messages
      console.log("user.id: ", user.id)
      await saveMessage(Author, user.business_number, Body, adjustedDate, clientId, true, false, user.id);
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
      // await sendNotificationToUser(
      //   'New Message from ' + client.firstname,
      //   `${client.firstname} ${client.lastname}: "${Body.substring(0, 50)}${Body.length > 50 ? '...' : ''}"`,
      //   clientId,
      //   client.firstname + ' ' + client.lastname,
      //   Body,
      //   false,
      //   user.id
      // );
      return res.status(200).send('Message received');
    }

    // Add message to pending messages
    if (!pendingMessages.has(Author)) {
      pendingMessages.set(Author, []);
      
      // Check if the number is the special case
      const formattedAuthor = formatPhoneNumber(Author);
      let delayInMs;
      
      if (formattedAuthor === '+12038324011') {
        // Short delay for special number (1-10 seconds)
        delayInMs = 20000; // 20 seconds delay
      } else {
        // Normal delay for other numbers (1-5 minutes)
        delayInMs = Math.floor(Math.random() * (5 * 60 * 1000 - 1 * 60 * 1000 + 1)) + 1 * 60 * 1000;
      }
      
      setTimeout(() => processDelayedResponse(Author, user.id), delayInMs);
    }
    pendingMessages.get(Author).push(Body);

    // Immediately respond to Twilio
    res.status(200).send('Message received');

  } catch (error) {
    console.error('Error handling incoming message:', error);
    res.status(500).send('Error processing message');
  }
}

async function processDelayedResponse(phoneNumber, userId) {
  console.log(`Processing delayed response for ${phoneNumber}`);
  const messages = pendingMessages.get(phoneNumber);
  const lastMessage = messages[messages.length - 1];
  try {
    pendingMessages.delete(phoneNumber);
    if (messages && messages.length > 0) {
      const responseMessage = await handleUserInput(messages, phoneNumber, userId);
      console.log(responseMessage)
      
      const client = await getClientByPhoneNumber(phoneNumber, userId);
      if (client.id != '') {
        await toggleLastMessageReadStatus(client.id);
        if (responseMessage === "user" || responseMessage === "User") {
          // await sendNotificationToUser(
          //   'New Message from ' + client.firstname,
          //   `${client.firstname} ${client.lastname}: "${lastMessage.substring(0, 50)}${lastMessage.length > 50 ? '...' : ''}"`,
          //   client.id,
          //   client.firstname + ' ' + client.lastname,
          //   lastMessage,
          //   false,
          //   userId
          // );
        }
        else {
          // Save the suggested response
          await saveSuggestedResponse(client.id, responseMessage);
          // await sendNotificationToUser(
          //   client.firstname + ' ' + client.lastname,
          //   responseMessage,
          //   client.id,
          //   client.firstname + ' ' + client.lastname,
          //   lastMessage,
          //   true,
          //   userId
          // );
        }
      } 
      
        else {
          console.log("phoneNumber: ", phoneNumber)
          console.log("responseMessage: ", responseMessage)
          console.log("userId: ", userId)
          await sendMessage(phoneNumber, responseMessage, userId, false, false);
        }
      }
  } catch (error) {
    console.error('Error processing delayed response:', error);
    const client = await getClientByPhoneNumber(phoneNumber, userId);
    // await sendNotificationToUser(
    //   'New Client Message',
    //   `${client.firstname} ${client.lastname}: ${lastMessage}`,
    //   client.id,
    //   client.firstname + ' ' + client.lastname,
    //   lastMessage,
    //   false,
    //   userId
    // );
  }
}

async function sendNotificationToUser(title, body, clientId, clientName, clientMessage, isSuggestedResponse, userId) {

  const pushTokens = await getUserPushTokens(userId);

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

async function getContactPhoneNumberFromConversation(conversationSid) {
  try {
    // Fetch participants in the conversation
    const participants = await client.conversations.v1.conversations(conversationSid).participants.list();
    
    // Find the participant with the proxy_address (Twilio number)
    const proxyParticipant = participants.find(p => p.messagingBinding.proxy_address);
    if (!proxyParticipant) {
      console.log('Proxy participant not found in the conversation');
      return null;
    }
    return proxyParticipant.messagingBinding.proxy_address
  } catch (error) {
    console.error('Error fetching contact phone number:', error);
    return null;
  }
}

module.exports = {
  sendMessage,
  handleIncomingMessage,
  sendMessages,
  sendNotificationToUser,
  formatPhoneNumber,
  getContactPhoneNumberFromConversation
};