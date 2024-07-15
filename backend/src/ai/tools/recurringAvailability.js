const { getAvailability } = require('./getAvailability');
const moment = require('moment-timezone');

async function findRecurringAvailability(initialDate, appointmentDuration, group, recurrenceInterval, numberOfRecurrences, preferredDayOfWeek = null, preferredTimeRange = null) {
    const availableSlots = [];
    let currentDate = moment(initialDate);

    for (let i = 0; i < numberOfRecurrences; i++) {
        if (i > 0) {
            currentDate = currentDate.add(recurrenceInterval.amount, recurrenceInterval.unit);
        }

        // If a preferred day of week is specified, adjust the date
        if (preferredDayOfWeek !== null) {
            currentDate = currentDate.day(preferredDayOfWeek);
        }

        const formattedDate = currentDate.format('YYYY-MM-DD');
        const availability = await getAvailability(formattedDate, appointmentDuration, group);

        const slotsForThisDate = availability.filter(slot => {
            if (preferredTimeRange) {
                const slotStart = moment(`${formattedDate} ${slot.startTime}`, 'YYYY-MM-DD HH:mm');
                return slotStart.isBetween(moment(`${formattedDate} ${preferredTimeRange.start}`, 'YYYY-MM-DD HH:mm'), 
                                           moment(`${formattedDate} ${preferredTimeRange.end}`, 'YYYY-MM-DD HH:mm'), null, '[]');
            }
            return true;
        });

        if (slotsForThisDate.length > 0) {
            availableSlots.push({
                date: formattedDate,
                slots: slotsForThisDate
            });
        } else {
            break; // If no slots are available for a date, stop searching
        }
    }

    return availableSlots;
}

module.exports = { findRecurringAvailability };
