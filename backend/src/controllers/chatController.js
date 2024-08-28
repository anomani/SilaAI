const { handleUserInput, handleUserInputInternal } = require('../ai/scheduling');
const {handleUserInputData} = require('../ai/clientData');
const { getMessagesByClientId, getAllMessages, saveMessage, setMessagesRead, getAllMessagesGroupedByClient } = require('../model/messages');
const { sendMessage } = require('../config/twilio');
const { getCustomList } = require('../model/customLists');
const { getClientById } = require('../model/clients');
const { getStoredQuery } = require('../ai/clientData');
const { handleUserInputClaude } = require('../ai/claude-chat');
const messageQueue = new Map();
const { saveSuggestedResponse, getSuggestedResponse, clearSuggestedResponse } = require('../model/messages');
const { getMessageMetrics } = require('../model/messages');
const Queue = require('bull');
const Redis = require('ioredis');
const Bull = require('bull');

const pendingJobs = new Map();
const JOB_TIMEOUT = 300000; // 5 minutes in milliseconds

const handleUserInputDataController = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const jobId = Date.now().toString();
    const job = {
      id: jobId,
      status: 'pending',
      result: null,
      error: null,
    };

    pendingJobs.set(jobId, job);

    // Respond immediately with the job ID
    res.json({ jobId, message: 'Your request is being processed' });

    // Calculate delay (between 5 to 20 seconds)
    const delayInMs = 1;

    // Schedule the job processing
    setTimeout(() => processJob(job, message), delayInMs);

    // Set a timeout to automatically fail the job after JOB_TIMEOUT
    setTimeout(() => {
      if (job.status === 'pending' || job.status === 'processing') {
        job.status = 'failed';
        job.error = 'Job timed out';
      }
    }, JOB_TIMEOUT);

  } catch (error) {
    console.error('Error handling user input data:', error);
    res.status(500).json({ error: 'Error processing request. Please try again later.' });
  }
};

const processJob = async (job, message) => {
  try {
    job.status = 'processing';
    const result = await handleUserInputData(message);
    job.status = 'completed';
    job.result = result;
  } catch (error) {
    console.error('Error processing job:', error);
    job.status = 'failed';
    job.error = error.message || 'An error occurred while processing the request';
  } finally {
    // Clean up the job after a delay (e.g., 5 minutes)
    setTimeout(() => {
      pendingJobs.delete(job.id);
    }, 300000); // 5 minutes
  }
};

const checkJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = pendingJobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId,
      status: job.status,
      result: job.result,
      error: job.error,
    });
  } catch (error) {
    console.error('Error checking job status:', error);
    res.status(500).json({ error: 'Error checking job status. Please try again later.' });
  }
};

const handleChatRequest = async (req, res) => {
  try {
    const { message } = req.body;
    const number = "+12038324011";
    const twilio = "+18446480598";
    
    const responseMessage = await handleUserInputInternal([message], number);

    // Respond to the client with the actual response
    res.json({ message: responseMessage });

  } catch (error) {
    console.error('Error handling chat request:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
};

const getAllMessagesGroupedByClientController = async (req, res) => {
  try {
    const groupedMessages = await getAllMessagesGroupedByClient();
    res.status(200).json(groupedMessages);
  } catch (error) {
    console.error('Error fetching grouped messages:', error);
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
    const { to, message, initialMessage, manual } = req.body;
    await sendMessage(to, message, initialMessage, manual);
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

const savePushTokenController = async (req, res) => {
  try {
    const { phoneNumber, pushToken } = req.body;
    const user = await getUserByPhoneNumber(phoneNumber);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    await savePushToken(user.id, pushToken);
    res.status(200).json({ message: 'Push token saved successfully' });
  } catch (error) {
    console.error('Error saving push token:', error);
    res.status(500).json({ error: 'Error saving push token' });
  }
}

const getCustomListController = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Query ID is required' });
    }
    const query = getStoredQuery(id);
    console.log(query);
    if (!query) {
      return res.status(404).json({ error: 'Query not found' });
    }
    const customList = await getCustomList(query);
    res.json(customList);
  } catch (error) {
    console.error('Error fetching custom list:', error);
    res.status(500).json({ error: 'Error fetching custom list' });
  }
}

const sendMessagesToSelectedClients = async (req, res) => {
  try {
    const { ids, messageTemplate } = req.body;
    for (const id of ids) {
      const client = await getClientById(id);
      if (client) {
        const personalizedMessage = messageTemplate.replace('{firstName}', client.firstname);
        await sendMessage(client.phonenumber, personalizedMessage);
      } else {
        console.log(`Client not found for id: ${id}`);
      }
    }
    res.status(200).json({ message: 'Messages sent successfully' });
  } catch (error) {
    console.error('Error sending messages to selected clients:', error);
    res.status(500).json({ error: 'Error sending messages' });
  }
}

const saveSuggestedResponseController = async (req, res) => {
  try {
    const { clientId, response } = req.body;
    const savedResponse = await saveSuggestedResponse(clientId, response);
    res.status(200).json(savedResponse);
  } catch (error) {
    console.error('Error saving suggested response:', error);
    res.status(500).json({ error: 'Error saving suggested response' });
  }
};

const getSuggestedResponseController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const suggestedResponse = await getSuggestedResponse(clientId);
    res.status(200).json({ suggestedResponse });
  } catch (error) {
    console.error('Error fetching suggested response:', error);
    res.status(500).json({ error: 'Error fetching suggested response' });
  }
};

const clearSuggestedResponseController = async (req, res) => {
  try {
    const { clientId } = req.params;
    await clearSuggestedResponse(clientId);
    res.status(200).json({ message: 'Suggested response cleared' });
  } catch (error) {
    console.error('Error clearing suggested response:', error);
    res.status(500).json({ error: 'Error clearing suggested response' });
  }
};

const getMessageMetricsController = async (req, res) => {
  try {
    const metrics = await getMessageMetrics();
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching message metrics:', error);
    res.status(500).json({ error: 'Error fetching message metrics' });
  }
};

module.exports = { 
  handleChatRequest, 
  handleUserInputDataController, 
  getMessagesByClientIdController, 
  getAllMessagesGroupedByClientController, 
  sendMessageController, 
  setMessagesReadController, 
  getCustomListController, 
  sendMessagesToSelectedClients, 
  saveSuggestedResponseController, 
  getSuggestedResponseController, 
  clearSuggestedResponseController, 
  getMessageMetricsController, 
  checkJobStatus 
};