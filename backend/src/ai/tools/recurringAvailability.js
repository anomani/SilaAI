const { getAvailability } = require('./getAvailability');
const moment = require('moment-timezone');

async function findRecurringAvailability(initialDate, appointmentDuration, group, recurrenceRule, numberOfRecurrences) {
    const availableSlots = [];
    let currentDate = moment(initialDate);

    for (let i = 0; i < numberOfRecurrences; i++) {
        if (i > 0) {
            currentDate = applyRecurrenceRule(currentDate, recurrenceRule);
        }

        const formattedDate = currentDate.format('YYYY-MM-DD');
        const availability = await getAvailability(formattedDate, appointmentDuration, group);

        if (availability.length > 0) {
            availableSlots.push({
                date: formattedDate,
                slots: availability
            });
        }
    }

    return availableSlots;
}

function applyRecurrenceRule(currentDate, recurrenceRule) {
    switch (recurrenceRule.type) {
        case 'daily':
            return currentDate.add(recurrenceRule.interval || 1, 'day');
        case 'weekly':
            return currentDate.add((recurrenceRule.interval || 1) * 7, 'day').day(recurrenceRule.dayOfWeek);
        case 'biweekly':
            return currentDate.add(2, 'week').day(recurrenceRule.dayOfWeek);
        case 'monthly':
            if (recurrenceRule.dayOfMonth) {
                return currentDate.add(recurrenceRule.interval || 1, 'month').date(recurrenceRule.dayOfMonth);
            } else if (recurrenceRule.weekOfMonth && recurrenceRule.dayOfWeek) {
                return currentDate.add(recurrenceRule.interval || 1, 'month')
                    .startOf('month')
                    .add(recurrenceRule.weekOfMonth - 1, 'weeks')
                    .day(recurrenceRule.dayOfWeek);
            }
        case 'custom':
            return currentDate.add(recurrenceRule.interval, recurrenceRule.unit);
        default:
            throw new Error('Invalid recurrence rule');
    }
}


// Example call to findRecurringAvailability function
const exampleCall = async () => {
    const initialDate = '2024-10-22';
    const appointmentDuration = 30; // Duration in minutes
    const group = 1; // Example group
    const recurrenceRule = {
        type: 'weekly',
        interval: 1,
        dayOfWeek: 2 // Tuesday (0 is Sunday, 1 is Monday, etc.)
    };
    const numberOfRecurrences = 4;

    try {
        const recurringAvailability = await findRecurringAvailability(
            initialDate,
            appointmentDuration,
            group,
            recurrenceRule,
            numberOfRecurrences
        );
        console.log('Recurring Availability:', JSON.stringify(recurringAvailability, null, 2));
    } catch (error) {
        console.error('Error finding recurring availability:', error);
    }
};

// Uncomment the line below to run the example
exampleCall();

module.exports = { findRecurringAvailability };