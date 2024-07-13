const { createAppointment } = require('../model/appointment');
const { getClientByPhoneNumber, createClient } = require('../model/clients');
const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });

async function handleWebhook(req, res) {
    // console.log("Received webhook:", req.body);

    // Verify the webhook signature
    const signature = req.headers['x-acuity-signature'];
    const body = JSON.stringify(req.body);
    const hasher = crypto.createHmac('sha256', process.env.ACUITY_API_KEY);
    hasher.update(body);
    const hash = hasher.digest('base64');

    // if (hash !== signature) {
    //     return res.status(401).send('Invalid signature');
    // }

    if (req.body.action === 'scheduled') {
        try {
            const appointmentId = req.body.id;
            console.log("Fetching details for appointment ID:", appointmentId);
            const appointmentDetails = await fetchAppointmentDetails(appointmentId);
            // console.log("Appointment details:", appointmentDetails);

            // Get client by phone number or create a new client
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

            const appointmentDate = new Date(appointmentDetails.date);

            // Convert start and end times to military format (HH:MM)
            const startTimeParts = appointmentDetails.time.split(':');
            let startTimeHour = parseInt(startTimeParts[0]);
            if (appointmentDetails.time.includes('pm') && startTimeHour !== 12) {
                startTimeHour += 12;
            }
            const startTimeMilitary = `${startTimeHour.toString().padStart(2, '0')}:${startTimeParts[1].substring(0, 2)}`;

            const endTimeParts = appointmentDetails.endTime.split(':');
            let endTimeHour = parseInt(endTimeParts[0]);
            if (appointmentDetails.endTime.includes('pm') && endTimeHour !== 12) {
                endTimeHour += 12;
            }
            const endTimeMilitary = `${endTimeHour.toString().padStart(2, '0')}:${endTimeParts[1].substring(0, 2)}`;
            console.log("Appointment Type:", appointmentDetails.type);
            console.log("Appointment Date:", appointmentDate.toISOString().split('T')[0]);
            console.log("Start Time (Military):", startTimeMilitary);
            console.log("End Time (Military):", endTimeMilitary);
            console.log("Client ID:", client.id);
            console.log("Additional Info:", JSON.stringify({
                email: appointmentDetails.email,
                phone: appointmentDetails.phone,
                dateCreated: appointmentDetails.dateCreated,
                datetimeCreated: appointmentDetails.datetimeCreated
            }));
            console.log("Appointment Price:", appointmentDetails.price);

            await createAppointment(
                appointmentDetails.type,
                appointmentDate.toISOString().split('T')[0],
                startTimeMilitary,
                endTimeMilitary,
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
            res.status(200).send('Appointment added successfully');
        } catch (error) {
            console.error('Error processing webhook:', error);
            res.status(500).send('Error processing webhook');
        }
    } else {
        console.log("Received non-scheduled action:", req.body.action);
        res.status(200).send('Webhook received');
    }
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


// async function main() {
//     const appointmentId = "1295410240";
//     const appointmentDetails = await fetchAppointmentDetails(appointmentId);
//     console.log(appointmentDetails);
// }

// main();
module.exports = { handleWebhook };