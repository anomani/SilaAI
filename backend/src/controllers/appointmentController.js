const { getAppointmentsByDay, getAllAppointmentsByClientId, deleteAppointment, getClientAppointmentsAroundCurrent, updateAppointmentPayment, rescheduleAppointment } = require('../model/appointment');
const { createAppointment, createBlockedTime } = require('../model/appointment');
const dbUtils = require('../model/dbUtils');
const { bookAppointmentWithAcuity } = require('../ai/tools/bookAppointment');
const { getAppointmentMetrics } = require('../model/appointment');

async function createNewAppointment(req, res) {
  try {
    const { appointmentType, date, startTime, endTime, clientId, details, price, paid, tipAmount, paymentMethod, addOns } = req.body;
    console.log(req.body)
    if (!appointmentType || !date || !startTime || !endTime || !clientId || !price) {
      return res.status(400).send('Missing required fields');
    }

    const result = await createAppointment(appointmentType, null, date, startTime, endTime, clientId, details, price, paid, tipAmount, paymentMethod, addOns);

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
        const appointments = await getAppointmentsByDay(date);

        res.status(200).json(appointments);
    } catch (error) {
        res.status(500).send(`Error fetching appointments: ${error.message}`);
    }
}

async function getAppointmentsByClientId(req, res) {
    try {
        const clientId = req.params.clientId;
        const appointments = await getAllAppointmentsByClientId(clientId);
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

async function bookAppointmentWithAcuityController(req, res) {
  try {
    console.log(req.body)
    const { date, startTime, fname, lname, phone, email, appointmentType, price, addOnArray } = req.body;
    if (!date || !startTime || !fname || !lname || !phone || !appointmentType || !price) {
      return res.status(400).send('Missing required fields');
    }

    const result = await bookAppointmentWithAcuity(date, startTime, fname, lname, phone, email, appointmentType, price, addOnArray);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error booking appointment with Acuity:', error);
    res.status(500).send(`Error booking appointment with Acuity: ${error.message}`);
  }
}

async function createBlockedTimeController(req, res) {
  try {
    const { date, startTime, endTime, reason } = req.body;

    if (!date || !startTime || !endTime || !reason) {
      return res.status(400).send('Missing required fields');
    }

    const result = await createBlockedTime(date, startTime, endTime, reason);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating blocked time:', error);
    res.status(500).send(`Error creating blocked time: ${error.message}`);
  }
}

async function getClientAppointmentsAroundCurrentController(req, res) {
    try {
        const { clientId, currentAppointmentId } = req.params;
        const appointments = await getClientAppointmentsAroundCurrent(clientId, currentAppointmentId);
        res.status(200).json(appointments);
    } catch (error) {
        res.status(500).send(`Error fetching client appointments around current: ${error.message}`);
    }
}

async function updateAppointmentPaymentController(req, res) {
    try {
        const { appointmentId } = req.params;
        const { paid, tipAmount, paymentMethod } = req.body;

        if (paid === undefined || tipAmount === undefined || !paymentMethod) {
            return res.status(400).send('Missing required fields');
        }

        const updatedAppointment = await updateAppointmentPayment(appointmentId, paid, tipAmount, paymentMethod);
        res.status(200).json(updatedAppointment);
    } catch (error) {
        res.status(500).send(`Error updating appointment payment: ${error.message}`);
    }
}

async function rescheduleAppointmentController(req, res) {
    try {
        const { appointmentId } = req.params;
        const { newDate, newStartTime, newEndTime } = req.body;

        if (!newDate || !newStartTime || !newEndTime) {
            return res.status(400).send('Missing required fields');
        }

        const updatedAppointment = await rescheduleAppointment(appointmentId, newDate, newStartTime, newEndTime);
        
        if (!updatedAppointment) {
            return res.status(404).send('Appointment not found');
        }

        res.status(200).json(updatedAppointment);
    } catch (error) {
        res.status(500).send(`Error rescheduling appointment: ${error.message}`);
    }
}

async function getAppointmentMetricsController(req, res) {
    try {
        console.log("getAppointmentMetricsController started");
        const metrics = await getAppointmentMetrics();
        console.log("Metrics received:", metrics);
        res.status(200).json(metrics);
    } catch (error) {
        console.error('Error fetching appointment metrics:', error);
        console.error(error.stack);  // This will log the full stack trace
        res.status(500).send(`Error fetching appointment metrics: ${error.message}`);
    }
}

module.exports = { createNewAppointment, getAppointmentsByDate, getAppointmentsByClientId, delAppointment, bookAppointmentWithAcuityController, createBlockedTimeController, getClientAppointmentsAroundCurrentController, updateAppointmentPaymentController, rescheduleAppointmentController, getAppointmentMetricsController };