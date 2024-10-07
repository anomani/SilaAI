const { getAvailabilityCron } = require('../../ai/tools/getAvailability');

async function checkAvailability(request, userId) {
    let availableSlots;
    
    try {
        switch (request.requesttype) {
            case 'specific':
                console.log(`Checking specific date: ${request.startdate} for user ${userId}`);
                availableSlots = await getAvailabilityCron(request.startdate, request.appointmenttype, [], userId);
                break;
            case 'range':
                console.log(`Checking date range: ${request.startdate} to ${request.enddate} for user ${userId}`);
                availableSlots = await checkRangeAvailability(request.startdate, request.enddate, request.appointmenttype, userId);
                break;
            default:
                console.log(`Unknown request type: ${request.requesttype} for user ${userId}`);
                availableSlots = [];
        }
        
        // Filter available slots based on request's time range
        if (availableSlots.length > 0) {
            availableSlots = availableSlots.filter(slot => {
                return slot.startTime >= request.starttime && slot.endTime <= request.endtime;
            });
        }
        
    } catch (error) {
        console.error(`Error checking availability for request ID ${request.id} and user ${userId}:`, error);
        availableSlots = [];
    }
    
    return availableSlots;
}

async function checkRangeAvailability(startDate, endDate, appointmentType, userId) {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    let currentDate = startDateObj;
    
    while (currentDate <= endDateObj) {
        const dateString = currentDate.toISOString().split('T')[0];
        
        const result = await getAvailabilityCron(dateString, appointmentType, [], userId);
        
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