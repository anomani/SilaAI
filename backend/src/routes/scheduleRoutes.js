// backend/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const { handleChat } = require('../controllers/scheduleController');

router.post('/schedule', handleChat);

module.exports = router;
