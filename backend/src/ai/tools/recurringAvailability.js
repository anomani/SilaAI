const { getAvailability } = require('./getAvailability');
const moment = require('moment-timezone');

async function findRecurringAvailability(initialDate, appointmentDuration, group, recurrenceRule) {
    console.log('Initial Date:', initialDate);
    console.log('Appointment Duration:', appointmentDuration);
    console.log('Group:', group);
    console.log('Recurrence Rule:', JSON.stringify(recurrenceRule, null, 2));
    let commonSlots = null;
    let currentDate = moment(initialDate);
    const endDate = moment(initialDate).add(1, 'year');

    while (currentDate.isSameOrBefore(endDate)) {
        if (matchesRecurrenceRule(currentDate, recurrenceRule)) {
            const formattedDate = currentDate.format('YYYY-MM-DD');
            const availability = await getAvailability(formattedDate, appointmentDuration, group);
            if (Array.isArray(availability) && availability.length > 0) {
                const startTimes = availability.map(slot => slot.startTime);
                if (commonSlots === null) {
                    commonSlots = new Set(startTimes);
                } else {
                    commonSlots = new Set(startTimes.filter(time => commonSlots.has(time)));
                }
            }
        }
        currentDate.add(1, 'day');
    }

    // Convert common start times back to slot objects
    return Array.from(commonSlots || []).map(startTime => {
        const endTime = moment(startTime, 'HH:mm').add(appointmentDuration, 'minutes').format('HH:mm');
        return { startTime, endTime };
    });
}

function matchesRecurrenceRule(date, recurrenceRule) {
    const interval = recurrenceRule.interval || 1;
    const startDate = moment(recurrenceRule.startDate || date);

    switch (recurrenceRule.type) {
        case 'daily':
            return date.diff(startDate, 'days') % interval === 0;
        case 'weekly':
            return date.day() === recurrenceRule.dayOfWeek && 
                   date.diff(startDate, 'weeks') % interval === 0;
        case 'biweekly':
            return date.day() === recurrenceRule.dayOfWeek && 
                   date.diff(startDate, 'weeks') % (2 * interval) === 0;
        case 'monthly':
            const monthsDiff = date.diff(startDate, 'months');
            if (monthsDiff % interval !== 0) return false;

            if (recurrenceRule.dayOfMonth) {
                return date.date() === recurrenceRule.dayOfMonth;
            } else if (recurrenceRule.weekOfMonth && recurrenceRule.dayOfWeek) {
                const weekOfMonth = Math.ceil(date.date() / 7);
                return date.day() === recurrenceRule.dayOfWeek && 
                       weekOfMonth === recurrenceRule.weekOfMonth;
            }
            return false;
        case 'custom':
            // Implement custom recurrence logic if needed
            return false;
        default:
            throw new Error('Invalid recurrence rule');
    }
}

// Modify the example call to demonstrate timezone handling
const exampleCall = async () => {
    const initialDate = '2024-10-22';
    const appointmentDuration = 30; // Duration in minutes
    const group = 1; // Example group
    const recurrenceRule = {
        type: 'monthly',
        interval: 3, // Every 3 months
        weekOfMonth: 1,
        dayOfWeek: 3, // First Wednesday of every 3 months
        startDate: '2024-10-22'
    };
    
    console.log(`Current server timezone: ${moment.tz.guess()}`);
    console.log(`Current time: ${moment().format()}`);
    
    try {
        console.log('Input:');
        console.log('Initial Date:', initialDate);
        console.log('Appointment Duration:', appointmentDuration);
        console.log('Group:', group);
        console.log('Recurrence Rule:', JSON.stringify(recurrenceRule, null, 2));

        const commonAvailability = await findRecurringAvailability(
            initialDate,
            appointmentDuration,
            group,
            recurrenceRule
        );
        console.log('\nOutput:');
        console.log('Common Available Slots:', JSON.stringify(commonAvailability, null, 2));
    } catch (error) {
        console.error('Error finding recurring availability:', error);
    }
};

// Uncomment the line below to run the example
// exampleCall();

module.exports = { findRecurringAvailability };