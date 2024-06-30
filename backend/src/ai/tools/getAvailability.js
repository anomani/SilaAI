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
        // Check if the day is Sunday
        const date = new Date(day);
        console.log(date.getDay())
        console.log(day)
        if (date.getDay() === 6) {
            console.log("I don't take appointments on Sunday")
            return "I don't take appointments on Sunday";
        }

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

function isAfter(slot, currentTime) {
    const slotStartTime = slot.startTime.replace(':', '');
    const currentMilitaryTime = currentTime.replace(':', '');
    console.log(parseInt(slotStartTime) > parseInt(currentMilitaryTime))
    return parseInt(slotStartTime) > parseInt(currentMilitaryTime);
}

function getCurrentTime() {
    const now = getCurrentDate();
    const nowTime = now.split(', ')[1].split(' ')[0];
    const [hours, minutes] = nowTime.split(':');
    const period = now.split(' ')[2];
    let militaryHours = parseInt(hours, 10);

    if (period === 'PM' && militaryHours !== 12) {
        militaryHours += 12;
    } else if (period === 'AM' && militaryHours === 12) {
        militaryHours = 0;
    }
    const militaryTime = `${String(militaryHours).padStart(2, '0')}:${minutes}`;
    
    const [month, day, year] = now.split(', ')[0].split('/');
    const nowDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return { militaryTime, nowDate };
}
function getCurrentDate() {
    const now = new Date();
    now.setHours(now.getHours() - 4);
    const dateTimeString = now.toLocaleString();
    return dateTimeString;
}


function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// async function main() {
//     console.log(getCurrentDate())
// }

// main()

module.exports = {getAvailability, getCurrentDate}