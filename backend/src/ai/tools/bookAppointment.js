const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../../.env'})
const fs = require('fs');
const os = require('os');
const path = require('path')
const {createAppointment} = require ('../../model/appointment')
const {checkClientExists, getClientByPhoneNumber, createClient} = require ('../../model/clients')
const dbUtils = require('../../model/dbUtils')
const {getAvailability} = require('./getAvailability')

/*
appointmentType, date, startTime, endTime, clientId, details
*/
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function bookAppointment(date, startTime, fname, lname, phone, email, appointmentType, appointmentDuration) {
    console.log("Date:", date);
    console.log("Start Time:", startTime);
    console.log("First Name:", fname);
    console.log("Last Name:", lname);
    console.log("Phone:", phone);
    console.log("Email:", email);
    console.log("Appointment Type:", appointmentType);
    console.log("Appointment Duration:", appointmentDuration);
    const availability = await getAvailability(date, appointmentDuration);
    const endTime = addMinutes(startTime, appointmentDuration);
    console.log("End time: ", endTime);
    //For case that the slot overlaps
    for (const slot of availability) { 
        if (isAfter(startTime, slot.startTime) && !isAfter(startTime, slot.endTime)) {
            if (isAfter(endTime, slot.endTime) && endTime != slot.endTime) {
                return "Actually, this overlaps with another appointment."
            }
        }
    }

    //For case that appointment isn't in an available slot
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

    try {
        const client = await getClientByPhoneNumber(phone);
        console.log(client);
        if(client.id != '') {
            console.log("Client already exists");
            const clientId = client.id;
            await createAppointment(appointmentType, date, startTime, endTime, clientId, "");
            return "Appointment booked successfully";
        } else {
            console.log("Client does not exist");
            await createClient(fname, lname, phone, email, "");
            const client = await getClientByPhoneNumber(phone);
            await createAppointment(appointmentType, date, startTime, endTime, client.id, "");
            return "Appointment booked successfully";
        }
    } catch (error) {
        console.log(error);
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

// Test cases
// async function runTestCases() {
//     const result = await bookAppointment("2024-07-04", "17:30", "John", "Doe", "1234567890", "john.doe@example.com", "Test Appointment", 30);
//     console.log(result);
// }

// runTestCases()

module.exports = { bookAppointment };
