const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { 
    getAppointmentsByDate, 
    createNewAppointment, 
    getAppointmentsByClientId, 
    delAppointment, 
    bookAppointmentWithAcuityController, 
    createBlockedTimeController, 
    getClientAppointmentsAroundCurrentController,
    updateAppointmentPaymentController,
    rescheduleAppointmentController,
    getAppointmentMetricsController,
    updateAppointmentDetailsController,
    getAvailabilities,
    getCompatibleAddOnsController,
    getAppointmentTypeById,
    getAppointmentDetails,
    confirmAppointment,
    getAppointmentTypesForUser,
    updateAppointmentTypeController,
    getAppointmentTypesForUserNoAuth
} = require('../controllers/appointmentController');

// Apply authenticateToken middleware to all routes that need it
router.get('/appointments/appointment-types', authenticateToken, getAppointmentTypesForUser);
router.put('/appointments/appointment-types/:appointmentTypeId', authenticateToken, updateAppointmentTypeController);
router.get('/compatible-addons', authenticateToken, getCompatibleAddOnsController);


router.get('/appointments/:date', authenticateToken, getAppointmentsByDate);
router.post('/appointments', authenticateToken, createNewAppointment);
router.get('/appointments/client/:clientId', authenticateToken, getAppointmentsByClientId);
router.delete('/appointments/:appointmentId', authenticateToken, delAppointment);
router.post('/appointments/acuity', authenticateToken, bookAppointmentWithAcuityController);
router.post('/appointments/blocked-time', authenticateToken, createBlockedTimeController);
router.get('/appointments/client/:clientId/around-current/:currentAppointmentId', authenticateToken, getClientAppointmentsAroundCurrentController);
router.put('/appointments/:appointmentId/payment', authenticateToken, updateAppointmentPaymentController);
router.put('/appointments/:appointmentId/reschedule', authenticateToken, rescheduleAppointmentController);
router.get('/metrics', authenticateToken, getAppointmentMetricsController);
router.put('/appointments/:appointmentId', authenticateToken, updateAppointmentDetailsController);


//THESE DO NOT REQUIRE AUTHENTICATION
router.post('/appointments/confirm', confirmAppointment);

// Update the /availabilities route to use appointmentTypeId
router.get('/availabilities', getAvailabilities);

// Add these new routes
router.get('/appointment-types/:appointmentTypeId', getAppointmentTypeById);
router.get('/appointment-details/:appointmentTypeId', getAppointmentDetails);
router.get('/appointment-types', getAppointmentTypesForUserNoAuth);



module.exports = router;
