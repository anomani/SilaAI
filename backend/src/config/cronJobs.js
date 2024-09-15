const cron = require('node-cron');
const { getUnpaidAppointmentsByDate, getEndingAppointments } = require('../model/appointment');
const { getUserByPhoneNumber } = require('../model/users');
const { getUserPushTokens } = require('../model/pushToken');
const { Expo } = require('expo-server-sdk');
const { getActiveWaitlistRequests, markWaitlistRequestAsNotified } = require('../model/waitlist');
const { getAvailability, findNextAvailableSlots, getAvailabilityCron } = require('../ai/tools/getAvailability');
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
            const endingAppointments = await getEndingAppointments(adjustedNow);
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

        } catch (error) {
            console.error('Error checking ending appointments:', error);
        }
    });

    // Updated cron job for checking waitlist requests, now runs every minute
    cron.schedule('* * * * *', async () => {
        try {
            const waitlistRequests = await getActiveWaitlistRequests();
            
            for (const request of waitlistRequests) {
                let availableSlots;
                
                try {
                    switch (request.requesttype) {
                        case 'specific':
                            console.log(`Checking specific date: ${request.startdate}`);
                            availableSlots = await getAvailabilityCron(request.startdate, request.appointmenttype, []);
                            console.log("AvailableSlots", availableSlots)
                            break;
                        case 'range':
                            console.log(`Checking date range: ${request.startdate} to ${request.enddate}`);
                            availableSlots = await checkRangeAvailability(request.startdate, request.enddate, request.appointmenttype);
                            break;
                        case 'day':
                            console.log(`Checking day of week: ${request.dayofweek}`);
                            availableSlots = await checkDayAvailability(request.dayofweek, request.appointmenttype);
                            break;
                        case 'week':
                            console.log(`Checking week starting from: ${request.startdate}`);
                            availableSlots = await checkWeekAvailability(request.startdate, request.appointmenttype);
                            console.log("AvailableSlots", availableSlots)
                            break;
                        default:
                            console.log(`Unknown request type: ${request.requesttype}`);
                            availableSlots = [];
                    }
                    
                    // Filter available slots based on request's time range
                    if (availableSlots.length > 0) {
                        availableSlots = availableSlots.filter(slot => {
                            return slot.startTime >= request.starttime && slot.endTime <= request.endtime;
                        });
                    }
                    
                } catch (error) {
                    console.error(`Error checking availability for request ID ${request.id}:`, error);
                    availableSlots = [];
                }
                
                if (availableSlots.availableSlots && availableSlots.availableSlots.length > 0) {
                    const client = await getClientById(request.clientid);
                    
                    // Use the date from the first available slot
                    const [year, month, day] = availableSlots.date.split('-');
                    const slotDate = new Date(Date.UTC(year, month - 1, day));
                    
                    // Subtract 4 hours
                    slotDate.setUTCHours(slotDate.getUTCHours() - 4);
                    
                    const formattedDate = slotDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
                    
                    const message = `A spot has opened up for your requested appointment on ${formattedDate}. Please book soon!`;
                    await sendMessage(client.phonenumber, message, false, false);
                    await markWaitlistRequestAsNotified(request.id);
                    console.log(`Marked request ID: ${request.id} as notified`);
                }
            }
            
            console.log('Finished checking waitlist requests at:', new Date().toISOString());
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
        const daySlots = await getAvailabilityCron(dateString, appointmentType, []);
        
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
    const availableSlots = await getAvailabilityCron(dateString, appointmentType, []);

    return availableSlots.map(slot => ({
        date: dateString,
        ...slot
    }));
}

async function checkWeekAvailability(startDate, appointmentType) {
    const startDateObj = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDateObj);
        currentDate.setDate(currentDate.getDate() + i);
        const dateString = currentDate.toISOString().split('T')[0];
        
        const result = await getAvailabilityCron(dateString, appointmentType, []);
        
        if (result && result.availableSlots && result.availableSlots.length > 0) {
            return result; // Return the result as-is when we find available slots
        }
    }

    return null; // Return null if no available slots are found in the week
}

// async function test() {
//     const availableSlots = [{
//         date: '2024-09-26',
//         availableSlots: [ { startTime: '12:45', endTime: '13:15' } ]
//       }]
//       const slotDate = new Date(availableSlots[0].date);
//       const formattedDate = slotDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
//       console.log(formattedDate)
// }

// test()

module.exports = {
    initializeCronJobs
};