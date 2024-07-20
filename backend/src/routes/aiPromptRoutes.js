const express = require('express');
const router = express.Router();
const { setAIPrompt, getAIPromptForClient } = require('../controllers/aiPromptController');

router.post('/set-prompt', setAIPrompt);
router.get('/get-prompt/:clientId', getAIPromptForClient);

module.exports = router;
