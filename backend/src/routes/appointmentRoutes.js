const express = require('express');
const router = express.Router();
const { getAppointmentsByDate, createNewAppointment, getAppointmentsByClientId, delAppointment, bookAppointmentWithAcuityController } = require('../controllers/appointmentController');

router.get('/appointments/:date', getAppointmentsByDate);
router.post('/appointments', createNewAppointment);
router.get('/appointments/client/:clientId', getAppointmentsByClientId);
router.delete('/appointments/:appointmentId', delAppointment);
router.post('/appointments/acuity', bookAppointmentWithAcuityController);
module.exports = router;

