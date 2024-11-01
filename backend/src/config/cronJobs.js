const cron = require('node-cron');
const { checkUnpaidAppointments, checkEndingAppointments } = require('./jobs/appointmentNotifications');
const { checkWaitlistRequests } = require('./jobs/waitlistChecks');
const { fillMyCalendar } = require('../ai/fillMyCalendar');
const { getFillMyCalendarStatus } = require('../model/settings');
const { getAllUsers } = require('../model/users'); // Add this line

async function initializeCronJobs() {
    // Cron job for unpaid appointments notification, runs daily at 8:00 PM
    cron.schedule('0 20 * * *', async () => {
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
}

module.exports = {
    initializeCronJobs
};