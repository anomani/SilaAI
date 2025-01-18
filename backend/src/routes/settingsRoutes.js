const express = require('express');
const router = express.Router();
const { 
  getFillMyCalendar, 
  setFillMyCalendar,
  getNextDayReminders,
  setNextDayReminders 
} = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/fillMyCalendar', authenticateToken, getFillMyCalendar);
router.post('/fillMyCalendar', authenticateToken, setFillMyCalendar);
router.get('/nextDayReminders', authenticateToken, getNextDayReminders);
router.post('/nextDayReminders', authenticateToken, setNextDayReminders);

module.exports = router;
