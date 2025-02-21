const { createAppointment, deleteAppointment, findAppointmentByClientAndTime, findAndUpdateAppointmentByAcuityId } = require('../model/appointment');
const { getClientByPhoneNumber, createClient } = require('../model/clients');
const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { getUserByCalendarID, getUserById } = require('../model/users');
async function handleWebhook(req, res) {
    try {
        // const body = JSON.stringify(req.body);
        // var hasher = crypto.createHmac('sha256', secret);
        // hasher.update(buf.toString());
        // var hash = hasher.digest('base64');
        
        // // Compare hash to Acuity signature:
        // if (hash !== req.header('x-acuity-signature')) {
        //     throw new Error('This message was forged!');
        // }
        console.log(req.body)
        const { action, id: appointmentId, calendarID } = req.body;
        console.log("Action:", action);
        console.log("Appointment ID:", appointmentId);
        console.log("Calendar ID:", calendarID);
        const user = await getUserByCalendarID(calendarID);
        console.log("User:", user);
        const appointmentDetails = await fetchAppointmentDetails(appointmentId, user);
        switch (action) {
            case 'scheduled':
                await handleScheduledAppointment(appointmentDetails, user.id);
                break;
            case 'canceled':
                await handleCanceledAppointment(appointmentDetails, user.id);
                break;
            case 'rescheduled':
                await handleRescheduledAppointment(appointmentDetails, user.id);
                break;
            default:
                console.log(`Received unhandled action: ${action}`);
        }

        res.status(200).send('Webhook processed successfully');
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Error processing webhook');
    }
}

async function handleScheduledAppointment(appointmentDetails, userId) {
    console.log("Handling scheduled appointment")
    console.log("Appointment Details:", appointmentDetails)
    console.log("User ID:", userId)
    const client = await getOrCreateClient(appointmentDetails, userId);
    const { date, startTime, endTime } = parseAppointmentDateTime(appointmentDetails);
    let appointmentType = appointmentDetails.type;
    let addOnArray = [];

    // Check if appointment contains "Lineup + Taper"
    if (appointmentType.includes('Lineup + Taper')) {
        // Split the string at "Lineup + Taper"
        const parts = appointmentType.split('Lineup + Taper');
        appointmentType = 'Lineup + Taper';
        
        // If there are additional services (will be in parts[1])
        if (parts[1]) {
            // Remove leading/trailing + signs and spaces, then split remaining services
            const additionalServices = parts[1].replace(/^\s*\+\s*|\s*\+\s*$/g, '');
            if (additionalServices) {
                addOnArray = additionalServices.split('+').map(service => service.trim());
            }
        }
    } else {
        // Original logic for other appointment types
        const appointmentParts = appointmentType.split('+').map(part => part.trim());
        appointmentType = appointmentParts[0];
        if (appointmentParts.length > 1) {
            addOnArray.push(...appointmentParts.slice(1));
        }
    }

    await createAppointment(
        appointmentType,
        appointmentDetails.id,
        date,
        startTime,
        endTime,
        client.id,
        JSON.stringify({
            email: appointmentDetails.email,
            phone: appointmentDetails.phone,
            dateCreated: appointmentDetails.dateCreated,
            datetimeCreated: appointmentDetails.datetimeCreated
        }),
        appointmentDetails.price,
        false,
        0,
        null,
        addOnArray,
        userId
    );
    console.log("Appointment created successfully");
}

async function handleCanceledAppointment(appointmentDetails, userId) {
    const client = await getClientByPhoneNumber(appointmentDetails.phone, userId);
    if (!client) {
        throw new Error('Client not found');
    }

    console.log("Client:", client);
    const { date, startTime } = parseAppointmentDateTime(appointmentDetails);
    console.log("Date:", date);
    console.log("Start Time:", startTime);
    const appointmentToDelete = await findAppointmentByClientAndTime(client.id, date, startTime);
    if (appointmentToDelete) {
        await deleteAppointment(appointmentToDelete.id);
        console.log("Appointment deleted successfully:", appointmentToDelete);
    } else {
        console.log("Appointment not found in our database");
    }
}

async function handleRescheduledAppointment(appointmentDetails, userId) {
    const { date, startTime, endTime } = parseAppointmentDateTime(appointmentDetails);
    
    const updatedAppointment = await findAndUpdateAppointmentByAcuityId(
        appointmentDetails.id,
        {
            date,
            startTime,
            endTime,
            appointmentType: appointmentDetails.type,
            clientId: (await getOrCreateClient(appointmentDetails, userId)).id,
            details: JSON.stringify({
                email: appointmentDetails.email,
                phone: appointmentDetails.phone,
                dateCreated: appointmentDetails.dateCreated,
                datetimeCreated: appointmentDetails.datetimeCreated
            }),
            price: appointmentDetails.price
        }
    );

    if (updatedAppointment) {
        console.log("Appointment rescheduled successfully:", updatedAppointment);
    } else {
        console.log("Appointment not found for rescheduling. Acuity ID:", appointmentDetails.id);
    }
}

async function getOrCreateClient(appointmentDetails, userId) {
    let client = await getClientByPhoneNumber(appointmentDetails.phone, userId);
    if (!client.id) {
        const clientId = await createClient(
            appointmentDetails.firstName,
            appointmentDetails.lastName,
            appointmentDetails.phone,
            appointmentDetails.email,
            '',  // notes field is empty for now
            userId
        );
        client = { id: clientId };
    }
    return client;
}

function parseAppointmentDateTime(appointmentDetails) {
    const date = new Date(appointmentDetails.date).toISOString().split('T')[0];
    const startTime = convertToMilitaryTime(appointmentDetails.time);
    const endTime = convertToMilitaryTime(appointmentDetails.endTime);
    return { date, startTime, endTime };
}

function convertToMilitaryTime(time) {
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours);
    if (time.includes('pm') && hour !== 12) {
        hour += 12;
    }
    return `${hour.toString().padStart(2, '0')}:${minutes.substring(0, 2)}`;
}

async function fetchAppointmentDetails(appointmentId, user) {
    const apiUrl = `https://acuityscheduling.com/api/v1/appointments/${appointmentId}`;
    const auth = Buffer.from(`${user.acuity_user_id}:${user.acuity_api_key}`).toString('base64');

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error fetching appointment details:', error);
        throw error;
    }
}

async function fetchAllAppointments(userId) {
    const user = await getUserById(userId);
    const apiUrl = 'https://acuityscheduling.com/api/v1/appointments';
    const auth = Buffer.from(`${user.acuity_user_id}:${user.acuity_api_key}`).toString('base64');
    let allAppointments = [];
    let minDate = null;
    const batchSize = 100; // Adjust this value as needed

    while (true) {
        try {
            const response = await axios.get(apiUrl, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    max: batchSize,
                    minDate: minDate,
                    direction: 'ASC'
                }
            });

            const appointments = response.data;
            allAppointments = allAppointments.concat(appointments);
            console.log(appointments[appointments.length - 1]);
            if (appointments.length < batchSize) {
                // We've reached the end of the appointments
                break;
            }

            // Set the minDate for the next batch
            minDate = appointments[appointments.length - 1].date;
            console.log(`Fetched ${allAppointments.length} appointments so far...`);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            throw error;
        }
    }

    console.log(`Total appointments fetched: ${allAppointments.length}`);
    return allAppointments;
}

async function migrateAppointments(userId) {
    try {
        const appointments = await fetchAllAppointments(userId);
        console.log(`Starting migration of ${appointments.length} appointments...`);
        
        for (const appointment of appointments) {
            const { date, startTime, endTime } = parseAppointmentDateTime(appointment);
            const client = await getOrCreateClient(appointment, userId);
            await createAppointment(
                appointment.type,
                appointment.id,
                date,
                startTime,
                endTime,
                client.id,
                JSON.stringify({
                    email: appointment.email,
                    phone: appointment.phone,
                    dateCreated: appointment.dateCreated,
                    datetimeCreated: appointment.datetimeCreated
                }),
                appointment.price,
                false,
                0,
                null,
                [],
                userId
            );
        }
        console.log("All appointments migrated successfully");
    } catch (error) {
        console.error("Error migrating appointments:", error);
    }
}

// async function main() {
//     await migrateAppointments(67);
//     console.log("Migration complete");
// }

// main()
module.exports = { handleWebhook, migrateAppointments };
