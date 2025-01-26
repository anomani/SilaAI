const { getAvailability } = require('./getAvailability');
const moment = require('moment-timezone');
const { appointmentTypes, addOns } = require('../../model/appointmentTypes');

async function findRecurringAvailability(initialDate, appointmentType, addOnArray, recurrenceRule, userId, clientId = null) {
    console.log('Initial Date:', initialDate);
    console.log('Appointment Type:', appointmentType);
    console.log('Add-Ons:', addOnArray);
    console.log('Recurrence Rule:', JSON.stringify(recurrenceRule, null, 2));
    console.log('User ID:', userId);
    console.log('Client ID:', clientId);

    const appointmentTypeInfo = appointmentTypes[appointmentType];
    if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type: ${appointmentType}`);
    }

    const duration = calculateTotalDuration(appointmentType, addOnArray);

    let commonSlots = null;
    let currentDate = moment(initialDate);
    const endDate = moment(initialDate).add(1, 'year');

    while (currentDate.isSameOrBefore(endDate)) {
        if (matchesRecurrenceRule(currentDate, recurrenceRule)) {
            const formattedDate = currentDate.format('YYYY-MM-DD');
            const availability = await getAvailability(formattedDate, appointmentType, addOnArray, userId, clientId);
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
        const endTime = moment(startTime, 'HH:mm').add(duration, 'minutes').format('HH:mm');
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
    }
}

function calculateTotalDuration(appointmentType, addOnArray) {
    const appointmentDuration = appointmentTypes[appointmentType].duration;
    const addOnsDuration = addOnArray.reduce((total, addOn) => total + addOns[addOn].duration, 0);
    return appointmentDuration + addOnsDuration;
}

module.exports = { findRecurringAvailability };