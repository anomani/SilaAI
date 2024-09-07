const cron = require('node-cron');
const { getUnpaidAppointmentsByDate, getEndingAppointments } = require('../model/appointment');
const { getUserByPhoneNumber } = require('../model/users');
const { getUserPushTokens } = require('../model/pushToken');
const { Expo } = require('expo-server-sdk');

// Initialize the Expo SDK
let expo = new Expo();

function initializeCronJobs() {
    // Cron job for unpaid appointments notification, runs daily at 8:00 PM
    cron.schedule('0 20 * * *', async () => {
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
        console.log('Cron job completed at:', new Date().toISOString());
    });

    // Cron job for appointment end notifications, runs every minute
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const adjustedNow = new Date(now);
            adjustedNow.setHours(adjustedNow.getHours() - 4); // Subtract 4 hours
            console.log('Checking for ending appointments at:', adjustedNow);
            const endingAppointments = await getEndingAppointments(adjustedNow);
            console.log('Found', endingAppointments.length, 'ending appointments');
            for (const appointment of endingAppointments) {
                const message = `Appointment ended for ${appointment.firstname} ${appointment.lastname}. Click here to log the appointment`;
                await sendNotificationToUser(
                    'Appointment Ended',
                    message,
                    process.env.TWILIO_PHONE_NUMBER, // Assuming you have this set in your environment variables
                    'appointment_ended',
                    { clientId: appointment.clientid }
                );
            }
            console.log('Checked for ending appointments and sent notifications to barber if necessary');
        } catch (error) {
            console.error('Error checking ending appointments:', error);
        }
    });
}

async function sendNotificationToUser(title, body, recipientPhoneNumber, notificationType, data = {}) {
    const user = await getUserByPhoneNumber(recipientPhoneNumber);

    if (!user) {
        console.log('No user found with the given phone number');
        return;
    }

    const pushTokens = await getUserPushTokens(user.id);

    if (!pushTokens) {
        console.log('No push token found for the user');
        return;
    }
    // for (const token of pushTokens) {
        const notification = {
            to: ExponentPushToken[rswz3mF3E2725DCf4tUSAU],
            sound: 'default',
            title: title,
            body: body,
        data: { ...data, notificationType: notificationType },
    };

    try {
        console.log('Sending notification:', notification);
        let ticketChunk = await expo.sendPushNotificationsAsync([notification]);
        console.log('Notification result:', ticketChunk);
    } catch (error) {
            console.error('Error sending push notification:', error);
        }
    // }
}

module.exports = {
    initializeCronJobs
};