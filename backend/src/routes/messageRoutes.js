const express = require('express');
const router = express.Router();
const { getAIResponseStatus } = require('../model/messageStatus');

// Get AI response status for a client
router.get('/ai-status/:clientId', async (req, res) => {
  try {
    const status = await getAIResponseStatus(req.params.clientId);
    res.json(status || { status: null });
  } catch (error) {
    console.error('Error getting AI response status:', error);
    res.status(500).json({ error: 'Failed to get AI response status' });
  }
});

module.exports = router;
