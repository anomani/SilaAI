const express = require('express');
const router = express.Router();
const { sendFollowUpMessages, fetchClients } = require('../controllers/followupController');

router.get('/send-followups', sendFollowUpMessages);
router.get('/clients', fetchClients);  

module.exports = router;
