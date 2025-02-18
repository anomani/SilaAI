const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  createAIChatThread,
  getAIChatThreads,
  getAIChatThread,
  updateAIChatThreadTitle,
  deleteAIChatThread,
  getThreadMessages
} = require('../model/threads');

// Create a new chat thread
router.post('/threads', authenticateToken, async (req, res) => {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Create a thread in OpenAI
    const thread = await openai.beta.threads.create();
    
    // Save the thread in our database
    const savedThread = await createAIChatThread(
      req.body.title,
      thread.id,
      req.user.id
    );
    
    res.json(savedThread);
  } catch (error) {
    console.error('Error creating chat thread:', error);
    res.status(500).json({ error: 'Failed to create chat thread' });
  }
});

// Get all chat threads for the user
router.get('/threads', authenticateToken, async (req, res) => {
  try {
    const threads = await getAIChatThreads(req.user.id);
    res.json(threads);
  } catch (error) {
    console.error('Error fetching chat threads:', error);
    res.status(500).json({ error: 'Failed to fetch chat threads' });
  }
});

// Get a specific thread and its messages
router.get('/threads/:id', authenticateToken, async (req, res) => {
  try {
    const thread = await getAIChatThread(req.params.id, req.user.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    console.log(thread)
    const messages = await getThreadMessages(thread.thread_id);
    res.json({ ...thread, messages });
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// Update thread title
router.put('/threads/:id', authenticateToken, async (req, res) => {
  try {
    const updatedThread = await updateAIChatThreadTitle(
      req.params.id,
      req.body.title,
      req.user.id
    );
    if (!updatedThread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json(updatedThread);
  } catch (error) {
    console.error('Error updating thread:', error);
    res.status(500).json({ error: 'Failed to update thread' });
  }
});

// Delete a thread
router.delete('/threads/:id', authenticateToken, async (req, res) => {
  try {
    const thread = await getAIChatThread(req.params.id, req.user.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Delete from OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    await openai.beta.threads.del(thread.thread_id);
    
    // Delete from our database
    await deleteAIChatThread(req.params.id, req.user.id);
    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Error deleting thread:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

module.exports = router; 