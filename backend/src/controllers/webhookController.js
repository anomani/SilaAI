const { createAppointment, deleteAppointment, findAppointmentByClientAndTime } = require('../model/appointment');
const { getClientByPhoneNumber, createClient } = require('../model/clients');
const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });

async function handleWebhook(req, res) {
    try {
        verifyWebhookSignature(req);
        
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

function verifyWebhookSignature(req) {
    const signature = req.headers['x-acuity-signature'];
    const body = JSON.stringify(req.body);
    const hasher = crypto.createHmac('sha256', process.env.ACUITY_API_KEY);
    hasher.update(body);
    const hash = hasher.digest('base64');

    if (hash !== signature) {
        throw new Error('Invalid signature');
    }
}

async function handleScheduledAppointment(appointmentDetails) {
    const client = await getOrCreateClient(appointmentDetails);
    const { date, startTime, endTime } = parseAppointmentDateTime(appointmentDetails);

    await createAppointment(
        appointmentDetails.type,
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
    // Create the new appointment
    await handleScheduledAppointment(appointmentDetails);
    
    console.log("Appointment rescheduled successfully");
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

module.exports = { handleWebhook };
