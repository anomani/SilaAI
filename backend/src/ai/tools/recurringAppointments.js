const { getAvailability } = require('./getAvailability');
const { bookAppointment } = require('./bookAppointment');
const moment = require('moment-timezone');

async function createRecurringAppointments(initialDate, startTime, fname, lname, phone, email, appointmentType, appointmentDuration, group, price, addOnArray, recurrenceInterval, numberOfRecurrences) {
    const bookedAppointments = [];
    let currentDate = moment(initialDate);

    for (let i = 0; i < numberOfRecurrences; i++) {
        if (i > 0) {
            currentDate = currentDate.add(recurrenceInterval.amount, recurrenceInterval.unit);
        }

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
            break;
        }
    }

    return bookedAppointments;
}


async function main() {
    const initialDate = "2024-09-03";
    const startTime = "09:00";
    const fname = "Adam";
    const lname = "Nomani";
    const phone = "2038324011";
    const email = "nomaniadam@gmail.com";
    const appointmentType = "haircut";
    const appointmentDuration = 30;
    const group = 1;
    const price = 100;
    const addOnArray = [];
    const recurrenceInterval = { amount: 2, unit: "weeks" };
    const numberOfRecurrences = 278;
}

module.exports = { createRecurringAppointments };
