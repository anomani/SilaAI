const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../../.env'})
const fs = require('fs');
const os = require('os');
const path = require('path')
const {createAppointment} = require ('../../model/appointment')
const {checkClientExists, getClientByPhoneNumber, createClient} = require ('../../model/clients')
const dbUtils = require('../../model/dbUtils')
/*
appointmentType, date, startTime, endTime, clientId, details
*/

async function bookAppointment(date, startTime, fname, lname, phone, email, appointmentType, appointmentDuration) {
    try {
        console.log("Appointment duration: ", appointmentDuration)
        const endTime = addMinutes(startTime, appointmentDuration)
        console.log("End time: ", endTime)
        const client = await getClientByPhoneNumber(phone)
        if(client != null) {
            console.log("Client already exists")
            const clientId = client.id
            await createAppointment(appointmentType, date, startTime, endTime, clientId, "")
            return "Appointment booked successfully"
        } else {
            console.log("Client does not exist")
            await createClient(fname, lname, phone, email, "")
            const client = await getClientByPhoneNumber(phone)
            await createAppointment(appointmentType, date, startTime, endTime, client.id, "")
            return "Appointment booked successfully"
        }

    } catch (error) {
        console.log(error)
        return "Unable to book the appointment"
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



module.exports = {bookAppointment}
