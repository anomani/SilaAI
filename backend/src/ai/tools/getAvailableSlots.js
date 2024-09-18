const { getAppointmentsByDay } = require('../../model/appointment');

// async function getAvailableSlots(startDate, endDate) {
//     console.log("Start Date:", startDate);
//     console.log("End Date:", endDate);

//     const availableSlots = [];
//     let currentDate = new Date(startDate);
//     const endDateObj = new Date(endDate);

//     while (currentDate <= endDateObj) {
//         const dayString = currentDate.toISOString().split('T')[0];
//         const dayAvailability = await getAllAvailableSlotsForDay(dayString);

//         if (dayAvailability.length > 0) {
//             availableSlots.push({
//                 date: dayString,
//                 slots: dayAvailability.map(slot => ({
//                     ...slot,
//                     group: determineGroup(slot.startTime)
//                 }))
//             });
//         }

//         currentDate.setDate(currentDate.getDate() + 1);
//     }

//     return availableSlots;
// }

// async function getAllAvailableSlotsForDay(day) {
//     const date = new Date(day);
//     const dayOfWeek = date.getDay();
//     if (dayOfWeek === 0 || dayOfWeek === 1) {
//         return [];
//     }

//     const allGroupAvailability = getAllGroupAvailability(dayOfWeek);
//     const appointments = await getAppointmentsByDay(day);
//     const availableSlots = [];

//     const now = new Date();
//     const isToday = now.toDateString() === date.toDateString();

//     for (const slot of allGroupAvailability) {
//         const startOfSlot = new Date(`${day}T${slot.start}`);
//         const endOfSlot = new Date(`${day}T${slot.end}`);
//         let currentTime = isToday ? new Date(Math.max(startOfSlot, now)) : startOfSlot;

//         while (currentTime < endOfSlot) {
//             const nextAppointment = appointments.find(appt => 
//                 new Date(`${day}T${appt.starttime}`) > currentTime
//             );

//             const slotEndTime = nextAppointment 
//                 ? new Date(Math.min(new Date(`${day}T${nextAppointment.starttime}`), endOfSlot))
//                 : endOfSlot;

//             if (slotEndTime > currentTime) {
//                 availableSlots.push({
//                     startTime: currentTime.toTimeString().slice(0, 5),
//                     endTime: slotEndTime.toTimeString().slice(0, 5)
//                 });
//             }

//             if (nextAppointment) {
//                 currentTime = new Date(`${day}T${nextAppointment.endtime}`);
//             } else {
//                 break;
//             }
//         }
//     }

//     return availableSlots;
// }

// function getAllGroupAvailability(dayOfWeek) {
//     const allGroups = [1, 2, 3];
//     let allSlots = [];

//     for (const group of allGroups) {
//         const groupSlots = getGroupAvailability(group, dayOfWeek);
//         if (groupSlots) {
//             allSlots = [...allSlots, ...groupSlots];
//         }
//     }

//     // Merge overlapping slots
//     allSlots.sort((a, b) => a.start.localeCompare(b.start));
//     const mergedSlots = [];
//     for (const slot of allSlots) {
//         if (mergedSlots.length === 0 || slot.start > mergedSlots[mergedSlots.length - 1].end) {
//             mergedSlots.push(slot);
//         } else {
//             mergedSlots[mergedSlots.length - 1].end = 
//                 slot.end > mergedSlots[mergedSlots.length - 1].end ? slot.end : mergedSlots[mergedSlots.length - 1].end;
//         }
//     }

//     return mergedSlots;
// }

// function getGroupAvailability(group, dayOfWeek) {
//     const availabilityMap = {
//         1: {
//             2: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }],
//             3: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }],
//             4: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }],
//             5: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '15:30', end: '16:00' }],
//             6: [{ start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }]
//         },
//         2: {
//             2: [{ start: '15:00', end: '18:00' }],
//             3: [{ start: '15:00', end: '18:00' }],
//             4: [{ start: '15:00', end: '17:00' }],
//             5: [{ start: '16:00', end: '17:00' }],
//             6: [{ start: '15:00', end: '17:00' }]
//         },
//         3: {
//             3: [{ start: '18:00', end: '19:00' }],
//             4: [{ start: '18:00', end: '19:00' }],
//             5: [{ start: '18:00', end: '19:00' }],
//             6: [{ start: '18:00', end: '19:00' }]
//         }
//     };
//     return availabilityMap[group] ? availabilityMap[group][dayOfWeek] : null;
// }

// function determineGroup(startTime) {
//     const hour = parseInt(startTime.split(':')[0], 10);
//     if (hour < 15) return 1;
//     if (hour < 18) return 2;
//     return 3;
// }

async function main() {
    const availableSlots = await getAppointmentsByDay('2024-07-27');
    console.log(availableSlots);
}

main()

module.exports = { };
