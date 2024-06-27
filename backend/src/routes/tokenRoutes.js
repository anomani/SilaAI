const express = require('express');
const router = express.Router();
const { savePushTokenController } = require('../controllers/tokenController');

router.post('/save-push-token', savePushTokenController);

module.exports = router;