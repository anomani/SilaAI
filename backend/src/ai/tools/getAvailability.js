const dotenv = require('dotenv')
dotenv.config({path : '../../../.env'})
const {getAppointmentsByDay} = require('../../model/appointment')
const { getAppointmentTypes, getAddOns } = require('../../model/appTypes');

async function getAvailability(day, appointmentType, addOnArray, userId, clientId = null) {
    console.log("Day:", day);
    console.log("Appointment Type:", appointmentType);
    console.log("Add-ons:", addOnArray);
    console.log("User ID:", userId);
    // Fetch appointment types and add-ons from the database
    const appointmentTypes = await getAppointmentTypes(userId);
    const addOns = await getAddOns(userId);

    // Find the requested appointment type
    const appointmentTypeInfo = appointmentTypes.find(type => type.name === appointmentType);
    if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type: ${appointmentType}`);
    }
    
    const duration = calculateTotalDuration(appointmentTypeInfo, addOns);
    console.log("Duration:", duration);
    try {
        const date = new Date(day);
        const dayName = getDayName(date.getDay());
        console.log("Day of Week:", dayName);

        // Use the availability object directly, no need to parse
        const availability = appointmentTypeInfo.availability;

        // Get the availability for the specific day of the week
        const dayAvailability = availability[dayName];
        if (!dayAvailability || dayAvailability.length === 0) {
            return [];
        }

        const appointments = await getAppointmentsByDay(userId, day);
        const availableSlots = [];

        const now = new Date();
        const isToday = now.toDateString() === date.toDateString();

        for (const slot of dayAvailability) {
            const [start, end] = slot.split('-');
            const startOfSlot = new Date(`${day}T${start}`);
            const endOfSlot = new Date(`${day}T${end}`);
            let currentTime = isToday ? new Date(Math.max(startOfSlot, now)) : startOfSlot;
            console.log("Current Time:", currentTime);
            for (let i = 0; i <= appointments.length; i++) {
                const appointment = appointments[i];
                if (clientId && appointment && appointment.clientId === clientId) {
                    // Skip this appointment if it belongs to the current client
                    console.log("skipping appointment")
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
        console.log("Available Slots:", availableSlots);
        return availableSlots;
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
}

function getDayName(dayIndex) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
}

async function getAvailabilityCron(day, appointmentType, addOnArray, userId, clientId = null) {
    console.log("Day:", day);
    console.log("Appointment Type:", appointmentType);
    console.log("Add-ons:", addOnArray);
    
    // Fetch appointment types and add-ons from the database
    const appointmentTypes = await getAppointmentTypes(userId);
    const addOns = await getAddOns(userId);

    // Find the requested appointment type
    const appointmentTypeInfo = appointmentTypes.find(type => type.name === appointmentType);
    if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type: ${appointmentType}`);
    }
    
    console.log("Appointment Type Info:", JSON.stringify(appointmentTypeInfo, null, 2));

    const duration = calculateTotalDuration(appointmentTypeInfo, addOnArray, addOns);

    try {
        const date = new Date(day);
        const dayName = getDayName(date.getDay());
        console.log("Day of Week:", dayName);

        // Use the availability object directly
        const availability = appointmentTypeInfo.availability;

        // Get the availability for the specific day of the week
        const dayAvailability = availability[dayName];
        if (!dayAvailability || dayAvailability.length === 0) {
            return {date: day, availableSlots: []};
        }

        const appointments = await getAppointmentsByDay(userId, day);
        const availableSlots = [];

        const now = new Date();
        const isToday = now.toDateString() === date.toDateString();

        for (const slot of dayAvailability) {
            const [start, end] = slot.split('-');
            const startOfSlot = new Date(`${day}T${start}`);
            const endOfSlot = new Date(`${day}T${end}`);
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
        return {date: day, availableSlots: availableSlots};
    } catch (error) {
        console.error("Error:", error);
        return {date: day, availableSlots: []};
    }
}

function calculateTotalDuration(appointmentTypeInfo, addOnArray, allAddOns) {
    const appointmentDuration = appointmentTypeInfo.duration;
    const addOnsDuration = addOnArray.reduce((total, addOnName) => {
        const addOn = allAddOns.find(a => a.name === addOnName);
        return total + (addOn ? addOn.duration : 0);
    }, 0);
    return appointmentDuration + addOnsDuration;
}

function getCurrentDate() {
    const now = new Date();
    now.setHours(now.getHours() - 4);
    const dateTimeString = now.toLocaleString();
    return dateTimeString;
}


async function findNextAvailableSlots(startDay, appointmentType, addOnArray, userId, numberOfSlots = 5) {
    console.log("Finding next available slots:", { startDay, appointmentType, addOnArray, userId, numberOfSlots });

    // Fetch appointment types and add-ons from the database
    const appointmentTypes = await getAppointmentTypes(userId);
    const addOns = await getAddOns(userId);

    // Find the requested appointment type
    const appointmentTypeInfo = appointmentTypes.find(type => type.name === appointmentType);
    if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type: ${appointmentType}`);
    }

    const duration = calculateTotalDuration(appointmentTypeInfo, addOnArray, addOns);

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

    console.log("Found available slots:", availableSlots);
    return availableSlots;
}



async function getTimeSlots(userId, day, appointmentTypeId, addOnIds) {
    console.log("Getting time slots for:", { userId, day, appointmentTypeId, addOnIds });
    
    // Fetch appointment types and add-ons from the database
    const appointmentTypes = await getAppointmentTypes(userId);
    const allAddOns = await getAddOns(userId);

    // Find the requested appointment type by ID
    const appointmentTypeInfo = appointmentTypes.find(type => type.id === parseInt(appointmentTypeId));
    if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type ID: ${appointmentTypeId}`);
    }

    // Filter selected add-ons
    const selectedAddOns = allAddOns.filter(addOn => addOnIds.includes(addOn.id));

    // Calculate the total duration of the appointment including selected add-ons
    const duration = calculateTotalDuration(appointmentTypeInfo, selectedAddOns);

    // Get the availability ranges
    const availabilityRanges = await getAvailability(day, appointmentTypeInfo.name, selectedAddOns, userId);

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

    console.log("Available time slots:", timeSlots);
    return timeSlots;
}

function calculateTotalDuration(appointmentTypeInfo, selectedAddOns) {
    console.log("Selected Add-ons:", selectedAddOns);
    const appointmentDuration = appointmentTypeInfo.duration;
    console.log("Appointment Duration:", appointmentDuration);
    const addOnsDuration = selectedAddOns.reduce((total, addOn) => total + addOn.duration, 0);
    console.log("Add-ons Duration:", addOnsDuration);
    return appointmentDuration + addOnsDuration;
}

// Don't forget to export the new function
module.exports = {
  getAvailability,
  getCurrentDate,
  findNextAvailableSlots,
  getAvailabilityCron,
  getTimeSlots
};
