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
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    let currentDate = startDateObj;
    
    while (currentDate <= endDateObj) {
        const dateString = currentDate.toISOString().split('T')[0];
        
        const result = await getAvailabilityCron(dateString, appointmentType, []);
        
        if (result && result.availableSlots && result.availableSlots.length > 0) {
            return result; // Return the result as-is when we find available slots
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return null; // Return null if no available slots are found in the date range
}


module.exports = {
    checkAvailability,
    checkRangeAvailability
};