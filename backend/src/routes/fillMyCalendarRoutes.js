const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { 
  getFillMyCalendarData, 
  runFillMyCalendarManually,
  updateClientOutreachMessage 
} = require('../controllers/fillMyCalendarController');

// Get data for Fill My Calendar dashboard
router.get('/data', authenticateToken, getFillMyCalendarData);

// Run Fill My Calendar manually
router.post('/run', authenticateToken, runFillMyCalendarManually);

module.exports = router; 