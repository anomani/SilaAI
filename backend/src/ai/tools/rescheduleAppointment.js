const axios = require('axios');
const dotenv = require('dotenv');
const moment = require('moment-timezone');
dotenv.config({path : '../../../.env'});
const {getClientByPhoneNumber} = require('../../model/clients');
const {getAppointmentsByDay, rescheduleAppointment} = require('../../model/appointment');
const { getUserById } = require('../../model/users');
const { appointmentTypes, addOns } = require('../../model/appointmentTypes');
const { isAppointmentAvailable, addMinutes, isAfter } = require('./bookAppointment');
const { getAvailability } = require('./getAvailability');

async function rescheduleAppointmentWithAcuity(appointmentId, newDate, newStartTime, userId) {
    const user = await getUserById(userId);
    const acuityApiUrl = `https://acuityscheduling.com/api/v1/appointments/${appointmentId}/reschedule`;
    const auth = {
        username: user.acuity_user_id,
        password: user.acuity_api_key
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
async function main() {
    const response = await rescheduleAppointmentByPhoneAndDate("+12038324011", "2025-01-20", "2025-01-20", "12:00", 1);
    console.log("response", response)
}
main();

async function rescheduleAppointmentByPhoneAndDate(phoneNumber, currentDate, newDate, newStartTime, userId) {
    try {
        console.log("Current Date:", currentDate);
        console.log("New Date:", newDate);
        console.log("New Start Time:", newStartTime);
        console.log("User ID:", userId);
        const client = await getClientByPhoneNumber(phoneNumber, userId);
        if (!client) {
            return "Client not found";
        }

        const appointmentsForDay = await getAppointmentsByDay(userId, currentDate);
        const appointment = appointmentsForDay.find(appt => appt.clientid === client.id);
        if (!appointment) {
            return "Appointment not found";
        }

        let appointmentType = appointment.appointmenttype;
        // Parse appointment type and add-ons
        console.log(appointmentType)
        const addOnArray = appointment.addons;
        console.log("addOnArray", addOnArray)

        const appointmentTypeInfo = appointmentTypes[appointmentType];
        if (!appointmentTypeInfo) {
            throw new Error(`Invalid appointment type: ${appointmentType}`);
        }

        const addOnInfo = addOnArray.map(addon => addOns[addon]);
        const totalDuration = appointmentTypeInfo.duration + addOnInfo.reduce((sum, addon) => sum + addon.duration, 0);

        const newEndTime = addMinutes(newStartTime, totalDuration);

        // Check availability
        const availability = await getAvailability(newDate, appointmentType, addOnArray, userId, client.id);
        const availabilityCheck = isAppointmentAvailable(availability, newStartTime, newEndTime);
        
        if (availabilityCheck !== "Available") {
            return availabilityCheck;
        }

        // Reschedule with Acuity
        const acuityResponse = await rescheduleAppointmentWithAcuity(appointment.acuityid, newDate, newStartTime, userId);

        await rescheduleAppointment(appointment.id, newDate, newStartTime, newEndTime);
        
        return "Appointment rescheduled successfully"
    } catch (error) {
        console.error("Error rescheduling appointment:", error);
        return "Unable to reschedule the appointment";
    }
}

async function rescheduleAppointmentByPhoneAndDateInternal(phoneNumber, currentDate, newDate, newStartTime, userId) {
    try {
        console.log("Current Date:", currentDate);
        console.log("New Date:", newDate);
        console.log("New Start Time:", newStartTime);
        console.log("User ID:", userId);
        const client = await getClientByPhoneNumber(phoneNumber, userId);
        if (!client) {
            return "Client not found";
        }

        const appointmentsForDay = await getAppointmentsByDay(userId, currentDate);
        const appointment = appointmentsForDay.find(appt => appt.clientid === client.id);
        if (!appointment) {
            return "Appointment not found";
        }

        let appointmentType = appointment.appointmenttype;

        console.log(appointmentType)

        const appointmentTypeInfo = appointmentTypes[appointmentType];
        if (!appointmentTypeInfo) {
            throw new Error(`Invalid appointment type: ${appointmentType}`);
        }
        const addOnArray = appointment.addons;
        const addOnInfo = addOnArray.map(addon => addOns[addon]);
        const totalDuration = appointmentTypeInfo.duration + addOnInfo.reduce((sum, addon) => sum + addon.duration, 0);

        const newEndTime = addMinutes(newStartTime, totalDuration);

        const availability = await getAvailability(newDate, appointmentType, addOnArray, userId, client.id);
        const availabilityCheck = isAppointmentAvailable(availability, newStartTime, newEndTime);
        
        if (availabilityCheck !== "Available") {
            return availabilityCheck;
        }

        await rescheduleAppointment(appointment.id, newDate, newStartTime, newEndTime);
        
        return "Appointment rescheduled successfully"
    } catch (error) {
        console.error("Error rescheduling appointment:", error);
        return "Unable to reschedule the appointment";
    }
}


module.exports = {rescheduleAppointmentByPhoneAndDate, rescheduleAppointmentByPhoneAndDateInternal};