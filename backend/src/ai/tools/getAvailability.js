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
    console.log("One moment please...");
    try {
        const appointments = await getAppointmentsByDay(day);

        const startOfDay = new Date(`${day}T09:00:00`);
        const endOfDay = new Date(`${day}T18:00:00`);
        const availableSlots = [];

        let currentTime = startOfDay;

        while (currentTime < endOfDay) {
            const nextTime = new Date(currentTime.getTime() + duration * 60000);

            const isSlotAvailable = appointments.every(appointment => {
                const appointmentStart = new Date(`${appointment.date}T${appointment.starttime}`);
                const appointmentEnd = new Date(`${appointment.date}T${appointment.endtime}`);

                return nextTime <= appointmentStart || currentTime >= appointmentEnd;
            });

            if (isSlotAvailable) {
                availableSlots.push({
                    startTime: currentTime.toTimeString().slice(0, 5),
                    endTime: nextTime.toTimeString().slice(0, 5)
                });
            }

            currentTime = nextTime;
        }
        console.log(availableSlots)
        return availableSlots;
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
}

(async () => {
    const testDay = '2024-06-26';
    const testDuration = 30; // duration in minutes
    const availability = await getAvailability(testDay, testDuration);
    console.log(`Availability for ${testDay}:`, availability);
})();

function getCurrentDate() {
    const now = new Date();
    const dateTimeString = now.toLocaleString();
    console.log(dateTimeString)
    return dateTimeString;
}


module.exports = {getAvailability, getCurrentDate}