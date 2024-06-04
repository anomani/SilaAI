const express = require('express');
const router = express.Router();
const { getAppointmentsByDate, createNewAppointment } = require('../controllers/appointmentController');

router.get('/appointments/:date', getAppointmentsByDate);
router.post('/appointments', createNewAppointment);

module.exports = router;