const cron = require('node-cron');
const dbUtils = require('../model/dbUtils');
const { ObjectId } = require('mongodb');
const { getUnpaidAppointmentsByDate, getAppointmentsByDate } = require('../model/appointment');
const { sendNotificationToUser } = require('./twilio');
const { getUserByPhoneNumber } = require('../model/users');
const { getUserPushToken } = require('../model/pushToken');
const { Expo } = require('expo-server-sdk');

// Initialize the Expo SDK
let expo = new Expo();

function initializeCronJobs() {
    // Cron job for unpaid appointments notification, runs daily at 8:00 PM
    cron.schedule('0 20 * * *', async () => {
        console.log('Cron job started at:', new Date().toISOString());
        try {        
            const today = new Date().toISOString().split('T')[0];
            console.log('Today:', today);
            const unpaidAppointments = await getUnpaidAppointmentsByDate(today);
            const appointments = await getAppointmentsByDate(today);
            console.log('Unpaid appointments:', unpaidAppointments);
            console.log('Appointments:', appointments);
            if (unpaidAppointments.length > 0) {
                const message = `You have ${unpaidAppointments.length} unpaid appointment(s) for today.`;
                await sendUnpaidAppointmentsNotification('Barber', message);
            }
            
            console.log('Checked for unpaid appointments and sent notification if necessary');
        } catch (error) {
            console.error('Error checking unpaid appointments:', error);
        }
        console.log('Cron job completed at:', new Date().toISOString());
    });
}

async function sendUnpaidAppointmentsNotification(recipientName, message) {
    const barberPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const barber = await getUserByPhoneNumber(barberPhoneNumber);

    if (!barber) {
        console.log('No barber found with the given phone number');
        return;
    }

    const pushToken = await getUserPushToken(barber.id);

    if (!pushToken) {
        console.log('No push token found for the barber');
        return;
    }

    const notification = {
        to: pushToken,
        sound: 'default',
        title: 'Unpaid Appointments',
        body: message,
        data: { notificationType: 'unpaid_appointments' },
    };

    try {
        console.log('Sending notification:', notification);
        let ticketChunk = await expo.sendPushNotificationsAsync([notification]);
        console.log('Notification result:', ticketChunk);
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
}

module.exports = {
    initializeCronJobs
};