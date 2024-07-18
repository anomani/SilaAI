const { getAvailability } = require('./getAvailability');
const { bookAppointment } = require('./bookAppointment');
const moment = require('moment-timezone');

async function createRecurringAppointments(initialDate, startTime, fname, lname, phone, email, appointmentType, appointmentDuration, group, price, addOnArray, recurrenceRule) {
    console.log('Initial Date:', initialDate);
    console.log('Start Time:', startTime);
    console.log('Appointment Duration:', appointmentDuration);
    console.log('Group:', group);
    console.log('Recurrence Rule:', JSON.stringify(recurrenceRule, null, 2));

    const bookedAppointments = [];
    let currentDate = moment(initialDate);
    const endDate = moment(initialDate).add(1, 'year');
    const startDate = moment(initialDate);

    while (currentDate.isSameOrBefore(endDate)) {
        if (matchesRecurrenceRule(currentDate, recurrenceRule, startDate)) {
            const formattedDate = currentDate.format('YYYY-MM-DD');
            console.log('Processing date:', formattedDate);
            const availability = await getAvailability(formattedDate, appointmentDuration, group);
            
            if (typeof availability === 'string') {
                return availability;
            } else {
                console.log('Availability:', availability);
                
                const isSlotAvailable = availability.some(slot => {
                    const slotStart = moment(`${formattedDate} ${slot.startTime}`, 'YYYY-MM-DD HH:mm');
                    const slotEnd = moment(`${formattedDate} ${slot.endTime}`, 'YYYY-MM-DD HH:mm');
                    const appointmentStart = moment(`${formattedDate} ${startTime}`, 'YYYY-MM-DD HH:mm');
                    const appointmentEnd = appointmentStart.clone().add(appointmentDuration, 'minutes');

                    return appointmentStart.isSameOrAfter(slotStart) && appointmentEnd.isSameOrBefore(slotEnd);
                });

                if (isSlotAvailable) {
                    try {
                        console.log('Booking appointment for', formattedDate, startTime);
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
                        }
                    } catch (error) {
                        console.error(`Error booking appointment for ${formattedDate}:`, error);
                    }
                } else {
                    console.log(`No availability for ${formattedDate} at ${startTime}`);
                }
            }
        }
        currentDate.add(1, 'day');
    }

    return bookedAppointments;
}

function matchesRecurrenceRule(date, recurrenceRule, startDate) {
    // Process the initial date
    if (date.isSame(startDate, 'day')) {
        return true;
    }

    const interval = recurrenceRule.interval || 1;

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
                const lastDayOfMonth = date.clone().endOf('month');
                const lastWeekNumber = Math.ceil(lastDayOfMonth.date() / 7);

                if (recurrenceRule.weekOfMonth === 5 && weekOfMonth === lastWeekNumber) {
                    // Handle the case when 5th week is requested but month only has 4 weeks
                    return date.day() === recurrenceRule.dayOfWeek;
                } else {
                    return date.day() === recurrenceRule.dayOfWeek && 
                           weekOfMonth === recurrenceRule.weekOfMonth;
                }
            }
            return false;
        default:
            throw new Error('Invalid recurrence rule');
    }
}

// Example function call
// async function exampleRecurringAppointments() {
//   const initialDate = '2025-01-08';
//   const startTime = '09:00';
//   const fname = 'Adam';
//   const lname = 'Nomani';
//   const phone = '+12038324011';
//   const email = 'nomaniadam@gmail.com';
//   const appointmentType = 'Adult Cut';
//   const appointmentDuration = 30; // minutes
//   const group = 1;
//   const price = 75;
//   const addOnArray = [];
//   const recurrenceRule = {
//     type: 'weekly',
//     interval: 2, // Every 3 months
//     dayOfWeek: 3
//   };

//   try {
//     const bookedAppointments = await createRecurringAppointments(
//       initialDate,
//       startTime,
//       fname,
//       lname,
//       phone,
//       email,
//       appointmentType,
//       appointmentDuration,
//       group,
//       price,
//       addOnArray,
//       recurrenceRule
//     );

//     console.log('Booked appointments:', bookedAppointments);
//   } catch (error) {
//     console.error('Error creating recurring appointments:', error);
//   }
// }

// // Call the example function
// exampleRecurringAppointments();

module.exports = { createRecurringAppointments };