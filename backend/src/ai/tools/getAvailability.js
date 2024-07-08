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


async function getAvailability(day, duration, group) {
    try {
        const date = new Date(day);
        const dayOfWeek = date.getDay();
        console.log(dayOfWeek)
        if (dayOfWeek === 0 || dayOfWeek === 1) {
            return `I don't take appointments on ${dayOfWeek === 0 ? 'Sunday' : 'Monday'}`;
        }

        const groupAvailability = getGroupAvailability(group, dayOfWeek);
        if (!groupAvailability) {
            return "No availability for this group on the selected day";
        }

        const appointments = await getAppointmentsByDay(day);
        const availableSlots = [];

        for (const slot of groupAvailability) {
            const startOfSlot = new Date(`${day}T${slot.start}`);
            const endOfSlot = new Date(`${day}T${slot.end}`);
            let currentTime = startOfSlot;

            for (let i = 0; i <= appointments.length; i++) {
                const appointmentStart = i < appointments.length ? new Date(`${appointments[i].date}T${appointments[i].starttime}`) : endOfSlot;
                const appointmentEnd = i < appointments.length ? new Date(`${appointments[i].date}T${appointments[i].endtime}`) : endOfSlot;

                if (currentTime < appointmentStart && (appointmentStart - currentTime) >= duration * 60000 && currentTime < endOfSlot) {
                    availableSlots.push({
                        startTime: new Date(currentTime).toTimeString().slice(0, 5),
                        endTime: new Date(Math.min(appointmentStart, endOfSlot)).toTimeString().slice(0, 5)
                    });
                }

                currentTime = appointmentEnd > currentTime ? appointmentEnd : currentTime;
                if (currentTime >= endOfSlot) break;
            }
        }

        return availableSlots;
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
}

function getGroupAvailability(group, dayOfWeek) {
    const availabilityMap = {
        1: {
            2: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }], // Tuesday
            3: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }], // Wednesday
            4: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }], // Thursday
            5: [{ start: '09:00', end: '09:30' }, { start: '09:45', end: '11:45' }, { start: '15:30', end: '16:00' }], // Friday
            6: [{ start: '09:45', end: '11:45' }, { start: '12:00', end: '14:00' }] // Saturday
        },
        2: {
            2: [{ start: '15:00', end: '18:00' }], // Tuesday
            3: [{ start: '15:00', end: '18:00' }], // Wednesday
            4: [{ start: '15:00', end: '17:00' }], // Thursday
            5: [{ start: '16:00', end: '17:00' }], // Friday
            6: [{ start: '15:00', end: '17:00' }]  // Saturday
        },
        3: {
            3: [{ start: '18:00', end: '19:00' }], // Wednesday
            4: [{ start: '18:00', end: '19:00' }], // Thursday
            5: [{ start: '18:00', end: '19:00' }], // Friday
            6: [{ start: '18:00', end: '19:00' }]  // Saturday
        }
    };

    return availabilityMap[group] ? availabilityMap[group][dayOfWeek] : null;
}


function getCurrentDate() {
    const now = new Date();
    now.setHours(now.getHours() - 4);
    const dateTimeString = now.toLocaleString();
    return dateTimeString;
}


async function main() {
    console.log(await getAvailability('2024-07-10', 30, 1))
}

main()

module.exports = {getAvailability, getCurrentDate}