const { createAppointment } = require('../model/appointment');
const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });

async function handleWebhook(req, res) {
    console.log(req)
    // Verify the webhook signature
    const signature = req.headers['x-acuity-signature'];
    const body = JSON.stringify(req.body);
    const hash = crypto.createHmac('sha256', process.env.ACUITY_API_KEY)
                       .update(body)
                       .digest('base64');

    if (hash !== signature) {
        return res.status(401).send('Invalid signature');
    }

    if (req.body.action === 'scheduled') {
        try {
            const appointmentId = req.body.id;
            const appointmentDetails = await fetchAppointmentDetails(appointmentId);
            console.log(appointmentDetails);
            // Map Acuity data to your database schema
            // const {
            //     appointmentTypeID,
            //     date,
            //     time,
            //     endTime,
            //     firstName,
            //     lastName,
            //     email,
            //     phone,
            //     price,
            //     notes
            // } = appointmentDetails;

            // // Combine firstName and lastName for clientId
            // const clientId = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;

            // // Create appointment in your database
            // await createAppointment(
            //     appointmentTypeID,
            //     date,
            //     time,
            //     endTime,
            //     clientId,
            //     JSON.stringify({ email, phone, notes }),
            //     price
            // );

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

module.exports = { handleWebhook };