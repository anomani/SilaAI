const { getUnpaidAppointmentsByDate, getEndingAppointments, getAppointmentsByDay } = require('../../model/appointment');
const { sendNotificationToUser } = require('./notifications');
const { getUserById } = require('../../model/users');
const { sendMessage } = require('../twilio');
const { getClientById } = require('../../model/clients');

// Helper function to convert 24-hour time to AM/PM format
function convertTo12Hour(time24) {
    const [hours, minutes] = time24.split(':');
    let period = 'AM';
    let hours12 = parseInt(hours);
    
    if (hours12 >= 12) {
        period = 'PM';
        if (hours12 > 12) {
            hours12 -= 12;
        }
    }
    if (hours12 === 0) {
        hours12 = 12;
    }
    
    return `${hours12}:${minutes} ${period}`;
}

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

async function sendNextDayAppointmentReminders(userId) {
    try {
        // Get tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Get all appointments for tomorrow
        const appointments = await getAppointmentsByDay(userId, tomorrowStr);

        // Send reminder for each appointment
        for (const appointment of appointments) {
            // Get client details using clientId
            const client = await getClientById(appointment.clientid);

            if (client && client.phonenumber) {
                // Convert the time to 12-hour format
                const formattedTime = convertTo12Hour(appointment.starttime);
                const message = `Hi ${client.firstname}! This is a reminder that you have an appointment tomorrow at ${formattedTime}. Would you like to make any changes or reschedule? Feel free to let me know if you need to make any adjustments.`;
                console.log("message: ", message)
                await sendMessage(
                    client.phonenumber,
                    message,
                    userId,
                    true,  // initialMessage
                    true   // manual
                );
            }
        }
        
        console.log(`Sent appointment reminder SMS messages for user ${userId} for date ${tomorrowStr}`);
    } catch (error) {
        console.error(`Error sending appointment reminder SMS messages for user ${userId}:`, error);
    }
}

// async function main() {
//     await sendNextDayAppointmentReminders(1);
// }
// main();
module.exports = {
    checkUnpaidAppointments,
    checkEndingAppointments,
    sendNextDayAppointmentReminders,
    convertTo12Hour  // Export for testing
};