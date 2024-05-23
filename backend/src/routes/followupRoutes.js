const express = require('express');
const router = express.Router();
const { sendFollowUpMessages } = require('../controllers/followupController');

router.get('/send-followups', sendFollowUpMessages);

module.exports = router;
