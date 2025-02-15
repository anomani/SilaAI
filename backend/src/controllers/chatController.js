const { handleUserInput, handleUserInputInternal } = require('../ai/scheduling');
const {handleUserInputData} = require('../ai/clientData');
const { getMessagesByClientId, getAllMessages, saveMessage, setMessagesRead, getAllMessagesGroupedByClient } = require('../model/messages');
const { sendMessage } = require('../config/twilio');
const { getCustomList } = require('../model/customLists');
const { getClientById } = require('../model/clients');
const { getStoredQuery } = require('../ai/clientData');
const { handleUserInputClaude } = require('../ai/claude-chat');
const { openaiQueue } = require('../config/worker');
const messageQueue = new Map();
const { saveSuggestedResponse, getSuggestedResponse, clearSuggestedResponse } = require('../model/messages');
const { getMessageMetrics } = require('../model/messages');
const { getMostRecentMessagePerClient } = require('../model/messages');
const { countSuggestedResponses } = require('../model/messages');
const { handleAudioTranscription } = require('../ai/whisper');

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

const handleUserInputDataController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, initialMessage = false } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Add job to queue
    const job = await openaiQueue.add({
      message,
      userId,
      initialMessage,
      timestamp: new Date().toISOString()
    });

    // Return job ID immediately
    res.json({
      jobId: job.id,
      status: 'queued',
      message: 'Your request is being processed'
    });

  } catch (error) {
    console.error('Error handling user input data:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
};

const checkJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await openaiQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job._progress;
    const result = job.returnvalue;
    const error = job.failedReason;

    res.json({
      jobId: job.id,
      status: state,
      progress,
      result: result || null,
      error: error || null
    });
  } catch (error) {
    console.error('Error checking job status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllMessagesGroupedByClientController = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(userId)
    const groupedMessages = await getAllMessagesGroupedByClient(userId);
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
    const userId = req.user.id;
    const { to, message, initialMessage, manual } = req.body;
    await sendMessage(to, message, userId, initialMessage, manual);
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
    const userId = req.user.id;
    const { ids, messageTemplate } = req.body;
    for (const id of ids) {
      const client = await getClientById(id);
      if (client) {
        const personalizedMessage = messageTemplate.replace('{firstName}', client.firstname);
        await sendMessage(client.phonenumber, personalizedMessage, userId);
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
    const userId = req.user.id;
    const metrics = await getMessageMetrics(userId);
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching message metrics:', error);
    res.status(500).json({ error: 'Error fetching message metrics' });
  }
};

const getMostRecentMessagePerClientController = async (req, res) => {
  try {
    const userId = req.user.id;
    const recentMessages = await getMostRecentMessagePerClient(userId);
    res.status(200).json(recentMessages);
  } catch (error) {
    console.error('Error fetching most recent messages per client:', error);
    res.status(500).json({ error: 'Error fetching most recent messages' });
  }
};

const getSuggestedResponseCountController = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await countSuggestedResponses(userId);
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error fetching suggested response count:', error);
    res.status(500).json({ error: 'Error fetching suggested response count' });
  }
};

// Update the transcribeAudioController function
const transcribeAudioController = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      throw new Error('No audio file uploaded');
    }
    console.log('File received:', req.file);  // Add this line for debugging
    const transcription = await handleAudioTranscription(req.file.buffer, req.file.originalname);
    res.json({ transcription });
  } catch (error) {
    console.error('Error in transcribeAudioController:', error);
    res.status(500).json({ error: error.message || 'Error transcribing audio' });
  }
};

module.exports = { 
  handleChatRequest, 
  handleUserInputDataController,
  checkJobStatus,
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
  getMostRecentMessagePerClientController, 
  getSuggestedResponseCountController, 
  transcribeAudioController 
};