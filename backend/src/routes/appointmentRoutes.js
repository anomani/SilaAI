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
    getAppointmentTypesForUserNoAuth,
    createAppointmentTypeController,
    deleteAppointmentTypeController
} = require('../controllers/appointmentController');

// Apply authenticateToken middleware to all routes that need it
router.get('/appointments/appointment-types', authenticateToken, getAppointmentTypesForUser);
router.post('/appointments/appointment-types', authenticateToken, createAppointmentTypeController);
router.put('/appointments/appointment-types/:appointmentTypeId', authenticateToken, updateAppointmentTypeController);
router.delete('/appointments/appointment-types/:appointmentTypeId', authenticateToken, deleteAppointmentTypeController);
router.get('/compatible-addons', authenticateToken, getCompatibleAddOnsController);


router.get('/:date', authenticateToken, getAppointmentsByDate);
router.post('/newAppointment', authenticateToken, createNewAppointment);
router.get('/client/:clientId', authenticateToken, getAppointmentsByClientId);
router.delete('/:appointmentId', authenticateToken, delAppointment);
router.post('/acuity', authenticateToken, bookAppointmentWithAcuityController);
router.post('/blocked-time', authenticateToken, createBlockedTimeController);
router.get('/client/:clientId/around-current/:currentAppointmentId', authenticateToken, getClientAppointmentsAroundCurrentController);
router.put('/:appointmentId/payment', authenticateToken, updateAppointmentPaymentController);
router.put('/:appointmentId/reschedule', authenticateToken, rescheduleAppointmentController);
router.get('/metrics', authenticateToken, getAppointmentMetricsController);
router.put('/:appointmentId', authenticateToken, updateAppointmentDetailsController);


//THESE DO NOT REQUIRE AUTHENTICATION
router.post('/confirm', confirmAppointment);

// Update the /availabilities route to use appointmentTypeId
router.get('/availabilities', getAvailabilities);

// Add these new routes
router.get('/appointment-types/:appointmentTypeId', getAppointmentTypeById);
router.get('/appointment-details/:appointmentTypeId', getAppointmentDetails);
router.get('/appointment-types', getAppointmentTypesForUserNoAuth);



module.exports = router;
