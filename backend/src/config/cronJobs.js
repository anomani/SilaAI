const cron = require('node-cron');
const { checkUnpaidAppointments, checkEndingAppointments } = require('./jobs/appointmentNotifications');
const { checkWaitlistRequests } = require('./jobs/waitlistChecks');
const { fillMyCalendar } = require('../ai/fillMyCalendar');

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

    // New cron job for fillMyCalendar, runs every hour
    cron.schedule('0 * * * *', async () => {
        await fillMyCalendar();
        console.log('fillMyCalendar cron job completed at:', new Date().toISOString());
    });
}

module.exports = {
    initializeCronJobs
};