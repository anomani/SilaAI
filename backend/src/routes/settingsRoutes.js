const express = require('express');
const router = express.Router();
const { getFillMyCalendar, setFillMyCalendar } = require('../controllers/settingsController');

router.get('/fillMyCalendar', getFillMyCalendar);
router.post('/fillMyCalendar', setFillMyCalendar);

module.exports = router;
