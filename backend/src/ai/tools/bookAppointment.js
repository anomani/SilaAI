const dotenv = require('dotenv')
dotenv.config({path : '../../../.env'})
const {createAppointment} = require ('../../model/appointment')
const {getClientByPhoneNumber, createClient, getClientById} = require ('../../model/clients')
const {getAvailability, getAvailabilityAdmin} = require('./getAvailability')
const axios = require('axios');
const moment = require('moment-timezone');
const { appointmentTypes, addOns } = require('../../model/appointmentTypes');
const {getUserById} = require('../../model/users')
async function bookAppointmentWithAcuity(date, startTime, fname, lname, phone, email, appointmentType, price, addOnArray, userId) {
    const user = await getUserById(userId);
    if (!user) {
        throw new Error(`User not found with ID: ${userId}`);
    }

    const acuityApiUrl = 'https://acuityscheduling.com/api/v1/appointments';
    const auth = {
        username: user.acuity_user_id,
        password: user.acuity_api_key
    };

    const appointmentTypeInfo = appointmentTypes[appointmentType];
    if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type: ${appointmentType}`);
    }

    const timezone = 'America/New_York';
    const datetime = moment.tz(`${date} ${startTime}`, timezone).format();

    const addonIDs = addOnArray.map(addon => addOns[addon].id).filter(id => id !== undefined);
    if (!email) {
        email = ''
    }
    const appointmentData = {
        datetime: datetime,
        appointmentTypeID: appointmentTypeInfo.id,
        firstName: fname,
        lastName: lname,
        email: email,
        phone: phone,
        calendarID: 1057492,
        price: price,
        addonIDs: addonIDs
    };

    console.log(appointmentData);
    try {
        const response = await axios.post(acuityApiUrl, appointmentData, { 
            auth,
            params: {
                admin: true
            }
        });
        console.log('Appointment booked successfully with Acuity');
        return response.data;
    } catch (error) {
        console.error('Error booking appointment with Acuity:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function bookAppointmentAdmin(clientId, date, startTime, appointmentType, addOnArray = [], userId) {
    console.log("Client ID:", clientId);
    console.log("Date:", date);
    console.log("Start Time:", startTime);
    console.log("Appointment Type:", appointmentType);
    console.log("Add-Ons:", addOnArray);
  const client = await getClientById(clientId);
  if (!client) {
    throw new Error(`Client not found with ID: ${clientId}`);
  }

  const appointmentTypeInfo = appointmentTypes[appointmentType];
  if (!appointmentTypeInfo) {
    throw new Error(`Invalid appointment type: ${appointmentType}`);
  }

  const addOnInfo = addOnArray.map(addon => {
    const info = addOns[addon];
    if (!info) {
      console.warn(`Add-on not found: ${addon}`);
      return null;
    }
    return info;
  }).filter(Boolean);
  console.log("Add-on Info:", addOnInfo);

  const totalPrice = appointmentTypeInfo.price + addOnInfo.reduce((sum, addon) => sum + addon.price, 0);
  const totalDuration = appointmentTypeInfo.duration + addOnInfo.reduce((sum, addon) => sum + addon.duration, 0);

  const endTime = moment(`${date} ${startTime}`).add(totalDuration, 'minutes').format('HH:mm');

  try {
    // const acuityAppointment = await bookAppointment(date, startTime, client.firstname, client.lastname, client.phonenumber, client.email, appointmentType, totalPrice, addOns);
    const acuityAppointment = await bookAppointmentWithAcuity(date, startTime, client.firstname, client.lastname, client.phonenumber, client.email, appointmentType, totalPrice, addOnArray, userId);
    return "Appointment booked successfully";
  } catch (error) {
    console.error(error);
    return "Unable to book the appointment";
  }
}

async function bookAppointment(date, startTime, fname, lname, phone, email, appointmentType, price, addOnArray, userId) {
    console.log("Date:", date);
    console.log("Start Time:", startTime);
    console.log("First Name:", fname);
    console.log("Last Name:", lname);
    console.log("Phone:", phone);
    console.log("Email:", email);
    console.log("Appointment Type:", appointmentType);
    console.log("Price:", price);
    console.log("Add-Ons:", addOnArray);

    // Calculate total duration
    const appointmentTypeInfo = appointmentTypes[appointmentType];
    if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type: ${appointmentType}`);
    }
    const addOnInfo = addOnArray.map(addon => addOns[addon]);
    const totalDuration = appointmentTypeInfo.duration + addOnInfo.reduce((sum, addon) => sum + addon.duration, 0);

    const endTime = addMinutes(startTime, totalDuration);

    const availability = await getAvailability(date, appointmentType, addOnArray, userId);
    console.log(availability);

    // Check if the appointment is available
    const availabilityCheck = isAppointmentAvailable(availability, startTime, endTime);
    if (availabilityCheck !== "Available") {
        return availabilityCheck;
    }

    try {
        const acuityAppointment = await bookAppointmentWithAcuity(date, startTime, fname, lname, phone, email, appointmentType, price, addOnArray, userId);
        const client = await getClientByPhoneNumber(phone, userId);
        if (client.id != '') {
            const clientId = client.id;
            // await createAppointment(appointmentType, acuityAppointment.id, date, startTime, endTime, clientId, "", price);
        } else {
            console.log("Client does not exist");
            await createClient(fname, lname, phone, email, "", userId);
            const newClient = await getClientByPhoneNumber(phone, userId);
            // await createAppointment(appointmentType, acuityAppointment.id, date, startTime, endTime, newClient.id, "", price);
        }
        return "Appointment booked successfully";
    } catch (error) {
        console.log(error);
        return "Unable to book the appointment";
    } 
}

async function bookAppointmentInternal(date, startTime, fname, lname, phone, email, appointmentType, price, addOnArray, userId) {
    console.log("Date:", date);
    console.log("Start Time:", startTime);
    console.log("First Name:", fname);
    console.log("Last Name:", lname);
    console.log("Phone:", phone);
    console.log("Email:", email);
    console.log("Appointment Type:", appointmentType);
    console.log("Price:", price);
    console.log("Add-Ons:", addOnArray);

    const appointmentTypeInfo = appointmentTypes[appointmentType];
    if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type: ${appointmentType}`);
    }
    const addOnInfo = addOnArray.map(addon => addOns[addon]);
    const totalDuration = appointmentTypeInfo.duration + addOnInfo.reduce((sum, addon) => sum + addon.duration, 0);

    const endTime = addMinutes(startTime, totalDuration);

    const availability = await getAvailability(date, appointmentType, addOnArray, userId);
    console.log(availability);

    const availabilityCheck = isAppointmentAvailable(availability, startTime, endTime);
    if (availabilityCheck !== "Available") {
        return availabilityCheck;
    }

    try {
        const client = await getClientByPhoneNumber(phone, userId);
        let clientId;
        if (client.id !== '') {
            clientId = client.id;
        } else {
            console.log("Client does not exist");
            await createClient(fname, lname, phone, email, "", userId);
            const newClient = await getClientByPhoneNumber(phone, userId);
            clientId = newClient.id;
        }
        await createAppointment(appointmentType, null, date, startTime, endTime, clientId, "", price, userId);
        return "Appointment booked successfully";
    } catch (error) {
        console.error(error);
        return "Unable to book the appointment";
    } 
}

async function bookAppointmentAdminInternal(clientId, date, startTime, appointmentType, addOnArray = [], userId) {
    console.log("Client ID:", clientId);
    console.log("Date:", date);
    console.log("Start Time:", startTime);
    console.log("Appointment Type:", appointmentType);
    console.log("Add-Ons:", addOnArray);

    const client = await getClientById(clientId);
    if (!client) {
        throw new Error(`Client not found with ID: ${clientId}`);
    }

    const appointmentTypeInfo = appointmentTypes[appointmentType];
    if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type: ${appointmentType}`);
    }

    const addOnInfo = addOnArray.map(addon => {
        const info = addOns[addon];
        if (!info) {
            console.warn(`Add-on not found: ${addon}`);
            return null;
        }
        return info;
    }).filter(Boolean);
    console.log("Add-on Info:", addOnInfo);

    const totalPrice = appointmentTypeInfo.price + addOnInfo.reduce((sum, addon) => sum + addon.price, 0);
    const totalDuration = appointmentTypeInfo.duration + addOnInfo.reduce((sum, addon) => sum + addon.duration, 0);

    const endTime = moment(`${date} ${startTime}`).add(totalDuration, 'minutes').format('HH:mm');

    try {
        await createAppointment(appointmentType, null, date, startTime, endTime, clientId, "", totalPrice, userId);
        return "Appointment booked successfully";
    } catch (error) {
        console.error(error);
        return "Unable to book the appointment";
    }
}

function addMinutes(time, minutesToAdd) {
    const [hours, minutes] = time.split(':').map(Number);
    let newMinutes = minutes + minutesToAdd;
    let newHours = hours;

    if (newMinutes >= 60) {
        newHours += Math.floor(newMinutes / 60);
        newMinutes = newMinutes % 60;
    }

    if (newHours >= 24) {
        newHours = newHours % 24;
    }

    const formattedHours = newHours.toString().padStart(2, '0');
    const formattedMinutes = newMinutes.toString().padStart(2, '0');
    return `${formattedHours}:${formattedMinutes}`;
}

function isAfter(time1, time2) {
    //
    // Example: time1 = "14:30", time2 = "13:45"
    const [hours1, minutes1] = time1.split(':').map(Number); // hours1 = 14, minutes1 = 30
    const [hours2, minutes2] = time2.split(':').map(Number); // hours2 = 13, minutes2 = 45
    
    if (hours1 > hours2) return true;
    if (hours1 === hours2 && minutes1 >= minutes2) return true;
    return false;
}

function isAppointmentAvailable(availability, startTime, endTime) {
    // Check if the slot overlaps
    for (const slot of availability) {
        if (isAfter(startTime, slot.startTime) && !isAfter(startTime, slot.endTime)) {
            if (isAfter(endTime, slot.endTime) && endTime !== slot.endTime) {
                return "This appointment overlaps with another appointment.";
            }
        }
    }

    // Check if the appointment is in an available slot
    let isInAvailableSlot = false;
    for (const slot of availability) {
        if (isAfter(startTime, slot.startTime) && !isAfter(startTime, slot.endTime)) {
            isInAvailableSlot = true;
            break;
        }
    }
    if (!isInAvailableSlot) {
        return "The appointment time is not in an available slot.";
    }

    return "Available";
}

// Test cases
// async function runTestCases() {
//     const result = await bookAppointment("2024-07-04", "17:30", "John", "Doe", "1234567890", "john.doe@example.com", "Test Appointment", 30);
//     console.log(result);
// }

// runTestCases()

module.exports = { bookAppointment, bookAppointmentWithAcuity, bookAppointmentAdmin, isAppointmentAvailable, addMinutes, isAfter, bookAppointmentInternal, bookAppointmentAdminInternal };