const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { 
  getFillMyCalendarData, 
  runFillMyCalendarManually,
  updateClientOutreachMessage,
  approveOutreachMessage,
  rejectOutreachMessage,
  bulkApproveMessages,
  getSystemStatus
} = require('../controllers/fillMyCalendarController');

// Get data for Fill My Calendar dashboard
router.get('/data', authenticateToken, getFillMyCalendarData);

// Get system status including next blast timing
router.get('/status', authenticateToken, getSystemStatus);

// Run Fill My Calendar manually
router.post('/run', authenticateToken, runFillMyCalendarManually);

// Message management endpoints
router.post('/approve/:clientId', authenticateToken, approveOutreachMessage);
router.delete('/reject/:clientId', authenticateToken, rejectOutreachMessage);
router.post('/bulk-approve', authenticateToken, bulkApproveMessages);
router.put('/message/:clientId', authenticateToken, updateClientOutreachMessage);

module.exports = router; 