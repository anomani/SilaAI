const { fillMyCalendar } = require('../ai/fillMyCalendar');
const { getAvailableSlots } = require('../ai/tools/getAvailableSlots');
const { getOldClients, getNumberOfCustomersContacted } = require('../model/clients');
const { getSuggestedResponsesByClient, updateSuggestedResponse } = require('../model/messages');

/**
 * Get data for the Fill My Calendar dashboard.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getFillMyCalendarData(req, res) {
  try {
    const userId = req.user.id;
    
    // Get available slots for the next 7 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 7);
    
    const availableSlots = await getAvailableSlots(
      startDate.toISOString().split('T')[0], 
      endDate.toISOString().split('T')[0], 
      userId
    );
    
    // Calculate total empty spots and categorize by group
    const slotsByGroup = availableSlots.reduce((acc, day) => {
      Object.entries(day.slotsByGroup).forEach(([group, slots]) => {
        if (!acc[group]) {
          acc[group] = 0;
        }
        acc[group] += slots.length;
      });
      return acc;
    }, {});
    
    const totalEmptySpots = Object.values(slotsByGroup).reduce((sum, count) => sum + count, 0);
    
    // Get old clients eligible for outreach
    const oldClients = await getOldClients(userId);
    
    // Get clients with suggested responses (these are the ones being contacted)
    const clientsWithResponses = await getSuggestedResponsesByClient(userId);
    
    // Filter oldClients to get those not currently being contacted (potential upcoming)
    const clientIdsWithResponses = clientsWithResponses.map(client => client.id);
    const upcomingClients = oldClients
      .filter(client => !clientIdsWithResponses.includes(client.id))
      .slice(0, 5); // Just get the top 5 for the UI
    
    // For this example, we'll make up some recent results
    // In a real implementation, this would come from a database of recent outreach results
    const recentResults = [
      {
        clientName: 'Client 1',
        outcome: 'Booked',
        date: '2 days ago'
      },
      {
        clientName: 'Client 2',
        outcome: 'No Response',
        date: '3 days ago'
      },
      {
        clientName: 'Client 3',
        outcome: 'Responded',
        date: '5 days ago'
      }
    ];
    
    // Create the response structure
    const data = {
      recommendedStrategy: "Contact lapsed clients who haven't visited in 8+ weeks, prioritizing those in group 2 and 3.",
      appointmentData: {
        totalEmptySpots,
        slotsByGroup,
        timeframeDays: 7  // Fixed at 7 days for now
      },
      clientsToContact: clientsWithResponses,
      upcomingClients,
      recentResults,
      numberOfCustomersContacted: await getNumberOfCustomersContacted(30, userId)
    };
    
    res.json(data);
  } catch (error) {
    console.error('Error in getFillMyCalendarData:', error);
    res.status(500).json({ error: 'Failed to get Fill My Calendar data' });
  }
}

/**
 * Run Fill My Calendar process manually.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function runFillMyCalendarManually(req, res) {
  try {
    const userId = req.user.id;
    const result = await fillMyCalendar(userId);
    res.json({ message: result || 'Fill My Calendar process completed successfully' });
  } catch (error) {
    console.error('Error in runFillMyCalendarManually:', error);
    res.status(500).json({ error: 'Failed to run Fill My Calendar process' });
  }
}

/**
 * Update outreach message for a client.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateClientOutreachMessage(req, res) {
  try {
    const { clientId } = req.params;
    const { message } = req.body;
    
    // Update the outreach message in the database
    await updateSuggestedResponse(clientId, message);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error in updateClientOutreachMessage:', error);
    res.status(500).json({ error: 'Failed to update client outreach message' });
  }
}

module.exports = {
  getFillMyCalendarData,
  runFillMyCalendarManually,
  updateClientOutreachMessage
}; 