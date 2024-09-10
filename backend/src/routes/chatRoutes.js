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

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage: storage,
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

router.post('/schedule', handleChatRequest);
router.post('/incoming', handleIncomingMessage);
router.post('/handle-user-input', handleUserInputDataController);
router.get('/messages/:clientId', getMessagesByClientIdController);
router.get('/messages', getAllMessagesGroupedByClientController);
router.post('/send-message', sendMessageController);
router.post('/set-messages-read/:clientId', setMessagesReadController);
router.get('/custom-list', getCustomListController);
router.post('/send-messages-to-selected-clients', sendMessagesToSelectedClients);
router.post('/suggested-response', saveSuggestedResponseController);
router.get('/suggested-response/:clientId', getSuggestedResponseController);
router.delete('/suggested-response/:clientId', clearSuggestedResponseController);
router.get('/metrics', getMessageMetricsController);
router.get('/most-recent-messages', getMostRecentMessagePerClientController);
router.get('/suggested-response-count', getSuggestedResponseCountController);

// Add the new route for audio transcription
router.post('/transcribe-audio', upload.single('audio'), transcribeAudioController);

module.exports = router;