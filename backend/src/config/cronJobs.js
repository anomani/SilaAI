const cron = require('node-cron');
const { checkUnpaidAppointments, checkEndingAppointments, sendNextDayAppointmentReminders } = require('./jobs/appointmentNotifications');
const { checkWaitlistRequests } = require('./jobs/waitlistChecks');
const { fillMyCalendar } = require('../ai/fillMyCalendar');
const { getFillMyCalendarStatus, getNextDayRemindersStatus } = require('../model/settings');
const { getAllUsers } = require('../model/users');

async function initializeCronJobs() {
    // Cron job for unpaid appointments notification, runs daily at 12:00 AM (Midnight)
    cron.schedule('0 0 * * *', async () => {
        const users = await getAllUsers();
        for (const user of users) {
            await checkUnpaidAppointments(user.id);
        }
        console.log('Unpaid appointments check completed at:', new Date().toISOString());
    });

    // Cron job for appointment end notifications, runs every minute
    cron.schedule('* * * * *', async () => {
        const users = await getAllUsers();
        for (const user of users) {
            await checkEndingAppointments(user.id);
        }
    });

    // Cron job for checking waitlist requests, runs every minute
    cron.schedule('* * * * *', async () => {
        const users = await getAllUsers();
        for (const user of users) {
            await checkWaitlistRequests(user.id);
        }
    });

    // Updated cron job for fillMyCalendar, runs every minute
    cron.schedule('* * * * *', async () => {
        try {
            const users = await getAllUsers();
            for (const user of users) {
                const fillMyCalendarEnabled = await getFillMyCalendarStatus(user.id);
                
                if (fillMyCalendarEnabled) {
                    await fillMyCalendar(user.id);
                    console.log(`fillMyCalendar completed for user ${user.id} at:`, new Date().toISOString());
                } else {
                    console.log(`fillMyCalendar is disabled for user ${user.id}. Skipping at:`, new Date().toISOString());
                }
            }
        } catch (error) {
            console.error('Error in fillMyCalendar cron job:', error);
        }
    });

    // Updated cron job for next day appointment reminders
    cron.schedule('35 21 * * *', async () => {
        try {
            const users = await getAllUsers();
            for (const user of users) {
                const remindersEnabled = await getNextDayRemindersStatus(user.id);
                
                if (remindersEnabled) {
                    await sendNextDayAppointmentReminders(user.id);
                    console.log(`Next day reminders sent for user ${user.id} at:`, new Date().toISOString());
                } else {
                    console.log(`Next day reminders are disabled for user ${user.id}. Skipping at:`, new Date().toISOString());
                }
            }
        } catch (error) {
            console.error('Error in next day appointment reminders cron job:', error);
        }
    });
}

module.exports = {
    initializeCronJobs
};