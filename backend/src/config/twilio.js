const twilio = require('twilio');
require('dotenv').config({ path: '../../.env' });
const { handleUserInput, createThread } = require('../ai/scheduling');
const { saveMessage, toggleLastMessageReadStatus, saveSuggestedResponse, clearSuggestedResponse } = require('../model/messages');
const { createClient, getClientByPhoneNumber, getClientAutoRespond } = require('../model/clients');
const { updateAIResponseStatus } = require('../model/messageStatus');
const { messageQueue } = require('./worker');
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
const messageTimeouts = new Map();
const DEBOUNCE_TIME = 1000; // Wait 1 second for potential follow-up messages

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
  adjustedDate.setHours(adjustedDate.getHours() - 5);
  return adjustedDate.toLocaleString();
}

async function sendMessage(to, body, userId, initialMessage = true, manual = true) {
  const to_formatted = formatPhoneNumber(to);
  const customer = await getClientByPhoneNumber(to, userId);
  const localDate = new Date().toLocaleString();
  const adjustedDate = adjustDate(localDate);
  console.log("adjustedDateOutgoing: ", adjustedDate)
  const user = await getUserById(userId);
  let clientId;
  if (customer.id != '') {
    clientId = customer.id
    console.log("userId: ", userId)
    await saveMessage(user.business_number, to, body, adjustedDate, clientId, true, !manual, userId);
    console.log(initialMessage, manual)
    // Create or get the thread, passing the initialMessage parameter
    const thread = await createThread(to_formatted, initialMessage, userId);
    // Add message to OpenAI thread regardless of whether it's manual or not
    await openai.beta.threads.messages.create(thread.id, {
      role: "assistant",
      content: body,
    });
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
  console.log('=== START: New Incoming Message ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Full Request Body:', JSON.stringify(req.body, null, 2));
  
  const { EventType } = req.body;
  console.log('Event Type:', EventType);
  
  let Author, Body, ConversationSid, business_line;

  if (EventType === 'onConversationAdd') {
    Author = req.body['MessagingBinding.Address'];
    Body = req.body.MessageBody;
    business_line = req.body['MessagingBinding.ProxyAddress'];
    console.log('onConversationAdd Details:', {
      Author,
      Body,
      business_line
    });
  } else if (EventType === 'onMessageAdd') {
    Author = req.body.Author;
    Body = req.body.Body;
    ConversationSid = req.body.ConversationSid;
    console.log('onMessageAdd/Added Details:', {
      Author,
      Body,
      ConversationSid
    });
  } else {
    console.log('Unsupported EventType:', EventType);
    return res.status(400).send('Unsupported EventType');
  }

  try {
    console.log('Processing message from:', Author);
    let business_number;
    if (ConversationSid) {
      business_number = await getContactPhoneNumberFromConversation(ConversationSid);
      console.log('Retrieved business number from conversation:', business_number);
    } else {
      business_number = business_line;
      console.log('Using direct business line:', business_line);
    }
    
    const user = await getUserByBusinessNumber(business_number);
    console.log('Found user:', { userId: user.id, businessNumber: user.business_number });
    
    let client = await getClientByPhoneNumber(Author, user.id);
    console.log('Client lookup result:', {
      clientFound: !!client,
      clientId: client ? client.id : 'none'
    });
    
    let clientId = '';
    const localDate = new Date().toLocaleString();
    const adjustedDate = adjustDate(localDate);
    console.log('Message timestamp:', adjustedDate);

    if (!client || client.id === '') {
      console.log('Creating new client for:', Author);
      clientId = await createClient('', '', Author, '', '', user.id);
      client = await getClientByPhoneNumber(Author, user.id);
      console.log('New client created:', { clientId });
    } else {
      clientId = client.id;
      console.log('Using existing client:', { clientId });
    }

    try {
      console.log('Attempting to save message to database...');
      await saveMessage(Author, user.business_number, Body, adjustedDate, clientId, true, false, user.id);
      console.log('Message saved successfully');
    } catch (saveError) {
      if (saveError.code === '23505') {
        console.log('Duplicate message detected:', {
          error: saveError.code,
          constraint: saveError.constraint
        });
      } else {
        console.error('Error saving message:', saveError);
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
        false,
        user.id
      );
      return res.status(200).send('Message received');
    }

    // Set status to pending immediately
    await updateAIResponseStatus(clientId, 'pending');

    // Clear any existing timeout for this sender
    if (messageTimeouts.has(Author)) {
      clearTimeout(messageTimeouts.get(Author));
    }

    // Add message to pending messages
    if (!pendingMessages.has(Author)) {
      pendingMessages.set(Author, []);
    }
    pendingMessages.get(Author).push(Body);

    // Set new timeout
    const timeoutId = setTimeout(() => processDelayedResponse(Author, user.id), DEBOUNCE_TIME);
    messageTimeouts.set(Author, timeoutId);

    // Immediately respond to Twilio
    res.status(200).send('Message received');

  } catch (error) {
    console.error('=== ERROR: Message Processing Failed ===');
    console.error('Error details:', error);
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
      const client = await getClientByPhoneNumber(phoneNumber, userId);
      
      const responseMessage = await handleUserInput(messages, phoneNumber, userId);
      console.log(responseMessage);
      
      if (client.id != '') {
        await toggleLastMessageReadStatus(client.id);
        if (responseMessage === "user" || responseMessage === "User") {
          // Update status to completed (no AI response needed)
          await updateAIResponseStatus(client.id, 'completed');
          
          await sendNotificationToUser(
            'New Message from ' + client.firstname,
            `${client.firstname} ${client.lastname}: "${lastMessage.substring(0, 50)}${lastMessage.length > 50 ? '...' : ''}"`,
            client.id,
            client.firstname + ' ' + client.lastname,
            lastMessage,
            false,
            userId
          );
        }
        else {
          // Save the suggested response
          await saveSuggestedResponse(client.id, responseMessage, userId);
          await sendNotificationToUser(
            client.firstname + ' ' + client.lastname,
            responseMessage,
            client.id,
            client.firstname + ' ' + client.lastname,
            lastMessage,
            true,
            userId
          );
          await updateAIResponseStatus(client.id, 'completed');
        }
      } else {
        console.log("phoneNumber: ", phoneNumber);
        console.log("responseMessage: ", responseMessage);
        console.log("userId: ", userId);
        await sendMessage(phoneNumber, responseMessage, userId, false, false);
      }
    }
  } catch (error) {
    console.error('Error processing delayed response:', error);
    const client = await getClientByPhoneNumber(phoneNumber, userId);
    
    // Set status to error if anything fails
    if (client && client.id) {
      await updateAIResponseStatus(client.id, 'error');
    }
    
    await sendNotificationToUser(
      'New Client Message',
      `${client.firstname} ${client.lastname}: ${lastMessage}`,
      client.id,
      client.firstname + ' ' + client.lastname,
      lastMessage,
      false,
      userId
    );
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
      await saveSuggestedResponse(clientId, body, userId);
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

async function sendMessageQueued(to, body, userId, initialMessage = true, manual = true) {
  const to_formatted = formatPhoneNumber(to);
  
  // Add message to queue
  const job = await messageQueue.add({
    to: to_formatted,
    body,
    userId,
    initialMessage,
    manual,
    timestamp: new Date().toISOString()
  });

  return job;
}

// Process message queue
messageQueue.process(async (job) => {
  const { to, body, userId, initialMessage, manual } = job.data;
  
  try {
    // Use the existing sendMessage function to maintain consistency
    const result = await sendMessage(to, body, userId, initialMessage, manual);
    return result;
  } catch (error) {
    console.error(`Failed to send message: ${error.message}`);
    throw error;
  }
});

module.exports = {
  sendMessage,
  sendMessageQueued,
  handleIncomingMessage,
  sendMessages,
  sendNotificationToUser,
  formatPhoneNumber,
  getContactPhoneNumberFromConversation
};