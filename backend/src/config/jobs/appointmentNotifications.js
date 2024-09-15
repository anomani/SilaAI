const { getUnpaidAppointmentsByDate, getEndingAppointments } = require('../../model/appointment');
const { sendNotificationToUser } = require('./notifications');

async function checkUnpaidAppointments() {
    try {        
        const today = new Date().toISOString().split('T')[0];
        const unpaidAppointments = await getUnpaidAppointmentsByDate(today);
        if (unpaidAppointments.length > 0) {
            const message = `You have ${unpaidAppointments.length} unpaid appointment(s) for today.`;
            await sendNotificationToUser('Unpaid Appointments', message, process.env.TWILIO_PHONE_NUMBER, 'unpaid_appointments');
        }
        
        console.log('Checked for unpaid appointments and sent notification if necessary');
    } catch (error) {
        console.error('Error checking unpaid appointments:', error);
    }
}

async function checkEndingAppointments() {
    try {
        const now = new Date();
        const adjustedNow = new Date(now);
        adjustedNow.setHours(adjustedNow.getHours() - 4); // Subtract 4 hours
        const endingAppointments = await getEndingAppointments(adjustedNow);
        for (const appointment of endingAppointments) {
            const message = `Appointment ended for ${appointment.firstname} ${appointment.lastname}. Click here to log the appointment`;
            await sendNotificationToUser(
                'Appointment Ended',
                message,
                process.env.TWILIO_PHONE_NUMBER,
                'appointment_ended',
                { clientId: appointment.clientid }
            );
        }
    } catch (error) {
        console.error('Error checking ending appointments:', error);
    }
}

module.exports = {
    checkUnpaidAppointments,
    checkEndingAppointments
};