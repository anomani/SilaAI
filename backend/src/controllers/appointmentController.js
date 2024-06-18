const { getAppointmentsByDay, getAllAppointmentsByClientId, deleteAppointment } = require('../model/appointment');
const { createAppointment } = require('../model/appointment');
const dbUtils = require('../model/dbUtils');

async function createNewAppointment(req, res) {
  try {

    const { appointmentType, date, startTime, endTime, clientId, details } = req.body;

    if (!appointmentType || !date || !startTime || !endTime || !clientId) {
      return res.status(400).send('Missing required fields');
    }


    const result = await createAppointment(appointmentType, date, startTime, endTime, clientId, details);

    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('validation failed')) {
      res.status(422).send(`Validation error: ${error.message}`);
    } else if (error.message.includes('duplicate key error')) {
      res.status(409).send(`Conflict error: ${error.message}`);
    } else {
      res.status(500).send(`Error creating appointment: ${error.message}`);
    }
  }
}


async function getAppointmentsByDate(req, res) {
    try {

        const date = req.params.date;
        console.log(date)
        const appointments = await getAppointmentsByDay(date);
        console.log(appointments)

        res.status(200).json(appointments);
    } catch (error) {
        res.status(500).send(`Error fetching appointments: ${error.message}`);
    }
}

async function getAppointmentsByClientId(req, res) {
    try {
        const clientId = req.params.clientId;
        console.log(clientId)
        const appointments = await getAllAppointmentsByClientId(clientId);
        console.log(appointments)
        res.status(200).json(appointments);
    } catch (error) {
        res.status(500).send(`Error fetching appointments: ${error.message}`);
    }
}

async function delAppointment(req, res) {
    try {
        const appointmentId = req.params.appointmentId;
        const result = await deleteAppointment(appointmentId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).send(`Error deleting appointment: ${error.message}`);
    }
}


module.exports = { createNewAppointment, getAppointmentsByDate, getAppointmentsByClientId, delAppointment };
