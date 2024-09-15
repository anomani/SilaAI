const { getAvailabilityCron } = require('../../ai/tools/getAvailability');

async function checkAvailability(request) {
    let availableSlots;
    
    try {
        switch (request.requesttype) {
            case 'specific':
                console.log(`Checking specific date: ${request.startdate}`);
                availableSlots = await getAvailabilityCron(request.startdate, request.appointmenttype, []);
                break;
            case 'range':
                console.log(`Checking date range: ${request.startdate} to ${request.enddate}`);
                availableSlots = await checkRangeAvailability(request.startdate, request.enddate, request.appointmenttype);
                break;
            default:
                console.log(`Unknown request type: ${request.requesttype}`);
                availableSlots = [];
        }
        
        // Filter available slots based on request's time range
        if (availableSlots.length > 0) {
            availableSlots = availableSlots.filter(slot => {
                return slot.startTime >= request.starttime && slot.endTime <= request.endtime;
            });
        }
        
    } catch (error) {
        console.error(`Error checking availability for request ID ${request.id}:`, error);
        availableSlots = [];
    }
    
    return availableSlots;
}

async function checkRangeAvailability(startDate, endDate, appointmentType) {
    let currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    let availableSlots = [];

    while (currentDate <= endDateObj) {
        const dateString = currentDate.toISOString().split('T')[0];
        const daySlots = await getAvailabilityCron(dateString, appointmentType, []);
        
        if (daySlots.length > 0) {
            availableSlots.push(...daySlots.map(slot => ({
                date: dateString,
                ...slot
            })));

            if (availableSlots.length > 0) break; // Stop after finding the first available slot
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableSlots;
}

async function checkDayAvailability(dayOfWeek, appointmentType) {
    const today = new Date();
    let targetDate = new Date(today);

    // Find the next occurrence of the specified day of the week
    while (targetDate.getDay() !== dayOfWeek) {
        targetDate.setDate(targetDate.getDate() + 1);
    }

    const dateString = targetDate.toISOString().split('T')[0];
    const availableSlots = await getAvailabilityCron(dateString, appointmentType, []);

    return availableSlots.map(slot => ({
        date: dateString,
        ...slot
    }));
}

async function checkWeekAvailability(startDate, appointmentType) {
    const startDateObj = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDateObj);
        currentDate.setDate(currentDate.getDate() + i);
        const dateString = currentDate.toISOString().split('T')[0];
        
        const result = await getAvailabilityCron(dateString, appointmentType, []);
        
        if (result && result.availableSlots && result.availableSlots.length > 0) {
            return result; // Return the result as-is when we find available slots
        }
    }

    return null; // Return null if no available slots are found in the week
}

module.exports = {
    checkAvailability,
    checkRangeAvailability
};