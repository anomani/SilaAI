const { sendMessages } = require('../model/messages');
const { getClientById, getOldClients, updateClientOutreachInfo, getNumberOfCustomersContacted } = require('../model/clients');
const { getAvailableSlots } = require('./tools/getAvailableSlots');
const { OpenAI } = require('openai');
const { zodResponseFormat } = require("openai/helpers/zod");
const { z } = require("zod");
const { saveSuggestedResponse } = require('../model/messages');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Ensure this environment variable is set
});

// Update the StrategySchema
const StrategySchema = z.object({
  recommendedStrategy: z.string(),
  specificActions: z.object({
    customersToContact: z.array(z.number()), // Array of customer IDs
  }),
  // Removed draftCustomerMessage
});

async function fillMyCalendar(startDate, endDate) {
  try {
    const availableSlots = await getAvailableSlots(startDate, endDate);
    const oldClients = await getOldClients();
    console.log(oldClients.length);
    if (oldClients.length === 0) {
      return "No outreach messages sent. No eligible clients.";
    }

    // Calculate total empty spots and categorize them by group
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

    // Prepare data for strategy decision
    const data = {
      appointmentData: {
        totalEmptySpots,
        slotsByGroup,
        timeframeDays: calculateTimeframe(startDate, endDate)
      },
      customerData: oldClients.map(client => ({
        customerId: client.id,
        lastVisitDate: client.lastvisitdate,
        group: client.group 
      })),
      outreachStatus: {
        numberOfCustomersAlreadyContacted: await getNumberOfCustomersContacted()
      },
      conversionRateEstimate: {
        estimatedConversionRate: 0.05
      }
    };

    console.log(data);
    // // Determine the best strategy using LLM
    const strategy = await determineStrategy(data);
    console.log(strategy);
    // // Execute the strategy
    // const selectedClients = await selectClientsBasedOnStrategy(strategy, oldClients);
    // console.log(selectedClients);
    // // Use the predefined message instead of the AI-generated one
    // // const message = "Hey {name}, this is Uzi from Uzi Cuts reaching out from my new business number. How's everything going bro";

    // // Save suggested responses instead of sending messages
    // // const result = await saveSuggestedResponses(selectedClients, message);
    // return result;
  } catch (error) {
    console.error("Error in fillMyCalendar:", error);
    throw error;
  }
}

// async function main() {
//   await fillMyCalendar('2024-09-21', '2024-09-28');
// }

// main();


function calculateTimeframe(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

async function determineStrategy(data) {
  const prompt = `
    I am trying to fill empty appointment slots for a barber shop using direct outreach to lapsed customers. I need to maximize revenue while ensuring all slots are filled within the next few days. Given the data below, please provide the best strategy and the specific actions I should take next. Include a list of customer IDs to contact.

    Input Data:

    Appointment Data:
    Total Empty Spots: ${data.appointmentData.totalEmptySpots}
    Slots by Group: ${JSON.stringify(data.appointmentData.slotsByGroup)}
    Timeframe (days): ${data.appointmentData.timeframeDays}

    Customer Data:
    ${JSON.stringify(data.customerData, null, 2)}

    Outreach Status:
    Number of Customers Already Contacted: ${data.outreachStatus.numberOfCustomersAlreadyContacted}

    Conversion Rate Estimate:
    Estimated Conversion Rate: ${data.conversionRateEstimate.estimatedConversionRate}

    Please consider the different groups when recommending a strategy. Each group represents a different type of appointment or service. Provide a list of specific customer IDs that best match the available slots, considering their group preference and last visit date.
  `;

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini-2024-07-18", 
      messages: [
        { role: "system", content: "You are a strategic AI assistant for a barber shop. Provide a strategy to fill empty appointment slots." },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(StrategySchema, "strategy"),
    });

    const strategy = completion.choices[0].message.parsed;
    return strategy;
  } catch (error) {
    console.error("Error getting strategy from LLM:", error);
    // Fallback strategy
    return defaultStrategy(data);
  }
}

function defaultStrategy(data) {
  // Define a fallback strategy if LLM fails
  return {
    recommendedStrategy: "Contact the most recently visited customers from each group.",
    specificActions: {
      customersToContact: data.customerData.slice(0, 10).map(customer => customer.customerId)
    },
    // Removed draftCustomerMessage
  };
}

async function selectClientsBasedOnStrategy(strategy, clients) {
  // Filter clients based on the IDs provided by the strategy
  const selectedClients = clients.filter(client => 
    strategy.specificActions.customersToContact.includes(client.id)
  );

  // Sort selected clients by their order in the strategy's customersToContact array
  selectedClients.sort((a, b) => 
    strategy.specificActions.customersToContact.indexOf(a.id) - 
    strategy.specificActions.customersToContact.indexOf(b.id)
  );

  return selectedClients;
}

function personalizeMessage(template, client) {
  return template
    .replace("[Customer Name]", client.name)
    .replace("[Barber Shop Name]", "Your Barber Shop")
    .replace("[Phone Number]", "123-456-7890")
    .replace("[Website URL]", "https://yourbarbershop.com");
}

async function saveSuggestedResponses(clients, messageTemplate) {
  try {
    const savedResponses = await Promise.all(clients.map(async (client) => {
      // Update outreach info before saving suggested response
      await updateClientOutreachInfo(client.id);

      const clientData = await getClientById(client.id);
      const personalizedMessage = personalizeMessage(messageTemplate, clientData);
      return saveSuggestedResponse(client.id, personalizedMessage);
    }));

    return `Suggested responses saved for ${savedResponses.length} clients.`;
  } catch (error) {
    console.error("Error in saveSuggestedResponses:", error);
    throw error;
  }
}

// Schedule the fillMyCalendar function to run daily at 8 AM


module.exports = {
  fillMyCalendar
};