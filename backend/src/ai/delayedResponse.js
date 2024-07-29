const { handleUserInput } = require('./scheduling');
const { sendMessage } = require('../config/twilio');

const messageQueue = new Map();
const DELAY_TIME = 120000; // 2 minutes in milliseconds

function handleDelayedResponse(phoneNumber, message, clientId) {
  if (messageQueue.has(phoneNumber)) {
    // If there's already a queued message, clear the existing timeout
    clearTimeout(messageQueue.get(phoneNumber).timeout);
    
    // Concatenate the new message with the existing one
    const existingMessage = messageQueue.get(phoneNumber).message;
    message = `${existingMessage}\n${message}`;
  }

  // Set a new timeout
  const timeout = setTimeout(() => processQueuedMessage(phoneNumber, clientId), DELAY_TIME);

  // Store the new message and timeout in the queue
  messageQueue.set(phoneNumber, { message, timeout });
}

async function processQueuedMessage(phoneNumber, clientId) {
  if (messageQueue.has(phoneNumber)) {
    const { message } = messageQueue.get(phoneNumber);
    messageQueue.delete(phoneNumber);

    try {
      const responseMessage = await handleUserInput(message, phoneNumber);
      if (responseMessage === "user" || responseMessage === "User") {
        await toggleLastMessageReadStatus(clientId);
        // await sendNotificationToUser(client.firstname, message, clientId);
      } else {
        await sendMessage(phoneNumber, responseMessage, false);
      }
    } catch (error) {
      console.error('Error processing queued message:', error);
      // You might want to add some error handling here, such as notifying the user
    }
  }
}

module.exports = { handleDelayedResponse };