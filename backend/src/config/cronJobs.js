const cron = require('node-cron');
const { checkUnpaidAppointments, checkEndingAppointments } = require('./jobs/appointmentNotifications');
const { checkWaitlistRequests } = require('./jobs/waitlistChecks');
const { fillMyCalendar } = require('../ai/fillMyCalendar');
const { getFillMyCalendarStatus } = require('../model/settings');

function initializeCronJobs() {
    // Cron job for unpaid appointments notification, runs daily at 8:00 PM
    cron.schedule('0 20 * * *', async () => {
        await checkUnpaidAppointments();
        console.log('Cron job completed at:', new Date().toISOString());
    });

    // Cron job for appointment end notifications, runs every minute
    cron.schedule('* * * * *', async () => {
        await checkEndingAppointments();
    });

    // Cron job for checking waitlist requests, runs every minute
    cron.schedule('* * * * *', async () => {
        await checkWaitlistRequests();
    });

    // Updated cron job for fillMyCalendar, runs every hour
    cron.schedule('0 * * * *', async () => {
        try {
            // Assuming we have a way to get the userId. If not, we'll need to adjust this.
            const userId = 1; // Replace with actual way to get userId
            const fillMyCalendarEnabled = await getFillMyCalendarStatus(userId);
            
            if (fillMyCalendarEnabled) {
                await fillMyCalendar();
                console.log('fillMyCalendar cron job completed at:', new Date().toISOString());
            } else {
                console.log('fillMyCalendar is disabled. Skipping cron job at:', new Date().toISOString());
            }
        } catch (error) {
            console.error('Error in fillMyCalendar cron job:', error);
        }
    });
}

module.exports = {
    initializeCronJobs
};