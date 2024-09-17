const { getActiveWaitlistRequests, markWaitlistRequestAsNotified } = require('../../model/waitlist');
const { getClientById } = require('../../model/clients');
const { saveSuggestedResponse } = require('../../model/messages'); // Update this import
const { checkAvailability } = require('./availabilityChecks');


async function checkWaitlistRequests() {
    try {
        const waitlistRequests = await getActiveWaitlistRequests();
        
        for (const request of waitlistRequests) {
            const availableSlots = await checkAvailability(request);
            console.log("Available slots:", availableSlots);
            if (availableSlots.availableSlots && availableSlots.availableSlots.length > 0) {
                const client = await getClientById(request.clientid);
                
                const [year, month, day] = availableSlots.date.split('-');
                const slotDate = new Date(Date.UTC(year, month - 1, day));
                slotDate.setUTCHours(slotDate.getUTCHours() - 4);
                
                const formattedDate = slotDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
                
                const message = `A spot has opened up for your requested appointment on ${formattedDate}. Please book soon!`;
                
                // Save the message as a suggested response
                await saveSuggestedResponse(client.id, message);
                await markWaitlistRequestAsNotified(request.id);
                console.log(`Marked request ID: ${request.id} as notified and set suggested response`);
            }
        }
        
        console.log('Finished checking waitlist requests at:', new Date().toISOString());
    } catch (error) {
        console.error('Error checking waitlist requests:', error);
    }
}

module.exports = {
    checkWaitlistRequests
};