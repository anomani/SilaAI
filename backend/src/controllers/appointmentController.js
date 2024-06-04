const { getAppointmentsByDay } = require('../model/appointment');
const { createAppointment } = require('../model/appointment');
const dbUtils = require('../model/dbUtils');

async function createNewAppointment(req, res) {
  try {
    await dbUtils.connect()
    const { appointmentType, date, startTime, endTime, clientId, details } = req.body;

    if (!appointmentType || !date || !startTime || !endTime || !clientId) {
      return res.status(400).send('Missing required fields');
    }


    const result = await createAppointment(appointmentType, date, startTime, endTime, clientId, details);
    await dbUtils.closeMongoDBConnection()
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
        await dbUtils.connect()
        const date = req.params.date;
        console.log(date)
        const appointments = await getAppointmentsByDay(date);
        console.log(appointments)
        await dbUtils.closeMongoDBConnection()
        res.status(200).json(appointments);
    } catch (error) {
        res.status(500).send(`Error fetching appointments: ${error.message}`);
    }
}

module.exports = { createNewAppointment, getAppointmentsByDate };