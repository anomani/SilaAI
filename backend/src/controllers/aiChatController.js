const { 
  createAIChatThread, 
  getAllAIChatThreads, 
  getAIChatThreadById,
  updateAIChatThread,
  deleteAIChatThread
} = require('../model/threads');

const {
  createMessage,
  getThreadMessages,
  deleteThreadMessages
} = require('../model/aiChatMessages');

const { handleUserInputData } = require('../ai/clientData');

async function createThread(req, res) {
  try {
    const { title } = req.body;
    const thread = await createAIChatThread(title, req.user.id);
    res.json(thread);
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getThreads(req, res) {
  try {
    const threads = await getAllAIChatThreads(req.user.id);
    res.json(threads);
  } catch (error) {
    console.error('Error getting threads:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getThread(req, res) {
  try {
    const { threadId } = req.params;
    const thread = await getAIChatThreadById(threadId, req.user.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json(thread);
  } catch (error) {
    console.error('Error getting thread:', error);
    res.status(500).json({ error: error.message });
  }
}

async function updateThread(req, res) {
  try {
    const { threadId } = req.params;
    const { title } = req.body;
    const thread = await updateAIChatThread(threadId, { title }, req.user.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json(thread);
  } catch (error) {
    console.error('Error updating thread:', error);
    res.status(500).json({ error: error.message });
  }
}

async function deleteThread(req, res) {
  try {
    const { threadId } = req.params;
    const result = await deleteAIChatThread(threadId, req.user.id);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Error deleting thread:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getMessages(req, res) {
  try {
    const { threadId } = req.params;
    const messages = await getThreadMessages(threadId, req.user.id);
    res.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: error.message });
  }
}

async function sendMessage(req, res) {
  try {
    const { threadId } = req.params;
    const { message } = req.body;

    // Save user message
    await createMessage(threadId, message, 'user', req.user.id);

    // Get AI response
    const aiResponse = await handleUserInputData(message, req.user.id);

    // Save AI response
    const savedResponse = await createMessage(threadId, aiResponse, 'assistant', req.user.id);

    res.json(savedResponse);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createThread,
  getThreads,
  getThread,
  updateThread,
  deleteThread,
  getMessages,
  sendMessage
}; 