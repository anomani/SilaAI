const { getUnpaidAppointmentsByDate, getEndingAppointments } = require('../../model/appointment');
const { sendNotificationToUser } = require('./notifications');
const { getUserById } = require('../../model/users');
async function checkUnpaidAppointments(userId) {
    try {        
        const today = new Date().toISOString().split('T')[0];
        const unpaidAppointments = await getUnpaidAppointmentsByDate(today, userId);
        if (unpaidAppointments.length > 0) {
            const message = `You have ${unpaidAppointments.length} unpaid appointment(s) for today.`;
            await sendNotificationToUser('Unpaid Appointments', message, userId, 'unpaid_appointments');
        }
        
        console.log(`Checked for unpaid appointments for user ${userId} and sent notification if necessary`);
    } catch (error) {
        console.error(`Error checking unpaid appointments for user ${userId}:`, error);
    }
}

async function checkEndingAppointments(userId) {
    try {
        const now = new Date();
        const adjustedNow = new Date(now);
        adjustedNow.setHours(adjustedNow.getHours() - 5); // Subtract 4 hours
        const endingAppointments = await getEndingAppointments(adjustedNow, userId);
        for (const appointment of endingAppointments) {
            const message = `Appointment ended for ${appointment.firstname} ${appointment.lastname}. Click here to log the appointment`;
            await sendNotificationToUser(
                'Appointment Ended',
                message,
                userId,
                'appointment_ended',
                { clientId: appointment.clientid }
            );
        }
    } catch (error) {
        console.error(`Error checking ending appointments for user ${userId}:`, error);
    }
}

module.exports = {
    checkUnpaidAppointments,
    checkEndingAppointments
};