const { getClientById, getOldClients, updateClientOutreachInfo, getNumberOfCustomersContacted } = require('../model/clients');
const { getAvailableSlots } = require('./tools/getAvailableSlots');
const { OpenAI } = require('openai');
const { zodResponseFormat } = require("openai/helpers/zod");
const { z } = require("zod");
const { saveSuggestedResponse, getNumberOfSuggestedResponses } = require('../model/messages');
const { storeAIPrompt } = require('../model/aiPrompt');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Ensure this environment variable is set
});

// Update the StrategySchema to include draftCustomerMessage
const StrategySchema = z.object({
  recommendedStrategy: z.string(),
  specificActions: z.object({
    customersToContact: z.array(z.number()), // Array of customer IDs
  }),
  // Removed draftCustomerMessage
});

async function fillMyCalendar() {
  try {
    const suggestedResponsesCount = await getNumberOfSuggestedResponses();
    if (suggestedResponsesCount >= 20) {
      console.log("Skipping fillMyCalendar: 20 or more suggested responses already stored.");
      return "Skipping fillMyCalendar: 20 or more suggested responses already stored.";
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 7);

    const availableSlots = await getAvailableSlots(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
    
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
    
    if (totalEmptySpots === 0) {
      console.log("Skipping fillMyCalendar: No empty slots available.");
      return "Skipping fillMyCalendar: No empty slots available.";
    }

    const oldClients = await getOldClients();
    if (oldClients.length === 0) {
      return "No outreach messages sent. No eligible clients.";
    }

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
    // Determine the best strategy using LLM
    const strategy = await determineStrategy(data);
    
    // Execute the strategy
    const selectedClients = await selectClientsBasedOnStrategy(strategy, oldClients);
    console.log(selectedClients);

    // Save suggested responses
    const result = await saveSuggestedResponses(selectedClients);
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

async function saveSuggestedResponses(clients) {
  try {
    const savedResponses = await Promise.all(clients.map(async (client) => {
      // Update outreach info before saving suggested response
      await updateClientOutreachInfo(client.id);
      const clientData = client
      console.log(clientData);
      // const weeksSinceLastVisit = calculateWeeksSinceLastVisit(clientData.lastvisitdate);
      const weeksSinceLastVisit = 2;
      // Choose the appropriate message based on the time since last visit
      const catchUpMessage = getCatchUpMessage(weeksSinceLastVisit);
      console.log(catchUpMessage);
      // Set custom prompt for the client
      const customPrompt = `Your task is to get the user to return to the barber shop through normal informal conversation. Just talk to them very casually and use the conversation history in order to assess how to address the user. Don't immediately bring up that you should come back use informal small talk and then when you see fit bring up that you should swing by the barbershop sometime and when you feel that the user wants to book then use the scheduling instructions to accomplish this.

Here is an example conversation:
AI: Hey man this is Uzi from Uzi cuts. How you doing?

Customer: Im good bro how you been

AI: Im good man. Havent heard from you in a while what you been up to

Customer: Ive been good just busy with work and everything

AI: ${catchUpMessage}

Make sure to say something along the lines of this somewhere in the conversation: ${catchUpMessage}
Never ask them if they need a cut. If they are asking to see if first make sure that they want to book an appointment before starting the book Appoiontment sequence. We want this to be a conversation among friends not like a sales pitch`;

      await storeAIPrompt(client.id, customPrompt);

      const personalizedMessage = "Hey {name}, this is Uzi from Uzi Cuts reaching out from my new business number. How's everything going bro"
        .replace("{name}", clientData.firstname);
      return saveSuggestedResponse(client.id, personalizedMessage);
    }));

    return `Suggested responses saved for ${savedResponses.length} clients.`;
  } catch (error) {
    console.error("Error in saveSuggestedResponses:", error);
    throw error;
  }
}

function calculateWeeksSinceLastVisit(lastVisitDate) {
  const lastVisit = new Date(lastVisitDate);
  const now = new Date();
  const diffTime = Math.abs(now - lastVisit);
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks;
}

function getCatchUpMessage(weeksSinceLastVisit) {
  if (weeksSinceLastVisit <= 6) {
    return "Would love to catch up. When can I see you next?";
  } else {
    return "I just wanted to say thank you for once being a part of my barber journey and trusting me with your image. It really means a lot. Would love to catch up on all the big moments since we last met. When can I see you and bless you next? 🙌";
  }
}

// Add this new function at the end of the file
async function runSaveSuggestedResponsesForClient(clientId) {
  try {
    const client = await getClientById(clientId);
    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }

    const result = await saveSuggestedResponses([client]);
    console.log(result);
    return result;
  } catch (error) {
    console.error(`Error running saveSuggestedResponses for client ${clientId}:`, error);
    throw error;
  }
}


async function main() {
  await runSaveSuggestedResponsesForClient(3670);
}

main()

// Modify the module.exports to include the new function
module.exports = {
  fillMyCalendar,
};