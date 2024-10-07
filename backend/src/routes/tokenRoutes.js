const express = require('express');
const router = express.Router();
const { savePushTokenController } = require('../controllers/tokenController');
const { authenticateToken } = require('../middleware/auth');

router.post('/save-push-token', authenticateToken, savePushTokenController);

module.exports = router;