const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../../.env'})
const fs = require('fs');
const os = require('os');
const path = require('path')
const {getAppointmentsByDay} = require('../../model/appointment')
const dbUtils = require('../../model/dbUtils');

const apiKey = process.env.BROWSERCLOUD_API_KEY;


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function getAvailability(day) {
    console.log("One moment please...")
    try {
        const appointments = await getAppointmentsByDay(day)
        console.log(appointments)
        return appointments
    } catch (error) {
        console.error("Error:", error);
        return []
    }
}

function getCurrentDate() {
    console.log("Getting date")
    const date = new Date()
    console.log(date.toDateString())
    return date.toDateString()
}

module.exports = {getAvailability, getCurrentDate}