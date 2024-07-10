const express = require('express');
const router = express.Router();
const { handleChatRequest, handleUserInputDataController, getMessagesByClientIdController, getAllMessagesGroupedByClient, sendMessageController, setMessagesReadController, getCustomListController, sendMessagesToSelectedClients, checkJobStatusController, startMuslimClientsJobController } = require('../controllers/chatController');
const { handleIncomingMessage } = require('../config/twilio');

router.post('/schedule', handleChatRequest);
router.post('/incoming', handleIncomingMessage);
router.post('/handle-user-input', handleUserInputDataController);
router.get('/messages/:clientId', getMessagesByClientIdController);
router.get('/messages', getAllMessagesGroupedByClient);
router.post('/send-message', sendMessageController);
router.post('/set-messages-read/:clientId', setMessagesReadController);
router.get('/custom-list', getCustomListController);
router.post('/send-messages-to-selected-clients', sendMessagesToSelectedClients);
router.get('/job-status/:jobId', checkJobStatusController);
router.post('/start-muslim-clients-job', startMuslimClientsJobController);

module.exports = router;
