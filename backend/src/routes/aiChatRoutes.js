const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  createThread,
  getThreads,
  getThread,
  updateThread,
  deleteThread,
  getMessages,
  sendMessage
} = require('../controllers/aiChatController');

// Apply authentication middleware to all routes
// Thread routes
router.post('/threads', authenticateToken, createThread);
router.get('/threads', authenticateToken, getThreads);
router.get('/threads/:threadId', authenticateToken, getThread);
router.put('/threads/:threadId', authenticateToken, updateThread);
router.delete('/threads/:threadId', authenticateToken, deleteThread);

// Message routes
router.get('/threads/:threadId/messages', authenticateToken, getMessages);
router.post('/threads/:threadId/messages', authenticateToken, sendMessage);

module.exports = router; 