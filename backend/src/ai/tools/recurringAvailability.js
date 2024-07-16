const { getAvailability } = require('./getAvailability');
const moment = require('moment-timezone');

// Set the default timezone to match your Heroku server
const serverTimezone = process.env.TZ || 'UTC';
moment.tz.setDefault(serverTimezone);

async function findRecurringAvailability(initialDate, appointmentDuration, group, recurrenceRule) {
    let commonSlots = null;
    let currentDate = moment(initialDate);
    const endDate = moment(initialDate).add(1, 'year');

    while (currentDate.isSameOrBefore(endDate)) {
        if (matchesRecurrenceRule(currentDate, recurrenceRule)) {
            const formattedDate = currentDate.format('YYYY-MM-DD');
            const availability = await getAvailability(formattedDate, appointmentDuration, group);
            console.log('availability', availability);
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
    switch (recurrenceRule.type) {
        case 'daily':
            return true;
        case 'weekly':
            return date.day() === recurrenceRule.dayOfWeek;
        case 'biweekly':
            return date.day() === recurrenceRule.dayOfWeek && date.week() % 2 === 0;
        case 'monthly':
            if (recurrenceRule.dayOfMonth) {
                return date.date() === recurrenceRule.dayOfMonth;
            } else if (recurrenceRule.weekOfMonth && recurrenceRule.dayOfWeek) {
                const weekOfMonth = Math.ceil(date.date() / 7);
                return date.day() === recurrenceRule.dayOfWeek && weekOfMonth === recurrenceRule.weekOfMonth;
            }
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
        weekOfMonth: 1,
        dayOfWeek: 3 // First Wednesday of the month
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
exampleCall();

module.exports = { findRecurringAvailability };