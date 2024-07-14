const { createAppointment, deleteAppointment, findAppointmentByClientAndTime, findAndUpdateAppointmentByAcuityId } = require('../model/appointment');
const { getClientByPhoneNumber, createClient } = require('../model/clients');
const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });

async function handleWebhook(req, res) {
    try {
        const body = JSON.stringify(req.body);
        var hasher = crypto.createHmac('sha256', secret);
        hasher.update(buf.toString());
        var hash = hasher.digest('base64');
        
        // Compare hash to Acuity signature:
        if (hash !== req.header('x-acuity-signature')) {
            throw new Error('This message was forged!');
        }
        
        const { action, id: appointmentId } = req.body;
        const appointmentDetails = await fetchAppointmentDetails(appointmentId);

        switch (action) {
            case 'scheduled':
                await handleScheduledAppointment(appointmentDetails);
                break;
            case 'canceled':
                await handleCanceledAppointment(appointmentDetails);
                break;
            case 'rescheduled':
                await handleRescheduledAppointment(appointmentDetails);
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


async function handleScheduledAppointment(appointmentDetails) {
    const client = await getOrCreateClient(appointmentDetails);
    const { date, startTime, endTime } = parseAppointmentDateTime(appointmentDetails);

    await createAppointment(
        appointmentDetails.type,
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
        appointmentDetails.price
    );

    console.log("Appointment created successfully");
}

async function handleCanceledAppointment(appointmentDetails) {
    const client = await getClientByPhoneNumber(appointmentDetails.phone);
    if (!client) {
        throw new Error('Client not found');
    }

    const { date, startTime } = parseAppointmentDateTime(appointmentDetails);
    const appointmentToDelete = await findAppointmentByClientAndTime(client.id, date, startTime);

    if (!appointmentToDelete) {
        throw new Error('Appointment not found in our database');
    }

    await deleteAppointment(appointmentToDelete.id);
    console.log("Appointment deleted successfully:", appointmentToDelete);
}

async function handleRescheduledAppointment(appointmentDetails) {
    const { date, startTime, endTime } = parseAppointmentDateTime(appointmentDetails);
    
    const updatedAppointment = await findAndUpdateAppointmentByAcuityId(
        appointmentDetails.id,
        {
            date,
            startTime,
            endTime,
            appointmentType: appointmentDetails.type,
            clientId: (await getOrCreateClient(appointmentDetails)).id,
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

async function getOrCreateClient(appointmentDetails) {
    let client = await getClientByPhoneNumber(appointmentDetails.phone);
    if (!client.id) {
        const clientId = await createClient(
            appointmentDetails.firstName,
            appointmentDetails.lastName,
            appointmentDetails.phone,
            appointmentDetails.email,
            ''  // notes field is empty for now
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

async function fetchAppointmentDetails(appointmentId) {
    const apiUrl = `https://acuityscheduling.com/api/v1/appointments/${appointmentId}`;
    const auth = Buffer.from(`${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`).toString('base64');

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

async function fetchAllAppointments() {
    const apiUrl = 'https://acuityscheduling.com/api/v1/appointments';
    const auth = Buffer.from(`${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`).toString('base64');
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

async function migrateAppointments() {
    try {
        const appointments = await fetchAllAppointments();
        console.log(`Starting migration of ${appointments.length} appointments...`);
        
        for (const appointment of appointments) {
            const { date, startTime, endTime } = parseAppointmentDateTime(appointment);
            const client = await getOrCreateClient(appointment);
            
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
                appointment.price
            );
        }
        console.log("All appointments migrated successfully");
    } catch (error) {
        console.error("Error migrating appointments:", error);
    }
}

// async function main() {
//     await migrateAppointments();
// }

// main();

module.exports = { handleWebhook, migrateAppointments };
