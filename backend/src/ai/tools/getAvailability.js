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


async function getAvailability(day, duration) {
    try {
        const appointments = await getAppointmentsByDay(day);

        const startOfDay = new Date(`${day}T09:00:00`);
        const endOfDay = new Date(`${day}T18:00:00`);
        const availableSlots = [];

        let currentTime = startOfDay;

        for (let i = 0; i <= appointments.length; i++) {
            const appointmentStart = i < appointments.length ? new Date(`${appointments[i].date}T${appointments[i].starttime}`) : endOfDay;
            const appointmentEnd = i < appointments.length ? new Date(`${appointments[i].date}T${appointments[i].endtime}`) : endOfDay;

            if (currentTime < appointmentStart && (appointmentStart - currentTime) >= duration * 60000) {
                availableSlots.push({
                    startTime: currentTime.toTimeString().slice(0, 5),
                    endTime: appointmentStart.toTimeString().slice(0, 5)
                });
            }

            currentTime = appointmentEnd > currentTime ? appointmentEnd : currentTime;
        }

        console.log(availableSlots);
        return availableSlots;
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
}



function getCurrentDate() {
    const now = new Date();
    const dateTimeString = now.toLocaleString();
    return dateTimeString;
}


module.exports = {getAvailability, getCurrentDate}