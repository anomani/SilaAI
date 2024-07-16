const { getAvailability } = require('./getAvailability');
const moment = require('moment-timezone');

async function findRecurringAvailability(initialDate, appointmentDuration, group, recurrenceInterval, numberOfRecurrences, preferredDayOfWeek, preferredTime) {
    const availableSlots = [];
    let currentDate = moment(initialDate);

    console.log("Initial Date:", initialDate);
    console.log("Appointment Duration:", appointmentDuration);
    console.log("Group:", group);
    console.log("Recurrence Interval:", recurrenceInterval);
    console.log("Number of Recurrences:", numberOfRecurrences);
    console.log("Preferred Day of Week:", preferredDayOfWeek);
    console.log("Preferred Time:", preferredTime);

    for (let i = 0; i < numberOfRecurrences; i++) {
        if (i > 0) {
            currentDate = currentDate.add(recurrenceInterval.amount, recurrenceInterval.unit);
        }

        // If a preferred day of week is specified, adjust the date
        if (preferredDayOfWeek) {
            currentDate = currentDate.day(preferredDayOfWeek);
        }

        const formattedDate = currentDate.format('YYYY-MM-DD');
        const availability = await getAvailability(formattedDate, appointmentDuration, group);

        if (preferredTime) {
            const slotStart = `${formattedDate} ${preferredTime}`;
            const isAvailable = availability.some(slot => 
                slot.startTime === preferredTime
            );

            if (isAvailable) {
                availableSlots.push({
                    date: formattedDate,
                    time: preferredTime
                });
            } else {
                break; // If the preferred time is not available, stop searching
            }
        } else {
            // If no preferred time is specified, return the first available slot
            if (availability.length > 0) {
                availableSlots.push({
                    date: formattedDate,
                    time: availability[0].startTime
                });
            } else {
                break; // If no slots are available for a date, stop searching
            }
        }
    }

    return availableSlots;
}

// async function main() {
//     const initialDate = "2024-09-03";
//     const appointmentDuration = 30;
//     const group = 1;
//     const recurrenceInterval = { amount: 2, unit: "weeks" };
//     const numberOfRecurrences = 27;
//     const preferredDayOfWeek = 6;
//     const preferredTime = "09:00";
//     const availableSlots = await findRecurringAvailability(initialDate, appointmentDuration, group, recurrenceInterval, numberOfRecurrences, preferredDayOfWeek, preferredTime);
//     console.log(availableSlots);
// }

// main();
module.exports = { findRecurringAvailability };