const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../../.env'})
const fs = require('fs');
const os = require('os');
const path = require('path')
const {createAppointment} = require ('../../model/appointment')
const {checkClientExists, getClientIdByPhoneNumber, createClient} = require ('../../model/clients')
const dbUtils = require('../../model/dbUtils')
/*
appointmentType, date, startTime, endTime, clientId, details
*/

async function bookAppointment(date, startTime, fname, lname, phone, email, appointmentType) {
    try {
        const endTime = addThirtyMinutes(startTime)
        const clientExists = await checkClientExists(phone)
        if(clientExists != null) {
            console.log("Client already exists")
            const clientId = clientExists.id
            await createAppointment(appointmentType, date, startTime, endTime, clientId, "")
            return "Appointment booked successfully"
        } else {
            console.log("Client does not exist")
            await createClient(fname, lname, phone, email, 0, "")
            const client = await checkClientExists(phone)
            await createAppointment(appointmentType, date, startTime, endTime, client.id, "")
            return "Appointment booked successfully"
        }

    } catch (error) {
        console.log(error)
        return "Unable to book the appointment"
    } 
}

function addThirtyMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    let newMinutes = minutes + 30;
    let newHours = hours;

    if (newMinutes >= 60) {
        newMinutes -= 60;
        newHours += 1;
    }

    if (newHours >= 24) {
        newHours -= 24;
    }

    const formattedHours = newHours.toString().padStart(2, '0');
    const formattedMinutes = newMinutes.toString().padStart(2, '0');
    return `${formattedHours}:${formattedMinutes}`;
}

module.exports = {bookAppointment}

