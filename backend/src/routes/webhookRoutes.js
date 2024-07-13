const express = require('express');
const router = express.Router();
const appointmentModel = require('../model/appointment');
const { handleWebhook } = require('../controllers/webhookController');

// router.post('/appointment', handleWebhook);

module.exports = router;