const { handleUserInput } = require('./scheduling');
const { toggleLastMessageReadStatus } = require('../model/messages');

const messageQueue = new Map();
const DELAY_TIME = 120000; // 2 minutes in milliseconds

function createDelayedResponseHandler(sendMessageFunc) {
  return function handleDelayedResponse(phoneNumber, message, clientId) {
    if (messageQueue.has(phoneNumber)) {
      // If there's already a queued message, clear the existing timeout
      clearTimeout(messageQueue.get(phoneNumber).timeout);
      
      // Concatenate the new message with the existing one
      const existingMessage = messageQueue.get(phoneNumber).message;
      message = `${existingMessage}\n${message}`;
    }

    // Set a new timeout
    const timeout = setTimeout(() => processQueuedMessage(phoneNumber, clientId, sendMessageFunc), DELAY_TIME);

    // Store the new message and timeout in the queue
    messageQueue.set(phoneNumber, { message, timeout });
  };
}

async function processQueuedMessage(phoneNumber, clientId, sendMessageFunc) {
  if (messageQueue.has(phoneNumber)) {
    const { message } = messageQueue.get(phoneNumber);
    messageQueue.delete(phoneNumber);

    try {
      const responseMessage = await handleUserInput(message, phoneNumber);
      if (responseMessage === "user" || responseMessage === "User") {
        await toggleLastMessageReadStatus(clientId);
        // You might want to handle user notification here
      } else {
        await sendMessageFunc(phoneNumber, responseMessage, false);
      }
    } catch (error) {
      console.error('Error processing queued message:', error);
      // You might want to add some error handling here, such as notifying the user
    }
  }
}

module.exports = { createDelayedResponseHandler };