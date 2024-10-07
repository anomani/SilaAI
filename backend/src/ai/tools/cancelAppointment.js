const dotenv = require('dotenv')
dotenv.config({path : '../../../.env'})
const {getClientByPhoneNumber, getClientById} = require ('../../model/clients') 
const {deleteAppointment, getAppointmentsByDay} = require ('../../model/appointment')
const axios = require('axios');


async function cancelAcuityAppointment(acuityId) {
    try {
        const response = await axios.put(
            `https://acuityscheduling.com/api/v1/appointments/${acuityId}/cancel`,
            {},
            {
                auth: {
                    username: process.env.ACUITY_USER_ID,
                    password: process.env.ACUITY_API_KEY
                },
                params: {
                    admin: true,
                    noEmail: true
                }
            }
        );
        return response.status === 200;
    } catch (error) {
        console.error('Error cancelling Acuity appointment:', error);
        throw error;
    }
}

async function cancelAppointment(phoneNumber, date, userId) {
    const client = await getClientByPhoneNumber(phoneNumber, userId)
    const appointmentsForDay = await getAppointmentsByDay(date, userId)
    const appointment = appointmentsForDay.find(appointment => appointment.clientid === client.id)

    try {
        if (!appointment) {
            return "Appointment not found"
        }

        acuity_id = appointment.acuityid 
        
        const acuityCancelled = await cancelAcuityAppointment(acuity_id);

        if (acuityCancelled) {
            // await deleteAppointment(appointment.id);
            return appointment;
        } else {
            throw new Error('Failed to cancel appointment in Acuity');
        }
    } catch (error) {
        console.log("Deleting from database")
        try{
            await deleteAppointment(appointment.id);
            return "Appointment cancelled"
        } catch (error) {
            console.log("Error deleting from database")
            throw error;
        }
    } 
}

async function cancelAppointmentById(clientId, date, userId) {
    try {
        const client = await getClientById(clientId);
        if (!client) {
            return "Client not found";
        }

        const appointmentsForDay = await getAppointmentsByDay(date, userId);
        console.log(appointmentsForDay);
        const appointment = appointmentsForDay.find(appointment => appointment.clientid === clientId);
        if (!appointment) {
            return "Appointment not found";
        }
        const acuity_id = appointment.acuityid;
        
        const acuityCancelled = await cancelAcuityAppointment(acuity_id);

        if (acuityCancelled) {
            await deleteAppointment(appointment.id);
            return appointment;
        } else {
            throw new Error('Failed to cancel appointment in Acuity');
        }
    } catch (error) {
        console.log(error);
        return "Unable to cancel the appointment";
    } 
}

async function cancelAppointmentInternal(phoneNumber, date, userId) {
    const client = await getClientByPhoneNumber(phoneNumber, userId)
    const appointmentsForDay = await getAppointmentsByDay(date, userId)
    const appointment = appointmentsForDay.find(appointment => appointment.clientid === client.id)

    if (!appointment) {
        return "Appointment not found"
    }

    try {
        await deleteAppointment(appointment.id);
        return "Appointment cancelled successfully";
    } catch (error) {
        console.error("Error cancelling appointment:", error);
        throw error;
    }
}

async function cancelAppointmentByIdInternal(clientId, date, userId) {
    try {
        const client = await getClientById(clientId);
        if (!client) {
            return "Client not found";
        }

        const appointmentsForDay = await getAppointmentsByDay(date, userId);
        const appointment = appointmentsForDay.find(appointment => appointment.clientid === clientId);
        if (!appointment) {
            return "Appointment not found";
        }

        await deleteAppointment(appointment.id);
        return "Appointment cancelled successfully";
    } catch (error) {
        console.error("Error cancelling appointment:", error);
        return "Unable to cancel the appointment";
    } 
}

module.exports = {
    cancelAppointment,
    cancelAcuityAppointment,
    cancelAppointmentById,
    cancelAppointmentInternal,
    cancelAppointmentByIdInternal
}