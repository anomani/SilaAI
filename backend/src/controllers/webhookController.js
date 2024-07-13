const { createAppointment } = require('../model/appointment');
const { getClientByPhoneNumber, createClient } = require('../model/clients');
const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });

async function handleWebhook(req, res) {
    console.log("hello")
    console.log("Body:", req.body)
    console.log("action:", req.body.action)
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
        console.log("scheduled")
        try {
            const appointmentId = req.body.id;
            const appointmentDetails = await fetchAppointmentDetails(appointmentId);

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
            const startTime = new Date(`${appointmentDetails.date} ${appointmentDetails.time}`);
            const endTime = new Date(`${appointmentDetails.date} ${appointmentDetails.endTime}`);
            
            console.log('Appointment ID:', appointmentDetails.id);
            console.log('Appointment Date:', appointmentDate.toISOString().split('T')[0]);
            console.log('Start Time:', startTime.toTimeString().split(' ')[0]);
            console.log('End Time:', endTime.toTimeString().split(' ')[0]);
            console.log('Client ID:', client.id);
            console.log('Additional Info:', JSON.stringify({
                email: appointmentDetails.email,
                phone: appointmentDetails.phone,
                dateCreated: appointmentDetails.dateCreated,
                datetimeCreated: appointmentDetails.datetimeCreated
            }));
            console.log('Price:', appointmentDetails.price);

            await createAppointment(
                appointmentDetails.id,  // Using Acuity's appointmentId as appointmentType
                appointmentDate.toISOString().split('T')[0],  // date in YYYY-MM-DD format
                startTime.toTimeString().split(' ')[0],  // time in HH:MM:SS format
                endTime.toTimeString().split(' ')[0],  // time in HH:MM:SS format
                client.id,
                JSON.stringify({
                    email: appointmentDetails.email,
                    phone: appointmentDetails.phone,
                    dateCreated: appointmentDetails.dateCreated,
                    datetimeCreated: appointmentDetails.datetimeCreated
                }),
                appointmentDetails.price  // Use the price from appointmentDetails
            );

            res.status(200).send('Appointment added successfully');
        } catch (error) {
            console.error('Error processing webhook:', error);
            res.status(500).send('Error processing webhook');
        }
    } else {
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