const { createNewAppointment, getAppointmentsByDate } = require('../../controllers/appointmentController');
const { createAppointment, getAppointmentsByDay } = require('../../model/appointment');
const axios = require('axios');

async function main (appointment) {
    await axios.post('http://localhost:3000/api/appointments', appointment);
}
const appointment = {
    "appointmentType": "d",
    "clientId": "d",
    "date": "2023-10-10",
    "startTime": "11:00",
    "endTime": "12:00",
    "details": "hellop"
}
main(appointment)