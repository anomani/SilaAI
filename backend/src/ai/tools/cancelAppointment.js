const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../../.env'})
const fs = require('fs');
const os = require('os');
const path = require('path')
const {checkClientExists} = require ('../../model/clients') 
const {deleteAppointment, getAppointmentsByDay} = require ('../../model/appointment')
const dbUtils = require('../../model/dbUtils')

const apiKey = process.env.BROWSERCLOUD_API_KEY;


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function cancelAppointment(number, date) {
    try {
        await dbUtils.connect()
        const client = await checkClientExists(number)

        await dbUtils.connect()
        const appointmentsForDay = await getAppointmentsByDay(date)
        const appointment = appointmentsForDay.find(appointment => appointment.clientId === client._id.toString())
        if (!appointment) {
            return "Appointment not found"
        }

        await dbUtils.connect()
        await deleteAppointment(appointment._id.toString())
        return "Appointment cancelled successfully"
    } catch (error) {
        console.log(error)
        return "Unable to cancel the appointment"
    } 
}


module.exports = {cancelAppointment}