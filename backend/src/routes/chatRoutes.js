const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { handleChatRequest, handleUserInputDataController, getMessagesByClientIdController, getAllMessagesGroupedByClientController, sendMessageController, setMessagesReadController, getCustomListController, sendMessagesToSelectedClients } = require('../controllers/chatController');
const { handleIncomingMessage } = require('../config/twilio');
const {
  saveSuggestedResponseController,
  getSuggestedResponseController,
  clearSuggestedResponseController
} = require('../controllers/chatController');
const { getMessageMetricsController } = require('../controllers/chatController');
const { getMostRecentMessagePerClientController } = require('../controllers/chatController');
const { getSuggestedResponseCountController } = require('../controllers/chatController');
const { transcribeAudioController } = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { handleUserInputData, getStoredQuery } = require('../ai/clientData');
// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    console.log('Uploaded file:', file);
    const filetypes = /wav|mp3|m4a|ogg/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Error: File upload only supports the following filetypes - " + filetypes));
  }
});

router.post('/schedule', authenticateToken, handleChatRequest);
router.post('/incoming', handleIncomingMessage);

router.post('/handle-user-input', authenticateToken, handleUserInputDataController);
router.get('/messages/:clientId', getMessagesByClientIdController);
router.get('/messages', authenticateToken, getAllMessagesGroupedByClientController);
router.post('/send-message', authenticateToken, sendMessageController);
router.post('/set-messages-read/:clientId', authenticateToken, setMessagesReadController);
router.get('/custom-list', authenticateToken, getCustomListController);
router.post('/send-messages-to-selected-clients', authenticateToken, sendMessagesToSelectedClients);
router.post('/suggested-response', authenticateToken, saveSuggestedResponseController);
router.get('/suggested-response/:clientId', authenticateToken, getSuggestedResponseController);
router.delete('/suggested-response/:clientId', authenticateToken, clearSuggestedResponseController);
router.get('/metrics', authenticateToken, getMessageMetricsController);
router.get('/most-recent-messages', authenticateToken, getMostRecentMessagePerClientController);
router.get('/suggested-response-count', authenticateToken, getSuggestedResponseCountController);

// Add the new route for audio transcription
router.post('/transcribe-audio', upload.single('audio'), transcribeAudioController);

// Create a new thread
router.post('/new-thread', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Get userId from the authenticated user
    console.log("userId", userId);
    const thread = await handleUserInputData('', userId, true); // Pass true for initialMessage
    res.json({ success: true, thread });
  } catch (error) {
    console.error('Error creating new thread:', error);
    res.status(500).json({ error: 'Failed to create new thread' });
  }
});

module.exports = router;