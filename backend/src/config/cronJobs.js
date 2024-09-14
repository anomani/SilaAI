const cron = require('node-cron');
const { getUnpaidAppointmentsByDate, getEndingAppointments } = require('../model/appointment');
const { getUserByPhoneNumber } = require('../model/users');
const { getUserPushTokens } = require('../model/pushToken');
const { Expo } = require('expo-server-sdk');
const { getActiveWaitlistRequests, markWaitlistRequestAsNotified } = require('../model/waitlist');
const { getAvailability, findNextAvailableSlots } = require('../ai/tools/getAvailability');
const { sendMessage } = require('./twilio');
const { getClientById } = require('../model/clients');

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

    // New cron job for checking waitlist requests, runs every hour
    cron.schedule('0 * * * *', async () => {
        try {
            console.log('Checking waitlist requests');
            const waitlistRequests = await getActiveWaitlistRequests();
            
            for (const request of waitlistRequests) {
                let availableSlots;
                
                switch (request.requestType) {
                    case 'specific':
                        availableSlots = await getAvailability(request.startDate, request.appointmentType, []);
                        break;
                    case 'range':
                        availableSlots = await checkRangeAvailability(request.startDate, request.endDate, request.appointmentType);
                        break;
                    case 'day':
                        availableSlots = await checkDayAvailability(request.dayOfWeek, request.appointmentType);
                        break;
                    case 'week':
                        availableSlots = await checkWeekAvailability(request.startDate, request.appointmentType);
                        break;
                }
                
                if (availableSlots && availableSlots.length > 0) {
                    // Notify the client
                    const client = await getClientById(request.clientId);
                    const message = `A spot has opened up for your requested appointment on ${availableSlots[0].date} at ${availableSlots[0].startTime}. Please book soon!`;
                    await sendMessage(client.phonenumber, message, false, false);
                    await markWaitlistRequestAsNotified(request.id);
                }
            }
            
            console.log('Finished checking waitlist requests');
        } catch (error) {
            console.error('Error checking waitlist requests:', error);
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
    for (const token of pushTokens) {
        const notification = {
            to: token,
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
    }
}

// Helper functions for checking availability
async function checkRangeAvailability(startDate, endDate, appointmentType) {
    let currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    let availableSlots = [];

    while (currentDate <= endDateObj) {
        const dateString = currentDate.toISOString().split('T')[0];
        const daySlots = await getAvailability(dateString, appointmentType, []);
        
        if (daySlots.length > 0) {
            availableSlots.push(...daySlots.map(slot => ({
                date: dateString,
                ...slot
            })));

            if (availableSlots.length > 0) break; // Stop after finding the first available slot
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableSlots;
}

async function checkDayAvailability(dayOfWeek, appointmentType) {
    const today = new Date();
    let targetDate = new Date(today);

    // Find the next occurrence of the specified day of the week
    while (targetDate.getDay() !== dayOfWeek) {
        targetDate.setDate(targetDate.getDate() + 1);
    }

    const dateString = targetDate.toISOString().split('T')[0];
    const availableSlots = await getAvailability(dateString, appointmentType, []);

    return availableSlots.map(slot => ({
        date: dateString,
        ...slot
    }));
}

async function checkWeekAvailability(startDate, appointmentType) {
    const startDateObj = new Date(startDate);
    let availableSlots = [];

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDateObj);
        currentDate.setDate(currentDate.getDate() + i);
        const dateString = currentDate.toISOString().split('T')[0];
        
        const daySlots = await getAvailability(dateString, appointmentType, []);
        
        if (daySlots.length > 0) {
            availableSlots.push(...daySlots.map(slot => ({
                date: dateString,
                ...slot
            })));

            if (availableSlots.length > 0) break; // Stop after finding the first available slot
        }
    }

    return availableSlots;
}

module.exports = {
    initializeCronJobs
};