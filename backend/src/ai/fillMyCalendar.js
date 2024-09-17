const { sendMessages } = require('../model/messages');
const { getClientById, getOldClients, updateClientOutreachDate } = require('../model/clients');
const { getAvailableSlots } = require('./tools/getAvailableSlots');
const openai = require('../services/openai');
const schedule = require('node-schedule');
const logger = require('../utils/logger');

async function fillMyCalendar(startDate, endDate, appointmentType, addOnArray) {
  try {
    const availableSlots = await getAvailableSlots(startDate, endDate, appointmentType, addOnArray);
    const oldClients = await getOldClients();

    // Prepare data for strategy decision
    const data = {
      appointmentData: {
        totalEmptySpots: availableSlots.length,
        timeframeDays: calculateTimeframe(startDate, endDate)
      },
      customerData: oldClients.map(client => ({
        customerId: client.id,
        lastVisitDate: client.lastAppointmentDate,
        hasNearFutureAppointment: client.hasNearFutureAppointment,
        priorityLevel: client.priorityLevel
      })),
      outreachStatus: {
        numberOfCustomersAlreadyContacted: await getNumberOfCustomersContacted()
      },
      conversionRateEstimate: {
        estimatedConversionRate: 0.05
      }
    };

    // Determine the best strategy using LLM
    const strategy = await determineStrategy(data);

    // Execute the strategy
    const selectedClients = await selectClientsBasedOnStrategy(strategy, oldClients);
    const message = strategy.draftCustomerMessage;

    const result = await sendOutreachMessages(selectedClients, message);

    return result;
  } catch (error) {
    console.error("Error in fillMyCalendar:", error);
    throw error;
  }
}

function calculateTimeframe(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

async function determineStrategy(data) {
  const prompt = `
    I am trying to fill empty appointment slots for a barber shop using direct outreach to lapsed customers. I need to maximize revenue while ensuring all slots are filled within the next few days. Given the data below, please provide the best strategy and the specific actions I should take next. Include how many customers to contact and draft a message to send to them.

    Input Data:

    Appointment Data:

    Total Empty Spots: ${data.appointmentData.totalEmptySpots}
    Timeframe (days): ${data.appointmentData.timeframeDays}
    Customer Data:
    ${JSON.stringify(data.customerData, null, 2)}
    Outreach Status:

    Number of Customers Already Contacted: ${data.outreachStatus.numberOfCustomersAlreadyContacted}
    Conversion Rate Estimate:

    Estimated Conversion Rate: ${data.conversionRateEstimate.estimatedConversionRate}

    Expected Output:

    Recommended Strategy:
    Specific Actions:
    Draft Customer Message:
  `;

  const response = await openai.createCompletion({
    model: "gpt-4",
    prompt: prompt,
    max_tokens: 500,
    temperature: 0.7
  });

  try {
    const strategy = parseLLMResponse(response.data.choices[0].text);
    return strategy;
  } catch (error) {
    console.error("Error parsing LLM response:", error);
    // Fallback strategy
    return defaultStrategy(data);
  }
}

function parseLLMResponse(responseText) {
  // Implement parsing logic based on the expected output format
  // This could involve regex or using a markdown parser
  // For simplicity, let's assume structured text and extract sections
  const recommendedStrategyMatch = responseText.match(/Recommended Strategy:\s*(.*)/i);
  const specificActionsMatch = responseText.match(/Specific Actions:\s*Number of Customers to Contact:\s*(\d+)/i);
  const draftMessageMatch = responseText.match(/Draft Customer Message:\s*"(.*)"/i);

  if (recommendedStrategyMatch && specificActionsMatch && draftMessageMatch) {
    return {
      recommendedStrategy: recommendedStrategyMatch[1].trim(),
      specificActions: {
        numberOfCustomersToContact: parseInt(specificActionsMatch[1].trim())
      },
      draftCustomerMessage: draftMessageMatch[1].trim()
    };
  } else {
    throw new Error("Failed to parse LLM response");
  }
}

function defaultStrategy(data) {
  // Define a fallback strategy if LLM fails
  return {
    recommendedStrategy: "Continue outreach without specific targeting.",
    specificActions: {
      numberOfCustomersToContact: 10
    },
    draftCustomerMessage: "Hi, we'd love to see you back at our barber shop! Please book your next appointment at your convenience."
  };
}

async function selectClientsBasedOnStrategy(strategy, clients) {
  const numberOfCustomers = strategy.specificActions.numberOfCustomersToContact;
  
  // Prioritize high-level customers
  const highPriorityClients = clients.filter(client => client.priorityLevel === "High");
  const lowPriorityClients = clients.filter(client => client.priorityLevel === "Low");
  
  let selectedClients = [];

  if (highPriorityClients.length >= numberOfCustomers) {
    selectedClients = highPriorityClients.slice(0, numberOfCustomers);
  } else {
    selectedClients = highPriorityClients;
    const remaining = numberOfCustomers - highPriorityClients.length;
    selectedClients = selectedClients.concat(lowPriorityClients.slice(0, remaining));
  }

  return selectedClients;
}

function personalizeMessage(template, client) {
  return template
    .replace("[Customer Name]", client.name)
    .replace("[Barber Shop Name]", "Your Barber Shop")
    .replace("[Phone Number]", "123-456-7890")
    .replace("[Website URL]", "https://yourbarbershop.com");
}

async function sendOutreachMessages(clients, messageTemplate) {
  try {
    const personalizedMessages = await Promise.all(clients.map(async (client) => {
      const clientData = await getClientById(client.customerId);
      return personalizeMessage(messageTemplate, clientData);
    }));
    const phoneNumbers = clients.map(client => client.phoneNumber);
    const messages = personalizedMessages;

    await sendMessages(phoneNumbers, messages);

    // Update outreach dates
    const currentDate = new Date().toISOString().split('T')[0];
    await Promise.all(clients.map(client => updateClientOutreachDate(client.customerId, currentDate)));

    logger.info("Outreach messages sent and outreach dates updated.");
    return "Outreach messages sent successfully and outreach dates updated.";
  } catch (error) {
    logger.error("Error sending outreach messages:", error);
    throw error;
  }
}

// Schedule the fillMyCalendar function to run daily at 8 AM
schedule.scheduleJob('0 8 * * *', async () => {
  const startDate = getTodayDate();
  const endDate = getFutureDate(7); // Next 7 days
  const appointmentType = 'standard';
  const addOnArray = [];

  try {
    const result = await fillMyCalendar(startDate, endDate, appointmentType, addOnArray);
    console.log("Calendar filled successfully:", result);
  } catch (error) {
    console.error("Failed to fill calendar:", error);
  }
});

module.exports = {
  fillMyCalendar
};