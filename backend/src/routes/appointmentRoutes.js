const express = require('express');
const router = express.Router();
const { 
    getAppointmentsByDate, 
    createNewAppointment, 
    getAppointmentsByClientId, 
    delAppointment, 
    bookAppointmentWithAcuityController, 
    createBlockedTimeController, 
    getClientAppointmentsAroundCurrentController,
    updateAppointmentPaymentController
} = require('../controllers/appointmentController');

router.get('/appointments/:date', getAppointmentsByDate);
router.post('/appointments', createNewAppointment);
router.get('/appointments/client/:clientId', getAppointmentsByClientId);
router.delete('/appointments/:appointmentId', delAppointment);
router.post('/appointments/acuity', bookAppointmentWithAcuityController);
router.post('/appointments/blocked-time', createBlockedTimeController);
router.get('/appointments/client/:clientId/around-current/:currentAppointmentId', getClientAppointmentsAroundCurrentController);
router.put('/appointments/:appointmentId/payment', updateAppointmentPaymentController);

module.exports = router;