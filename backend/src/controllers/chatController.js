const { handleUserInput } = require('../ai/scheduling');
const {handleUserInputData} = require('../ai/clientData');
const { getMessagesByClientId, getAllMessages } = require('../model/messages');
const { sendMessage } = require('../config/twilio');

const handleChatRequest = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Here, we're simulating handling user input and generating a response
    // You might need to adapt the `handleUserInput` function to fit this use case.
    const responseMessage = await handleUserInput(message);
    res.json({ message: responseMessage });
  } catch (error) {
    console.error('Error handling chat request:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
};

const handleUserInputDataController = async (req, res) => {
  try {
    const { message } = req.body;
    console.log(message)
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const responseMessage = await handleUserInputData(message);
    res.json({ message: responseMessage });
  } catch (error) {
    console.error('Error handling user input data:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
};

const getAllMessagesGroupedByClient = async (req, res) => {
  try {
    const messages = await getAllMessages();
    const groupedMessages = messages.reduce((acc, message) => {
      if (!acc[message.clientId]) {
        acc[message.clientId] = [];
      }
      acc[message.clientId].push(message);
      return acc;
    }, {});
    res.status(200).json(groupedMessages);
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Error fetching messages' });
  }
};

const getMessagesByClientIdController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const messages = await getMessagesByClientId(clientId);
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages by clientId:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
};

const sendMessageController = async (req, res) => {
  try {
    const { to, message } = req.body;
    await sendMessage(to, message);
    res.status(200).json({ message: 'Message sent' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Error sending message' });
  }
}

module.exports = { handleChatRequest, handleUserInputDataController, getMessagesByClientIdController, getAllMessagesGroupedByClient, sendMessageController };
