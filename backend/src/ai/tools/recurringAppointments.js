const { getAvailability } = require('./getAvailability');
const { bookAppointment } = require('./bookAppointment');
const moment = require('moment-timezone');

async function createRecurringAppointments(initialDate, startTime, fname, lname, phone, email, appointmentType, appointmentDuration, group, price, addOnArray, recurrenceRule) {
    console.log('initialDate', initialDate);
    console.log('startTime', startTime);
    console.log('fname', fname);
    console.log('lname', lname);
    console.log('phone', phone);
    console.log('email', email);
    console.log('appointmentType', appointmentType);
    console.log('appointmentDuration', appointmentDuration);
    console.log('group', group);
    console.log('price', price);
    console.log('addOnArray', addOnArray);
    console.log('recurrenceRule', recurrenceRule);
    const bookedAppointments = [];
    let currentDate = moment(initialDate);
    const endDate = moment(initialDate).add(1, 'year');

    while (currentDate.isSameOrBefore(endDate)) {
        const formattedDate = currentDate.format('YYYY-MM-DD');
        const availability = await getAvailability(formattedDate, appointmentDuration, group);

        // Check if the specific time slot is available
        const isSlotAvailable = availability.some(slot => {
            const slotStart = moment(`${formattedDate} ${slot.startTime}`, 'YYYY-MM-DD HH:mm');
            const slotEnd = moment(`${formattedDate} ${slot.endTime}`, 'YYYY-MM-DD HH:mm');
            const appointmentStart = moment(`${formattedDate} ${startTime}`, 'YYYY-MM-DD HH:mm');
            const appointmentEnd = appointmentStart.clone().add(appointmentDuration, 'minutes');

            return appointmentStart.isSameOrAfter(slotStart) && appointmentEnd.isSameOrBefore(slotEnd);
        });

        if (isSlotAvailable) {
            try {
                const result = await bookAppointment(
                    formattedDate,
                    startTime,
                    fname,
                    lname,
                    phone,
                    email,
                    appointmentType,
                    appointmentDuration,
                    group,
                    price,
                    addOnArray
                );
                if (result === "Appointment booked successfully") {
                    bookedAppointments.push({
                        date: formattedDate,
                        startTime: startTime
                    });
                } else {
                    console.log(`Failed to book appointment for ${formattedDate}: ${result}`);
                    break;
                }
            } catch (error) {
                console.error(`Error booking appointment for ${formattedDate}:`, error);
                break;
            }
        } else {
            console.log(`No availability for ${formattedDate} at ${startTime}`);
        }

        currentDate = applyRecurrenceRule(currentDate, recurrenceRule);
    }

    return bookedAppointments;
}

function applyRecurrenceRule(currentDate, recurrenceRule) {
    switch (recurrenceRule.type) {
        case 'daily':
            return currentDate.add(1, 'day');
        case 'weekly':
            return currentDate.add(1, 'week').day(recurrenceRule.dayOfWeek);
        case 'biweekly':
            return currentDate.add(2, 'week').day(recurrenceRule.dayOfWeek);
        case 'monthly':
            if (recurrenceRule.dayOfMonth) {
                return currentDate.add(1, 'month').date(recurrenceRule.dayOfMonth);
            } else if (recurrenceRule.weekOfMonth && recurrenceRule.dayOfWeek) {
                return currentDate.add(1, 'month')
                    .startOf('month')
                    .add(recurrenceRule.weekOfMonth - 1, 'weeks')
                    .day(recurrenceRule.dayOfWeek);
            }
        default:
            throw new Error('Invalid recurrence rule');
    }
}

module.exports = { createRecurringAppointments };