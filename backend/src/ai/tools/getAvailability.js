const dotenv = require('dotenv')
dotenv.config({path : '../../../.env'})
const {getAppointmentsByDay} = require('../../model/appointment')
const { appointmentTypes, addOns } = require('../../model/appointmentTypes');

async function getAvailability(day, appointmentType, addOnArray, userId, clientId = null) {
    console.log("Day:", day);
    console.log("Appointment Type:", appointmentType);
    console.log("Add-ons:", addOnArray);
    
    const appointmentTypeInfo = appointmentTypes[appointmentType];
    if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type: ${appointmentType}`);
    }
    
    const group = appointmentTypeInfo.group;

    const duration = calculateTotalDuration(appointmentType, addOnArray);

    try {
        const date = new Date(day);
        const dayOfWeek = date.getDay();
        console.log("Day of Week:", dayOfWeek);
        if (dayOfWeek === 0 || dayOfWeek === 1) {
            return []
        }
        const groupAvailability = getGroupAvailability(group, dayOfWeek);
        if (!groupAvailability) {
            return []
        }

        const appointments = await getAppointmentsByDay(userId, day);
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
                if (currentTime < appointmentStart && (appointmentStart - currentTime) >= duration * 60000 && currentTime <= endOfSlot) {
                    console.log("slot is available")
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

async function getAvailabilityCron(day, appointmentType, addOnArray, userId, clientId = null) {
    console.log("Day:", day);
    console.log("Appointment Type:", appointmentType);
    console.log("Add-ons:", addOnArray);
    
    const appointmentTypeInfo = appointmentTypes[appointmentType];
    if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type: ${appointmentType}`);
    }
    
    const group = appointmentTypeInfo.group;
    console.log("Group:", group);

    const duration = calculateTotalDuration(appointmentType, addOnArray);

    try {
        const date = new Date(day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 1) {
            return []
        }
        const groupAvailability = getGroupAvailability(group, dayOfWeek);
        if (!groupAvailability) {
            return []
        }

        const appointments = await getAppointmentsByDay(userId, day);
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
                if (currentTime < appointmentStart && (appointmentStart - currentTime) >= duration * 60000 && currentTime <= endOfSlot) {
                    console.log("slot is available")
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
        console.log({date: day, availableSlots: availableSlots});
        return {date: day, availableSlots: availableSlots}
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
}
function calculateTotalDuration(appointmentType, addOnArray) {
    const appointmentDuration = appointmentTypes[appointmentType].duration;
    const addOnsDuration = addOnArray.reduce((total, addOn) => total + addOns[addOn].duration, 0);
    return appointmentDuration + addOnsDuration;
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


async function findNextAvailableSlots(startDay, appointmentType, addOnArray, userId, numberOfSlots = 5) {
  const appointmentTypeInfo = appointmentTypes[appointmentType];
  if (!appointmentTypeInfo) {
    throw new Error(`Invalid appointment type: ${appointmentType}`);
  }

  const duration = calculateTotalDuration(appointmentType, addOnArray);

  let currentDay = new Date(startDay);
  let availableSlots = [];
  let daysChecked = 0;

  while (availableSlots.length < numberOfSlots && daysChecked < 14) {
    const dayString = currentDay.toISOString().split('T')[0];
    const dayAvailability = await getAvailability(dayString, appointmentType, addOnArray, userId);
    
    if (Array.isArray(dayAvailability) && dayAvailability.length > 0) {
      for (const slot of dayAvailability) {
        availableSlots.push({
          date: dayString,
          ...slot
        });
        if (availableSlots.length >= numberOfSlots) break;
      }
    }

    currentDay.setDate(currentDay.getDate() + 1);
    daysChecked++;
  }

  return availableSlots;
}



async function getTimeSlots(userId, day, appointmentType, addOnArray) {

  // Calculate the total duration of the appointment
  const duration = calculateTotalDuration(appointmentType, addOnArray);

  // Get the availability ranges
  const availabilityRanges = await getAvailability(day, appointmentType, addOnArray, userId);

  const timeSlots = [];

  for (const range of availabilityRanges) {
    let currentTime = new Date(`${day}T${range.startTime}`);
    const endTime = new Date(`${day}T${range.endTime}`);

    while (currentTime.getTime() + duration * 60000 <= endTime.getTime()) {
      const slotEndTime = new Date(currentTime.getTime() + duration * 60000);
      timeSlots.push({
        startTime: currentTime.toTimeString().slice(0, 5),
        endTime: slotEndTime.toTimeString().slice(0, 5)
      });
      currentTime = slotEndTime;
    }
  }

  return timeSlots;
}


// Don't forget to export the new function
module.exports = {
  getAvailability,
  getCurrentDate,
  findNextAvailableSlots,
  getAvailabilityCron,
  getTimeSlots
};
