const { handleUserInput } = require('../ai/scheduling');
const {handleUserInputData} = require('../ai/clientData');
const { getMessagesByClientId, getAllMessages, saveMessage,setMessagesRead } = require('../model/messages');
const { sendMessage } = require('../config/twilio');

const handleChatRequest = async (req, res) => {
  try {
    const { message } = req.body;
    const number = "+12038324011";
    const twilio = "+18446480598";
    const localDate = new Date().toLocaleString();
    await saveMessage(number, twilio, message, localDate, 3367);

    const responseMessage = await handleUserInput(message, number);
    await saveMessage(twilio, number, responseMessage, localDate, 3367);
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
      if (!acc[message.clientid]) {
        acc[message.clientid] = [];
      }
      acc[message.clientid].push(message);
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
    console.log(clientId)
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

const setMessagesReadController = async (req, res) => {
  try {
    const { clientId } = req.params;
    await setMessagesRead(clientId);
    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error setting messages as read:', error);
    res.status(500).json({ error: 'Error setting messages as read' });
  }
}

module.exports = { handleChatRequest, handleUserInputDataController, getMessagesByClientIdController, getAllMessagesGroupedByClient, sendMessageController, setMessagesReadController };
