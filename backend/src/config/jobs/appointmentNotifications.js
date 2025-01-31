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
        console.log("tomorrowStr", tomorrowStr)
        
        // Get user data for templates
        const user = await getUserById(userId);
        
        // Get all appointments for tomorrow
        const appointments = await getAppointmentsByDay(userId, tomorrowStr);
        console.log("appointments", appointments)
        
        // Send reminder for each appointment
        for (const appointment of appointments) {
            // Get client details using clientId
            const client = await getClientById(appointment.clientid);
            console.log("client", client)
            if (client && client.phonenumber) {
                // Convert the time to 12-hour format
                const formattedTime = convertTo12Hour(appointment.starttime);
                
                // Check if there's any message history
                const messageHistory = await getMessagesByClientId(client.id);
                
                let message;
                if (!messageHistory || messageHistory.length === 0) {
                    const firstMessageTemplate = user.first_message_template || 'Hey {firstname}, this is Uzi from UziCuts reaching out from my new business number. Please save it to your contacts.\n\nJust wanted to confirm, are you good for your appointment tomorrow at {time}?';
                    message = firstMessageTemplate
                        .replace('{firstname}', client.firstname)
                        .replace('{time}', formattedTime);
                } else {
                    const messageTemplate = user.reminder_template || 'Hey {firstname}, just wanted to confirm if you\'re good for your appointment tomorrow at {time}?';
                    message = messageTemplate
                        .replace('{firstname}', client.firstname)
                        .replace('{time}', formattedTime);
                }
                
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

async function testNextDayAppointmentReminders(userId) {
    try {
        // Get tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        console.log("\n=== TEST MODE: Next Day Appointment Reminders ===");
        console.log("Date:", tomorrowStr);
        
        // Get user data for templates
        const user = await getUserById(userId);
        console.log("\nUser:", user.username);
        
        // Get all appointments for tomorrow
        const appointments = await getAppointmentsByDay(userId, tomorrowStr);
        console.log("\nFound", appointments.length, "appointments for tomorrow");
        
        // Test messages for each appointment
        for (const appointment of appointments) {
            // Get client details using clientId
            const client = await getClientById(appointment.clientid);
            if (client && client.phonenumber) {
                // Convert the time to 12-hour format
                const formattedTime = convertTo12Hour(appointment.starttime);
                
                // Check if there's any message history
                const messageHistory = await getMessagesByClientId(client.id);
                
                let message;
                if (!messageHistory || messageHistory.length === 0) {
                    const firstMessageTemplate = user.first_message_template || 'Hey {firstname}, this is Uzi from UziCuts reaching out from my new business number. Please save it to your contacts.\n\nJust wanted to confirm, are you good for your appointment tomorrow at {time}?';
                    message = firstMessageTemplate
                        .replace('{firstname}', client.firstname)
                        .replace('{time}', formattedTime);
                    console.log("\n[First Time Message]");
                } else {
                    const messageTemplate = user.reminder_template || 'Hey {firstname}, just wanted to confirm if you\'re good for your appointment tomorrow at {time}?';
                    message = messageTemplate
                        .replace('{firstname}', client.firstname)
                        .replace('{time}', formattedTime);
                    console.log("\n[Regular Reminder]");
                }
                
                console.log("To:", client.firstname, `(${client.phonenumber})`);
                console.log("Message:", message);
                console.log("Time:", formattedTime);
                console.log("Message History:", messageHistory ? messageHistory.length : 0, "messages");
            }
        }
        
        console.log("\n=== End Test ===\n");
    } catch (error) {
        console.error(`Error testing next day appointment reminders for user ${userId}:`, error);
    }
}

async function main() {
    await testNextDayAppointmentReminders(1);
}
main();

module.exports = {
    checkUnpaidAppointments,
    checkEndingAppointments,
    sendNextDayAppointmentReminders,
    testNextDayAppointmentReminders,
    convertTo12Hour  // Export for testing
};