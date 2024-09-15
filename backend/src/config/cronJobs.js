const cron = require('node-cron');
const { checkUnpaidAppointments, checkEndingAppointments } = require('./jobs/appointmentNotifications');
const { checkWaitlistRequests } = require('./jobs/waitlistChecks');

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
}


module.exports = {
    initializeCronJobs
};