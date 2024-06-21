const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../../.env'})
const fs = require('fs');
const os = require('os');
const path = require('path')
const {getClientByPhoneNumber} = require ('../../model/clients') 
const {deleteAppointment, getAppointmentsByDay} = require ('../../model/appointment')
const dbUtils = require('../../model/dbUtils')

const apiKey = process.env.BROWSERCLOUD_API_KEY;


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function cancelAppointment(phoneNumber, date) {
    try {
        const client = await getClientByPhoneNumber(phoneNumber)
        const appointmentsForDay = await getAppointmentsByDay(date)
        console.log(appointmentsForDay)
        const appointment = appointmentsForDay.find(appointment => appointment.clientId === client.id)
        if (!appointment) {
            return "Appointment not found"
        }

        await deleteAppointment(appointment.id)
        return appointment;
    } catch (error) {
        console.log(error)
        return "Unable to cancel the appointment"
    } 
}


module.exports = {cancelAppointment}