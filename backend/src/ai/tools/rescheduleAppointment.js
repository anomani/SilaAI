const axios = require('axios');
const dotenv = require('dotenv');
const moment = require('moment-timezone');
dotenv.config({path : '../../../.env'});
const {getClientByPhoneNumber} = require('../../model/clients');
const {getAppointmentsByDay, rescheduleAppointment} = require('../../model/appointment');
const { appointmentTypes, addOns } = require('../../model/appointmentTypes');
const { isAppointmentAvailable, addMinutes, isAfter } = require('./bookAppointment');
const { getAvailability } = require('./getAvailability');

async function rescheduleAppointmentByPhoneAndDate(phoneNumber, currentDate, newDate, newStartTime) {
    try {
        const client = await getClientByPhoneNumber(phoneNumber);
        if (!client) {
            return "Client not found";
        }

        const appointmentsForDay = await getAppointmentsByDay(currentDate);
        const appointment = appointmentsForDay.find(appt => appt.clientid === client.id);
        if (!appointment) {
            return "Appointment not found";
        }

        const appointmentType = appointment.appointmenttype;
        const addOnArray = appointment.addOns || [];

        const appointmentTypeInfo = appointmentTypes[appointmentType];
        if (!appointmentTypeInfo) {
            throw new Error(`Invalid appointment type: ${appointmentType}`);
        }

        const addOnInfo = addOnArray.map(addon => addOns[addon]);
        const totalDuration = appointmentTypeInfo.duration + addOnInfo.reduce((sum, addon) => sum + addon.duration, 0);

        const newEndTime = addMinutes(newStartTime, totalDuration);

        // Check availability
        const availability = await getAvailability(newDate, appointmentType, addOnArray);
        const availabilityCheck = isAppointmentAvailable(availability, newStartTime, newEndTime);
        
        if (availabilityCheck !== "Available") {
            return availabilityCheck;
        }

        const updatedAppointment = await rescheduleAppointment(appointment.id, newDate, newStartTime, newEndTime);
        return updatedAppointment;
    } catch (error) {
        console.error("Error rescheduling appointment:", error);
        return "Unable to reschedule the appointment";
    }
}

async function main() {
    const a = await rescheduleAppointmentByPhoneAndDate('+12038324011', '2024-08-15', '2024-08-06', '09:45');
    console.log(a);
}

main();
module.exports = {rescheduleAppointmentByPhoneAndDate};