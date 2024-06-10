const express = require('express');
const router = express.Router();
const { handleChatRequest, handleUserInputDataController } = require('../controllers/chatController');
const { handleIncomingMessage } = require('../config/twilio');

router.post('/schedule', handleChatRequest);
router.post('/incoming', handleIncomingMessage);
router.post('/handle-user-input', handleUserInputDataController);

module.exports = router;

