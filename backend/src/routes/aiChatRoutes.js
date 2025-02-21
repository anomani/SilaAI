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
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'User not authenticated',
        status: 'error'
      });
    }

    const threads = await getAIChatThreads(req.user.id);
    
    // Always return an array, even if empty
    res.json(threads || []);
  } catch (error) {
    console.error('Error fetching chat threads:', error);
    // Return empty array on error instead of error response
    res.json([]);
  }
});

// Get a specific thread and its messages
router.get('/threads/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'User not authenticated',
        status: 'error'
      });
    }

    const thread = await getAIChatThread(req.params.id, req.user.id);
    if (!thread) {
      return res.json({
        id: req.params.id,
        messages: { messages: [] },
        status: 'not_found'
      });
    }

    try {
      const messages = await getThreadMessages(thread.thread_id);
      res.json({
        ...thread,
        messages,
        status: 'success'
      });
    } catch (messageError) {
      console.error('Error fetching thread messages:', messageError);
      // Return thread with empty messages array
      res.json({
        ...thread,
        messages: { messages: [] },
        status: 'partial'
      });
    }
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.json({
      id: req.params.id,
      messages: { messages: [] },
      status: 'error'
    });
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