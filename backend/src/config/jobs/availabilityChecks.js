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


module.exports = {
    checkAvailability,
    checkRangeAvailability
};