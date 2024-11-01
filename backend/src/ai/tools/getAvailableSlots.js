const dotenv = require('dotenv')
dotenv.config({path : '../../../.env'})
const {getAppointmentsByDay} = require('../../model/appointment')


async function getAvailableSlots(startDate, endDate, userId) {
    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);

    const availableSlots = [];
    let currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);

    while (currentDate <= endDateObj) {
        const dayString = currentDate.toISOString().split('T')[0];
        const dayAvailability = await getAllAvailableSlotsForDay(dayString, userId);

        if (dayAvailability.length > 0) {
            // Group slots by their group number
            const slotsByGroup = dayAvailability.reduce((acc, slot) => {
                const group = determineGroup(slot.startTime);
                if (!acc[group]) {
                    acc[group] = [];
                }
                acc[group].push(slot);
                return acc;
            }, {});

            availableSlots.push({
                date: dayString,
                slotsByGroup
            });
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableSlots;
}

// async function machine() {
//     const availableSlots = await getAvailableSlots('2024-09-18', '2024-09-25');
//     console.log(JSON.stringify(availableSlots, null, 2));
// }

// machine()

async function getAllAvailableSlotsForDay(day, userId) {
    const date = new Date(day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 1) {
        // No availability on Sundays and Mondays
        return [];
    }

    const allGroupAvailability = getAllGroupAvailability(dayOfWeek);
    if (!allGroupAvailability || allGroupAvailability.length === 0) {
        // No group availability for the day
        return [];
    }

    const appointments = await getAppointmentsByDay(userId, day);
    // Sort appointments by start time
    appointments.sort((a, b) => new Date(`${day}T${a.starttime}`) - new Date(`${day}T${b.starttime}`));

    const availableSlots = [];
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();

    for (const slot of allGroupAvailability) {
        const slotStart = new Date(`${day}T${slot.start}`);
        const slotEnd = new Date(`${day}T${slot.end}`);
        
        // If the day is today, ensure the slot starts from the current time
        let currentStart = isToday ? new Date(Math.max(slotStart, now)) : slotStart;

        // Iterate through all appointments to find gaps
        for (const appt of appointments) {
            const apptStart = new Date(`${day}T${appt.starttime}`);
            const apptEnd = new Date(`${day}T${appt.endtime}`);

            // If the appointment is before the current slot, skip
            if (apptEnd <= currentStart) {
                continue;
            }

            // If the appointment starts after the slot ends, no overlap
            if (apptStart >= slotEnd) {
                break;
            }

            // If there's a gap between currentStart and appointment start
            if (apptStart > currentStart) {
                const duration = (apptStart - currentStart) / (1000 * 60); // duration in minutes
                if (duration >= 30) {
                    availableSlots.push({
                        startTime: currentStart.toTimeString().slice(0, 5),
                        endTime: apptStart.toTimeString().slice(0, 5)
                    });
                }
            }

            // Move currentStart to the end of the current appointment
            if (apptEnd > currentStart) {
                currentStart = apptEnd;
            }
        }

        // After processing all appointments, check if there's remaining time in the slot
        if (currentStart < slotEnd) {
            const duration = (slotEnd - currentStart) / (1000 * 60); // duration in minutes
            if (duration >= 30) {
                availableSlots.push({
                    startTime: currentStart.toTimeString().slice(0, 5),
                    endTime: slotEnd.toTimeString().slice(0, 5)
                });
            }
        }
    }

    return availableSlots;
}

function getAllGroupAvailability(dayOfWeek) {
    const allGroups = [1, 2]; // Removed group 3
    let allSlots = [];

    for (const group of allGroups) {
        const groupSlots = getGroupAvailability(group, dayOfWeek);
        if (groupSlots) {
            allSlots = [...allSlots, ...groupSlots];
        }
    }

    // Merge overlapping slots
    allSlots.sort((a, b) => a.start.localeCompare(b.start));
    const mergedSlots = [];
    for (const slot of allSlots) {
        if (mergedSlots.length === 0 || slot.start > mergedSlots[mergedSlots.length - 1].end) {
            mergedSlots.push(slot);
        } else {
            mergedSlots[mergedSlots.length - 1].end = 
                slot.end > mergedSlots[mergedSlots.length - 1].end ? slot.end : mergedSlots[mergedSlots.length - 1].end;
        }
    }

    return mergedSlots;
}

function getGroupAvailability(group, dayOfWeek) {
    const availabilityMap = {
        1: {
            2: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }],
            3: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }],
            4: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }],
            5: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '15:30', end: '16:00' }],
            6: [{ start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }]
        },
        2: {
            2: [{ start: '15:00', end: '18:00' }],
            3: [{ start: '15:00', end: '18:00' }],
            4: [{ start: '15:00', end: '17:00' }],
            5: [{ start: '16:00', end: '17:00' }],
            6: [{ start: '15:00', end: '17:00' }]
        },
        3: {
            3: [{ start: '18:00', end: '19:00' }],
            4: [{ start: '18:00', end: '19:00' }],
            5: [{ start: '18:00', end: '19:00' }],
            6: [{ start: '18:00', end: '19:00' }]
        }
    };
    return availabilityMap[group] ? availabilityMap[group][dayOfWeek] : null;
}

function determineGroup(startTime) {
    const hour = parseInt(startTime.split(':')[0], 10);
    if (hour < 15) return 1;
    return 2; // All slots after 15:00 are now group 2
}

module.exports = {getAvailableSlots};