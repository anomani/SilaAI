const { bookAppointment, bookAppointmentInternal } = require('./bookAppointment');

/**
 * Routes appointment booking to either Acuity (for user_id 1) or database-only (for all others)
 * @param {string} date - The appointment date (YYYY-MM-DD)
 * @param {string} startTime - The start time (HH:MM)
 * @param {string} fname - First name
 * @param {string} lname - Last name
 * @param {string} phone - Phone number
 * @param {string} email - Email address
 * @param {string} appointmentType - Type of appointment
 * @param {number} price - Total price
 * @param {Array} addOnArray - Array of add-ons
 * @param {number} userId - User ID to determine booking method
 * @returns {string} - Booking result message
 */
async function routeBookAppointment(date, startTime, fname, lname, phone, email, appointmentType, price, addOnArray, userId) {
    console.log(`Routing appointment booking for user_id: ${userId}`);
    
    if (userId === 1) {
        // Use Acuity booking for user_id 1
        console.log('Using Acuity booking for user_id 1');
        return await bookAppointment(date, startTime, fname, lname, phone, email, appointmentType, price, addOnArray, userId);
    } else {
        // Use database-only booking for all other users
        console.log(`Using database-only booking for user_id ${userId}`);
        return await bookAppointmentInternal(date, startTime, fname, lname, phone, email, appointmentType, price, addOnArray, userId);
    }
}

module.exports = { routeBookAppointment }; 