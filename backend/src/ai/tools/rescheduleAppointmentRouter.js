const { rescheduleAppointmentByPhoneAndDate, rescheduleAppointmentByPhoneAndDateInternal } = require('./rescheduleAppointment');

/**
 * Routes appointment rescheduling to either Acuity (for user_id 1) or database-only (for all others)
 * @param {string} phoneNumber - Phone number of the client
 * @param {string} currentDate - Current date of the appointment
 * @param {string} newDate - New date for the appointment
 * @param {string} newStartTime - New start time for the appointment
 * @param {number} userId - User ID to determine rescheduling method
 * @returns {string} - Rescheduling result message
 */
async function routeRescheduleAppointment(phoneNumber, currentDate, newDate, newStartTime, userId) {
    console.log(`Routing appointment rescheduling for user_id: ${userId}`);
    
    if (userId === 1) {
        // Use Acuity rescheduling for user_id 1
        console.log('Using Acuity rescheduling for user_id 1');
        return await rescheduleAppointmentByPhoneAndDate(phoneNumber, currentDate, newDate, newStartTime, userId);
    } else {
        // Use database-only rescheduling for all other users
        console.log(`Using database-only rescheduling for user_id ${userId}`);
        return await rescheduleAppointmentByPhoneAndDateInternal(phoneNumber, currentDate, newDate, newStartTime, userId);
    }
}

module.exports = { routeRescheduleAppointment }; 