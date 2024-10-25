const { getAppointmentsByDay, getAllAppointmentsByClientId, deleteAppointment, getClientAppointmentsAroundCurrent, updateAppointmentPayment, rescheduleAppointment } = require('../model/appointment');
const { createAppointment, createBlockedTime } = require('../model/appointment');
const { bookAppointmentWithAcuity } = require('../ai/tools/bookAppointment');
const { getAppointmentMetrics } = require('../model/appointment');
const { updateAppointmentDetails } = require('../model/appointment');
const { authenticateToken } = require('../middleware/authMiddleware');
const { getTimeSlots } = require('../ai/tools/getAvailability');

async function createNewAppointment(req, res) {
  try {
    const userId = req.user.id; // Get the user ID from the authenticated request
    const { appointmentType, date, startTime, endTime, details, price, paid, tipAmount, paymentMethod, addOns } = req.body;
    console.log(req.body)
    if (!appointmentType || !date || !startTime || !endTime || !price) {
      return res.status(400).send('Missing required fields');
    }

    const result = await createAppointment(appointmentType, null, date, startTime, endTime, details, price, paid, tipAmount, paymentMethod, addOns, userId);

    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('Invalid or expired token')) {
      res.status(401).send('Unauthorized: Invalid or expired token');
    } else if (error.message.includes('validation failed')) {
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
        const userId = req.user.id; // Get the user ID from the authenticated reques
        console.log("Userid", userId)
        const date = req.params.date;
        const appointments = await getAppointmentsByDay(userId, date);

        res.status(200).json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).send(`Error fetching appointments: ${error.message}`);
    }
}

async function getAppointmentsByClientId(req, res) {
    try {
        const userId = req.user.id; // Get the user ID from the authenticated request
        const clientId = req.params.clientId;
        const appointments = await getAllAppointmentsByClientId(clientId, userId);
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
    const userId = req.user.id; // Get the user ID from the authenticated request
    console.log(req.body)
    const { date, startTime, fname, lname, phone, email, appointmentType, price, addOnArray } = req.body;
    if (!date || !startTime || !fname || !lname || !phone || !appointmentType || !price) {
      return res.status(400).send('Missing required fields');
    }

    const result = await bookAppointmentWithAcuity(date, startTime, fname, lname, phone, email, appointmentType, price, addOnArray, userId);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error booking appointment with Acuity:', error);
    res.status(500).send(`Error booking appointment with Acuity: ${error.message}`);
  }
}

async function createBlockedTimeController(req, res) {
  try {
    const userId = req.user.id; // Get the user ID from the authenticated request
    const { date, startTime, endTime, reason } = req.body;

    if (!date || !startTime || !endTime || !reason) {
      return res.status(400).send('Missing required fields');
    }

    const result = await createBlockedTime(date, startTime, endTime, reason, userId);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating blocked time:', error);
    res.status(500).send(`Error creating blocked time: ${error.message}`);
  }
}

async function getClientAppointmentsAroundCurrentController(req, res) {
    try {
        console.log("clientts atound", req.params)
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
        const userId = req.user.id; // Get the user ID from the authenticated request
        console.log("getAppointmentMetricsController started for userId:", userId);
        const metrics = await getAppointmentMetrics(userId);
        console.log("Metrics received for userId:", userId, metrics);
        res.status(200).json(metrics);
    } catch (error) {
        console.error('Error fetching appointment metrics:', error);
        console.error(error.stack);  // This will log the full stack trace
        res.status(500).send(`Error fetching appointment metrics: ${error.message}`);
    }
}

async function updateAppointmentDetailsController(req, res) {
  try {
    const { appointmentId } = req.params;
    const { date, startTime, endTime, appointmentType, price } = req.body;

    console.log('Updating appointment:', appointmentId);
    console.log('Update data:', req.body);

    if (!date || !startTime || !endTime || !appointmentType || price === undefined) {
      return res.status(400).send('Missing required fields');
    }

    const updatedAppointmentData = {
      date,
      startTime,
      endTime,
      appointmentType,
      price: parseFloat(price),
    };

    const updatedAppointment = await updateAppointmentDetails(
      appointmentId,
      updatedAppointmentData
    );

    if (!updatedAppointment) {
      return res.status(404).send('Appointment not found');
    }

    console.log('Appointment updated successfully:', updatedAppointment);
    res.status(200).json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).send(`Error updating appointment: ${error.message}`);
  }
}

async function getAvailabilities(req, res) {
  try {
    const userId = 1; //CHANGE THIS
    const { date, appointmentType, addOns } = req.query;
    console.log("getAvailabilities", { userId, date, appointmentType, addOns });

    if (!date || !appointmentType) {
      return res.status(400).send('Missing required fields: date and appointmentType');
    }

    // Parse addOns if it's a string
    const addOnArray = addOns ? JSON.parse(addOns) : [];

    const timeSlots = await getTimeSlots(userId, date, appointmentType, []);

    console.log("Available time slots:", timeSlots);
    res.status(200).json(timeSlots);
  } catch (error) {
    console.error('Error fetching availabilities:', error);
    res.status(500).send(`Error fetching availabilities: ${error.message}`);
  }
}

module.exports = { createNewAppointment, getAppointmentsByDate, getAppointmentsByClientId, delAppointment, bookAppointmentWithAcuityController, createBlockedTimeController, getClientAppointmentsAroundCurrentController, updateAppointmentPaymentController, rescheduleAppointmentController, getAppointmentMetricsController, updateAppointmentDetailsController, getAvailabilities };
