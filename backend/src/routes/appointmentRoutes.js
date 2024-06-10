const express = require('express');
const router = express.Router();
const { getAppointmentsByDate, createNewAppointment, getAppointmentsByClientId, delAppointment } = require('../controllers/appointmentController');

router.get('/appointments/:date', getAppointmentsByDate);
router.post('/appointments', createNewAppointment);
router.get('/appointments/client/:clientId', getAppointmentsByClientId);
router.delete('/appointments/:appointmentId', delAppointment);

module.exports = router;

