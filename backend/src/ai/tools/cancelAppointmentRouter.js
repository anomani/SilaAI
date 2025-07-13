const { cancelAppointment, cancelAppointmentInternal } = require('./cancelAppointment');

/**
 * Routes appointment cancellation to either Acuity (for user_id 1) or database-only (for all others)
 * @param {string} phoneNumber - Phone number of the client
 * @param {string} date - Date of the appointment to cancel
 * @param {number} userId - User ID to determine cancellation method
 * @returns {string|Object} - Cancellation result message or appointment object
 */
async function routeCancelAppointment(phoneNumber, date, userId) {
    console.log(`Routing appointment cancellation for user_id: ${userId}`);
    
    if (userId === 1) {
        // Use Acuity cancellation for user_id 1
        console.log('Using Acuity cancellation for user_id 1');
        return await cancelAppointment(phoneNumber, date, userId);
    } else {
        // Use database-only cancellation for all other users
        console.log(`Using database-only cancellation for user_id ${userId}`);
        return await cancelAppointmentInternal(phoneNumber, date, userId);
    }
}

module.exports = { routeCancelAppointment }; 