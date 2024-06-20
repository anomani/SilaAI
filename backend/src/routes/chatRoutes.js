const express = require('express');
const router = express.Router();
const { handleChatRequest, handleUserInputDataController, getMessagesByClientIdController, getAllMessagesGroupedByClient } = require('../controllers/chatController');
const { handleIncomingMessage } = require('../config/twilio');

router.post('/schedule', handleChatRequest);
router.post('/incoming', handleIncomingMessage);
router.post('/handle-user-input', handleUserInputDataController);
router.get('/messages/:clientId', getMessagesByClientIdController);
router.get('/messages', getAllMessagesGroupedByClient);

module.exports = router;
