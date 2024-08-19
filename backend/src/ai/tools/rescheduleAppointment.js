const axios = require('axios');
const dotenv = require('dotenv');
const moment = require('moment-timezone');
dotenv.config({path : '../../../.env'});
const {getClientByPhoneNumber} = require('../../model/clients');
const {getAppointmentsByDay, rescheduleAppointment} = require('../../model/appointment');
const { appointmentTypes, addOns } = require('../../model/appointmentTypes');
const { isAppointmentAvailable, addMinutes, isAfter } = require('./bookAppointment');
const { getAvailability } = require('./getAvailability');

async function rescheduleAppointmentWithAcuity(appointmentId, newDate, newStartTime) {
    const acuityApiUrl = `https://acuityscheduling.com/api/v1/appointments/${appointmentId}/reschedule`;
    const auth = {
        username: process.env.ACUITY_USER_ID,
        password: process.env.ACUITY_API_KEY
    };

    const timezone = 'America/New_York';
    const datetime = moment.tz(`${newDate} ${newStartTime}`, timezone).format();

    const rescheduleData = {
        datetime: datetime,
    };

    try {
        const response = await axios.put(acuityApiUrl, rescheduleData, { 
            auth,
            params: {
                admin: true,
                noEmail: true
            }
        });
        console.log('Appointment rescheduled successfully with Acuity');
        return response.data;
    } catch (error) {
        console.error('Error rescheduling appointment with Acuity:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function rescheduleAppointmentByPhoneAndDate(phoneNumber, currentDate, newDate, newStartTime) {
    try {
        console.log("Current Date:", currentDate);
        console.log("New Date:", newDate);
        console.log("New Start Time:", newStartTime);
        const client = await getClientByPhoneNumber(phoneNumber);
        if (!client) {
            return "Client not found";
        }

        const appointmentsForDay = await getAppointmentsByDay(currentDate);
        const appointment = appointmentsForDay.find(appt => appt.clientid === client.id);
        if (!appointment) {
            return "Appointment not found";
        }

        let appointmentType = appointment.appointmenttype;
        // Parse appointment type and add-ons
        const appointmentParts = appointmentType.split('+').map(part => part.trim());
        const parsedAppointmentType = appointmentParts[0];
        // Update appointmentType and addOnArray
        appointmentType = parsedAppointmentType;
        console.log(appointmentType)

        // Update addOnArray with the rest of appointmentParts
        const addOnArray = [];
        if (appointmentParts.length > 1) {
            addOnArray.push(...appointmentParts.slice(1));
        }

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

        // Reschedule with Acuity
        const acuityResponse = await rescheduleAppointmentWithAcuity(appointment.acuityid, newDate, newStartTime);

        await rescheduleAppointment(appointment.id, newDate, newStartTime, newEndTime);
        
        return "Appointment rescheduled successfully"
    } catch (error) {
        console.error("Error rescheduling appointment:", error);
        return "Unable to reschedule the appointment";
    }
}
async function main() {
    await rescheduleAppointmentByPhoneAndDate('+12038324011', '2024-08-20', '2024-08-25', '10:00');
}
main()
module.exports = {rescheduleAppointmentByPhoneAndDate};