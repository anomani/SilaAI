const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../../.env'})
const {getAppointmentsByDay} = require('../../model/appointment')


async function getAvailability(day, duration, group, clientId = null) {
    console.log("Day:", day);
    console.log("Duration:", duration);
    console.log("Group:", group);
    try {
        const date = new Date(day);
        const dayOfWeek = date.getDay();
        console.log(dayOfWeek)
        if (dayOfWeek === 0 || dayOfWeek === 1) {
            return `I don't take appointments on ${dayOfWeek === 0 ? 'Sunday' : 'Monday'}`;
        }
        const groupAvailability = getGroupAvailability(group, dayOfWeek);
        if (!groupAvailability) {
            return "No availability for this group on the selected day";
        }

        const appointments = await getAppointmentsByDay(day);
        const availableSlots = [];

        const now = new Date();
        const isToday = now.toDateString() === date.toDateString();

        for (const slot of groupAvailability) {
            const startOfSlot = new Date(`${day}T${slot.start}`);
            const endOfSlot = new Date(`${day}T${slot.end}`);
            let currentTime = isToday ? new Date(Math.max(startOfSlot, now)) : startOfSlot;

            for (let i = 0; i <= appointments.length; i++) {
                const appointment = appointments[i];
                if (clientId && appointment && appointment.clientId === clientId) {
                    // Skip this appointment if it belongs to the current client
                    continue;
                }

                const appointmentStart = i < appointments.length ? new Date(`${appointments[i].date}T${appointments[i].starttime}`) : endOfSlot;
                const appointmentEnd = i < appointments.length ? new Date(`${appointments[i].date}T${appointments[i].endtime}`) : endOfSlot;

                if (currentTime < appointmentStart && (appointmentStart - currentTime) >= duration * 60000 && currentTime < endOfSlot) {
                    const slotEndTime = new Date(Math.min(appointmentStart, endOfSlot));
                    const slotDuration = slotEndTime - currentTime;
                    
                    if (slotDuration >= duration * 60000) {
                        availableSlots.push({
                            startTime: new Date(currentTime).toTimeString().slice(0, 5),
                            endTime: slotEndTime.toTimeString().slice(0, 5)
                        });
                    }
                }

                currentTime = appointmentEnd > currentTime ? appointmentEnd : currentTime;
                if (currentTime >= endOfSlot) break;
            }
        }

        return availableSlots;
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
}

function getGroupAvailability(group, dayOfWeek) {
    const availabilityMap = {
        1: {
            2: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }], // Tuesday
            3: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }], // Wednesday
            4: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }], // Thursday
            5: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '15:30', end: '16:00' }], // Friday
            6: [{ start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }] // Saturday
        },
        2: {
            2: [{ start: '15:00', end: '18:00' }], // Tuesday
            3: [{ start: '15:00', end: '18:00' }], // Wednesday
            4: [{ start: '15:00', end: '17:00' }], // Thursday
            5: [{ start: '16:00', end: '17:00' }], // Friday
            6: [{ start: '15:00', end: '17:00' }]  // Saturday
        },
        3: {
            3: [{ start: '18:00', end: '19:00' }], // Wednesday
            4: [{ start: '18:00', end: '19:00' }], // Thursday
            5: [{ start: '18:00', end: '19:00' }], // Friday
            6: [{ start: '18:00', end: '19:00' }]  // Saturday
        }
    };

    return availabilityMap[group] ? availabilityMap[group][dayOfWeek] : null;
}


function getCurrentDate() {
    const now = new Date();
    now.setHours(now.getHours() - 4);
    const dateTimeString = now.toLocaleString();
    return dateTimeString;
}

module.exports = {getAvailability, getCurrentDate}