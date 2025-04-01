const { getUnpaidAppointmentsByDate, getEndingAppointments, getAppointmentsByDay } = require('../../model/appointment');
const { sendNotificationToUser } = require('./notifications');
const { getUserById, getReminderMessageTemplate } = require('../../model/users');
const { sendMessage } = require('../twilio');
const { getClientById } = require('../../model/clients');
const { getMessagesByClientId } = require('../../model/messages');

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
        adjustedNow.setHours(adjustedNow.getHours() - 4); // Subtract 4 hours
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
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        console.log("tomorrowStr", tomorrowStr)
        
        const user = await getUserById(userId);
        const appointments = await getAppointmentsByDay(userId, tomorrowStr);
        console.log("appointments", appointments)
        
        // Group appointments by phone number
        const appointmentsByPhone = new Map();
        
        // First pass: group appointments and get client info
        for (const appointment of appointments) {
            const client = await getClientById(appointment.clientid);
            if (client && client.phonenumber) {
                if (!appointmentsByPhone.has(client.phonenumber)) {
                    appointmentsByPhone.set(client.phonenumber, {
                        client,
                        appointments: []
                    });
                }
                appointmentsByPhone.get(client.phonenumber).appointments.push({
                    ...appointment,
                    formattedTime: convertTo12Hour(appointment.starttime)
                });
            }
        }
        
        // Second pass: send messages for each unique phone number
        for (const [phoneNumber, data] of appointmentsByPhone) {
            const { client, appointments } = data;
            const messageHistory = await getMessagesByClientId(client.id);
            
            let message;
            if (!messageHistory || messageHistory.length === 0) {
                const firstMessageTemplate = (user.first_message_template || 'Hey {firstname}, this is Uzi from UziCuts reaching out from my new business number. Please save it to your contacts.\n\nJust wanted to confirm, are you good for your appointment tomorrow at {time}?')
                    .replace(/\\n/g, '\n'); // Convert \n to actual line breaks
                message = firstMessageTemplate
                    .replace('{firstname}', client.firstname)
                    .replace('{time}', appointments.length === 1 
                        ? appointments[0].formattedTime 
                        : appointments.map(a => a.formattedTime).join(' and '));
            } else {
                const messageTemplate = (user.reminder_template || 'Hey {firstname}, just wanted to confirm if you\'re good for your appointment tomorrow at {time}?')
                    .replace(/\\n/g, '\n'); // Convert \n to actual line breaks
                message = messageTemplate
                    .replace('{firstname}', client.firstname)
                    .replace('{time}', appointments.length === 1 
                        ? appointments[0].formattedTime 
                        : appointments.map(a => a.formattedTime).join(' and '));
            }
            
            console.log("message: ", message);
            await sendMessage(
                phoneNumber,
                message,
                userId,
                true,  // initialMessage
                true   // manual
            );
        }
        
        console.log(`Sent appointment reminder SMS messages for user ${userId} for date ${tomorrowStr}`);
    } catch (error) {
        console.error(`Error sending appointment reminder SMS messages for user ${userId}:`, error);
    }
}

async function testNextDayAppointmentReminders(userId) {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 7);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        console.log("\n=== TEST MODE: Next Day Appointment Reminders ===");
        console.log("Date:", tomorrowStr);
        
        const user = await getUserById(userId);
        console.log("\nUser:", user.username);
        
        const appointments = await getAppointmentsByDay(userId, tomorrowStr);
        console.log("\nFound", appointments.length, "appointments for tomorrow");
        
        // Group appointments by phone number
        const appointmentsByPhone = new Map();
        
        // First pass: group appointments by phone number
        for (const appointment of appointments) {
            const client = await getClientById(appointment.clientid);
            if (client && client.phonenumber) {
                if (!appointmentsByPhone.has(client.phonenumber)) {
                    appointmentsByPhone.set(client.phonenumber, {
                        client,
                        appointments: []
                    });
                }
                appointmentsByPhone.get(client.phonenumber).appointments.push({
                    ...appointment,
                    formattedTime: convertTo12Hour(appointment.starttime)
                });
            }
        }
        
        // Second pass: generate test messages for each unique phone number
        for (const [phoneNumber, data] of appointmentsByPhone) {
            const { client, appointments } = data;
            const messageHistory = await getMessagesByClientId(client.id);
            
            let message;
            if (!messageHistory || messageHistory.length === 0) {
                const firstMessageTemplate = (user.first_message_template || 'Hey {firstname}, this is Uzi from UziCuts reaching out from my new business number. Please save it to your contacts.\n\nJust wanted to confirm, are you good for your appointment tomorrow at {time}?')
                    .replace(/\\n/g, '\n'); // Convert \n to actual line breaks
                message = firstMessageTemplate
                    .replace('{firstname}', client.firstname)
                    .replace('{time}', appointments.length === 1 
                        ? appointments[0].formattedTime 
                        : appointments.map(a => a.formattedTime).join(' and '));
                console.log("\n[First Time Message]");
            } else {
                const messageTemplate = (user.response_template || 'Hey {firstname}, just wanted to confirm if you\'re good for your appointment tomorrow at {time}?')
                    .replace(/\\n/g, '\n'); // Convert \n to actual line breaks
                message = messageTemplate
                    .replace('{firstname}', client.firstname)
                    .replace('{time}', appointments.length === 1 
                        ? appointments[0].formattedTime 
                        : appointments.map(a => a.formattedTime).join(' and '));
                console.log("\n[Regular Reminder]");
            }

            console.log("To:", client.firstname, `(${phoneNumber})`);
            console.log("Message:", message);
            console.log("Appointments:", appointments.map(a => a.formattedTime).join(', '));
            console.log("Message History:", messageHistory ? messageHistory.length : 0, "messages");
        }
        console.log("\n=== End Test ===\n");
    } catch (error) {
        console.error(`Error testing next day appointment reminders for user ${userId}:`, error);
    }
}

// async function main() {
//     await testNextDayAppointmentReminders(1);
// }
// main();

module.exports = {
    checkUnpaidAppointments,
    checkEndingAppointments,
    sendNextDayAppointmentReminders,
    testNextDayAppointmentReminders,
    convertTo12Hour  // Export for testing
};