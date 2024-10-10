const express = require('express');
const router = express.Router();
const { getFillMyCalendar, setFillMyCalendar } = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/authMiddleware');


router.get('/fillMyCalendar', authenticateToken, getFillMyCalendar);
router.post('/fillMyCalendar', authenticateToken, setFillMyCalendar);

module.exports = router;
