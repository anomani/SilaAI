const { getAppointmentsByDay, getAllAppointmentsByClientId, deleteAppointment, getClientAppointmentsAroundCurrent, updateAppointmentPayment, rescheduleAppointment } = require('../model/appointment');
const { createAppointment, createBlockedTime } = require('../model/appointment');
const { bookAppointmentWithAcuity } = require('../ai/tools/bookAppointment');
const { getAppointmentMetrics } = require('../model/appointment');
const { updateAppointmentDetails } = require('../model/appointment');
const { authenticateToken } = require('../middleware/authMiddleware');
const { getTimeSlots } = require('../ai/tools/getAvailability');
const { getCompatibleAddOns } = require('../model/appTypes');
const { getAppointmentTypeDetails, getAppointmentTypeAndAddOnNames } = require('../model/appTypes');
const { getClientByPhoneNumber, createClient, getClientById } = require('../model/clients');
const { 
  getAppointmentTypes, 
  getAddOns, 
  getAppointmentTypeByIdFromDB,
  updateAppointmentType
} = require('../model/appTypes');

// Add this helper function at the top of the file or just before confirmAppointment
function convertTo24HourFormat(time12h) {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  hours = parseInt(hours, 10);
  
  if (hours === 12) {
    hours = 0;
  }
  
  if (modifier === 'PM') {
    hours += 12;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}


async function createNewAppointment(req, res) {
  try {
    const userId = req.user.id; // Get the user ID from the authenticated request
    const { appointmentType, date, startTime, endTime, details, price, paid, tipAmount, paymentMethod, addOns, clientId } = req.body;
    console.log(req.body)
    if (!appointmentType || !date || !startTime || !endTime || !price) {
      return res.status(400).send('Missing required fields');
    }

    const result = await createAppointment(appointmentType, null, date, startTime, endTime, clientId, details, price, paid, tipAmount, paymentMethod, addOns, userId);

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
    const userId = req.query.userId; // Get from query params instead of URL params
    const { date, appointmentTypeId, addOnIds } = req.query;
    console.log("getAvailabilities", { userId, date, appointmentTypeId, addOnIds });

    if (!userId || !date || !appointmentTypeId) {
      return res.status(400).send('Missing required fields: userId, date and appointmentTypeId');
    }

    const parsedAddOnIds = addOnIds ? JSON.parse(addOnIds) : [];

    const nextFiveAvailableDays = await getNextFiveAvailableDays(userId, date, parseInt(appointmentTypeId), parsedAddOnIds);
    const compatibleAddOns = await getCompatibleAddOns(userId, parseInt(appointmentTypeId));

    res.status(200).json({ availableDays: nextFiveAvailableDays, compatibleAddOns });
  } catch (error) {
    console.error('Error fetching availabilities:', error);
    res.status(500).send(`Error fetching availabilities: ${error.message}`);
  }
}

async function getNextFiveAvailableDays(userId, startDate, appointmentTypeId, addOnIds) {
  const availableDays = [];
  let currentDate = new Date(startDate);
  
  while (availableDays.length < 5) {
    const dateString = currentDate.toISOString().split('T')[0];
    const timeSlots = await getTimeSlots(userId, dateString, appointmentTypeId, addOnIds);
    
    if (timeSlots.length > 0) {
      availableDays.push({ date: dateString, timeSlots });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return availableDays;
}

async function getCompatibleAddOnsController(req, res) {
  try {
    const userId = req.query.userId; // Get from query params
    const { appointmentTypeId } = req.query;

    if (!userId || !appointmentTypeId) {
      return res.status(400).send('Missing required fields: userId and appointmentTypeId');
    }

    const compatibleAddOns = await getCompatibleAddOns(userId, parseInt(appointmentTypeId));
    res.status(200).json(compatibleAddOns);
  } catch (error) {
    console.error('Error fetching compatible add-ons:', error);
    res.status(500).send(`Error fetching compatible add-ons: ${error.message}`);
  }
}

async function getAppointmentTypeById(req, res) {
  try {
    const userId = req.query.userId; // Get from query params
    const { appointmentTypeId } = req.params;
    console.log("getAppointmentTypeById", { userId, appointmentTypeId });
    if (!userId || !appointmentTypeId) {
      return res.status(400).send('Missing required fields: userId and appointmentTypeId');
    }

    const appointmentType = await getAppointmentTypeByIdFromDB(userId, parseInt(appointmentTypeId));
    if (!appointmentType) {
      return res.status(404).send('Appointment type not found');
    }
    res.status(200).json(appointmentType);
  } catch (error) {
    console.error('Error fetching appointment type:', error);
    res.status(500).send(`Error fetching appointment type: ${error.message}`);
  }
}

async function getAppointmentDetails(req, res) {
  try {
    const userId = req.query.userId; // Get from query params
    const { appointmentTypeId } = req.params;
    const { addOnIds } = req.query;

    if (!userId || !appointmentTypeId) {
      return res.status(400).send('Missing required fields: userId and appointmentTypeId');
    }

    const parsedAddOnIds = addOnIds ? JSON.parse(addOnIds) : [];
    const details = await getAppointmentTypeDetails(userId, parseInt(appointmentTypeId), parsedAddOnIds);
    
    res.status(200).json(details);
  } catch (error) {
    console.error('Error fetching appointment details:', error);
    res.status(500).send(`Error fetching appointment details: ${error.message}`);
  }
}

async function confirmAppointment(req, res) {
  try {
    const { userId, firstName, lastName, phoneNumber, appointmentTypeId, date, time, addOnIds, price } = req.body;
    console.log('confirmAppointment', req.body);

    if (!userId) {
      return res.status(400).send('Missing required field: userId');
    }

    // Check if client exists, if not create a new one
    let client = await getClientByPhoneNumber(phoneNumber, userId);
    if (!client.id) {
      const clientId = await createClient(firstName, lastName, phoneNumber, '', '', userId);
      client = await getClientById(clientId);
    }


    // Get appointment type and add-on names
    const { appointmentTypeName, addOnNames } = await getAppointmentTypeAndAddOnNames(userId, parseInt(appointmentTypeId), addOnIds);

    // Convert start and end times to 24-hour format
    const [startTime12h, endTime12h] = time.split(' - ');
    const startTime = convertTo24HourFormat(startTime12h);
    const endTime = convertTo24HourFormat(endTime12h);
    console.log("startTime", startTime)
    console.log("endTime", endTime)
    // Create the appointment
    const appointmentId = await createAppointment(
      appointmentTypeName,
      null, // acuityId
      date,
      startTime, // Now in 24-hour format
      endTime, // Now in 24-hour format
      client.id,
      `${appointmentTypeName} with ${addOnNames.length} add-ons: ${addOnNames.join(', ')}`,
      price,
      false, // paid
      0, // tipAmount
      '', // paymentMethod
      addOnNames, // Store add-on names directly as an array
      userId
    );

    const appointmentData = {
      appointmentType: appointmentTypeName,
      date,
      startTime, // Now in 24-hour format
      endTime, // Now in 24-hour format
      clientId: client.id,
      details: `${appointmentTypeName} with ${addOnNames.length} add-ons: ${addOnNames.join(', ')}`,
      price,
      addOns: addOnNames,
    };

    res.status(201).json({ 
      message: 'Appointment confirmed', 
      appointmentId,
      appointmentDetails: {
        ...appointmentData,
        appointmentTypeName,
        addOns: addOnNames
      }
    });
  } catch (error) {
    console.error('Error confirming appointment:', error);
    res.status(500).send(`Error confirming appointment: ${error.message}`);
  }
}

async function getAppointmentTypesForUser(req, res) {
  console.log(req)
  try {
    console.log("getAppointmentTypesForUser")
    const userId = req.query.userId; // Get from query params

    if (!userId) {
      return res.status(400).send('Missing required field: userId');
    }

    const appointmentTypes = await getAppointmentTypes(userId);
    console.log("appointmentTypes", appointmentTypes)
    res.status(200).json(appointmentTypes);
  } catch (error) {
    console.error('Error fetching appointment types:', error);
    res.status(500).send(`Error fetching appointment types: ${error.message}`);
  }
}

async function updateAppointmentTypeController(req, res) {
  try {
    const userId = req.user.id;
    const { appointmentTypeId } = req.params;
    const updates = req.body;

    if (!updates.duration) {
      return res.status(400).send('Missing required field: duration');
    }

    const updatedType = await updateAppointmentType(userId, parseInt(appointmentTypeId), updates);
    res.status(200).json(updatedType);
  } catch (error) {
    console.error('Error updating appointment type:', error);
    res.status(500).send(`Error updating appointment type: ${error.message}`);
  }
}

module.exports = { 
  createNewAppointment, 
  getAppointmentsByDate, 
  getAppointmentsByClientId, 
  delAppointment, 
  bookAppointmentWithAcuityController, 
  createBlockedTimeController, 
  getClientAppointmentsAroundCurrentController, 
  updateAppointmentPaymentController, 
  rescheduleAppointmentController, 
  getAppointmentMetricsController, 
  updateAppointmentDetailsController, 
  getAvailabilities, 
  getCompatibleAddOnsController,
  getAppointmentTypeById,
  getAppointmentDetails,
  confirmAppointment,
  getAppointmentTypesForUser,
  convertTo24HourFormat,
  updateAppointmentTypeController
};