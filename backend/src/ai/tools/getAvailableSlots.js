const { getAvailability } = require('./getAvailability');
const { appointmentTypes } = require('../../model/appointmentTypes');

async function getAvailableSlots(startDate, endDate, appointmentType, addOnArray) {
    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);
    console.log("Appointment Type:", appointmentType);
    console.log("Add-ons:", addOnArray);

    const appointmentTypeInfo = appointmentTypes[appointmentType];
    if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type: ${appointmentType}`);
    }

    const availableSlots = [];
    let currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);

    while (currentDate <= endDateObj) {
        const dayString = currentDate.toISOString().split('T')[0];
        const dayAvailability = await getAvailability(dayString, appointmentType, addOnArray);

        if (Array.isArray(dayAvailability) && dayAvailability.length > 0) {
            availableSlots.push({
                date: dayString,
                slots: dayAvailability
            });
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableSlots;
}

module.exports = { getAvailableSlots };
