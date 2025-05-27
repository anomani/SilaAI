const { getClientById, getOldClients, updateClientOutreachInfo, getNumberOfCustomersContacted, getDynamicLapsedClients } = require('../model/clients');
const { getAvailableSlots } = require('./tools/getAvailableSlots');
const { OpenAI } = require('openai');
const { zodResponseFormat } = require("openai/helpers/zod");
const { z } = require("zod");
const { saveSuggestedResponse, getNumberOfSuggestedResponses, getMessagesByClientId } = require('../model/messages');
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

async function fillMyCalendar(userId) {
  try {
    console.log(`\n🚀 Starting fillMyCalendar for user ${userId}...`);
    
    const suggestedResponsesCount = await getNumberOfSuggestedResponses(userId);
    console.log(`📊 Current suggested responses count: ${suggestedResponsesCount}`);
    
    // Add protection: Skip if we've run recently and created responses
    const recentOutreachCheck = await checkRecentOutreach(userId);
    if (recentOutreachCheck.shouldSkip) {
      console.log(`⏸️ Skipping fillMyCalendar: ${recentOutreachCheck.reason}`);
      return `Skipping fillMyCalendar: ${recentOutreachCheck.reason}`;
    }
    
    // if (suggestedResponsesCount >= 20) {
    //   console.log("Skipping fillMyCalendar: 20 or more suggested responses already stored.");
    //   return "Skipping fillMyCalendar: 20 or more suggested responses already stored.";
    // }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 7);

    console.log(`📅 Analyzing available slots from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    
    const availableSlots = await getAvailableSlots(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], userId);
    
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
      console.log("❌ Skipping fillMyCalendar: No empty slots available.");
      return "Skipping fillMyCalendar: No empty slots available.";
    }
    
    console.log(`📈 Available slots analysis:`);
    console.log(`   Total empty spots: ${totalEmptySpots}`);
    console.log(`   Slots by group:`, slotsByGroup);
    
    // Use dynamic lapsed clients instead of old static approach
    console.log(`\n🔍 Analyzing lapsed clients using dynamic system...`);
    const dynamicLapsedClients = await getDynamicLapsedClients(userId);
    if (dynamicLapsedClients.length === 0) {
      console.log("❌ No eligible clients found using dynamic analysis.");
      return "No outreach messages sent. No eligible clients found using dynamic analysis.";
    }

    console.log(`✅ Found ${dynamicLapsedClients.length} dynamically identified lapsed clients`);
    console.log(`📊 Top 5 clients by readiness score:`);
    dynamicLapsedClients.slice(0, 5).forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.firstname} ${client.lastname} (Score: ${client.readiness_score}/100)`);
    });

    // Prepare enhanced data for strategy decision
    const data = {
      appointmentData: {
        totalEmptySpots,
        slotsByGroup,
        timeframeDays: calculateTimeframe(startDate, endDate)
      },
      customerData: dynamicLapsedClients.slice(0, 20).map(client => ({
        customerId: client.id,
        lastVisitDate: client.last_appointment_date || null,
        group: client.group || 1,
        readinessScore: client.readiness_score,
        personalThreshold: client.personal_threshold,
        daysSinceLastAppointment: client.days_since_last_appointment,
        totalAppointments: client.total_appointments,
        avgSpending: client.avg_spending,
        responseRate: client.response_rate,
        daysSinceLastOutreach: client.days_since_last_outreach,
        isOverdue: client.is_overdue
      })),
      outreachStatus: {
        numberOfCustomersAlreadyContacted: await getNumberOfCustomersContacted(30, userId)
      },
      conversionRateEstimate: {
        estimatedConversionRate: 0.05
      }
    };
    
    console.log(`\n🤖 Preparing AI strategy with data for ${data.customerData.length} top clients...`);
    console.log(`📈 Outreach context: ${data.outreachStatus.numberOfCustomersAlreadyContacted} customers contacted in last 30 days`);
    
    // Determine the best strategy using LLM
    console.log(`\n🧠 Consulting AI for optimal outreach strategy...`);
    const strategy = await determineStrategy(data);
    console.log(`\n✅ AI Strategy determined:`);
    console.log(`📋 Strategy: ${strategy.recommendedStrategy}`);
    console.log(`🎯 Customers to contact: ${strategy.specificActions.customersToContact.length} clients`);
    console.log(`📝 Client IDs: [${strategy.specificActions.customersToContact.join(', ')}]`);
    
    // Execute the strategy
    console.log(`\n🎯 Selecting clients based on AI strategy...`);
    const selectedClients = await selectClientsBasedOnStrategy(strategy, dynamicLapsedClients);
    console.log(`\n📋 FINAL SELECTION - ${selectedClients.length} clients selected for outreach:`);
    
    selectedClients.forEach((client, index) => {
      console.log(`\n${index + 1}. 👤 ${client.firstname} ${client.lastname}`);
      console.log(`   📞 Phone: ${client.phonenumber}`);
      console.log(`   📊 Readiness Score: ${client.readiness_score}/100`);
      console.log(`   📅 Days since last appointment: ${client.days_since_last_appointment}`);
      console.log(`   🎯 Personal threshold: ${client.personal_threshold} days`);
      console.log(`   💬 Response rate: ${client.response_rate}%`);
      console.log(`   📱 Days since last outreach: ${client.days_since_last_outreach}`);
      console.log(`   💰 Avg spending: $${Number(client.avg_spending || 0).toFixed(2)}`);
      console.log(`   🏷️ Preferred service: ${client.preferred_appointment_type || 'N/A'}`);
      console.log(`   ⚡ Group: ${client.group}`);
    });

    // TESTING MODE: Skip actual saving of suggested responses
    console.log(`\n🧪 TESTING MODE: Skipping actual message saving`);
    console.log(`✅ Would have saved suggested responses for ${selectedClients.length} clients`);
    console.log(`📊 Summary:`);
    console.log(`   - Total empty slots: ${totalEmptySpots}`);
    console.log(`   - Eligible clients found: ${dynamicLapsedClients.length}`);
    console.log(`   - Clients selected for outreach: ${selectedClients.length}`);
    console.log(`   - Average readiness score: ${(selectedClients.reduce((sum, c) => sum + c.readiness_score, 0) / selectedClients.length).toFixed(1)}`);
    
    
    // COMMENTED OUT FOR TESTING:
    // Save suggested responses
    const result = await saveSuggestedResponses(selectedClients);
    return result;
  } catch (error) {
    console.error("❌ Error in fillMyCalendar:", error);
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
    I am trying to fill empty appointment slots for a barber shop using intelligent outreach to clients who are overdue based on their personal booking patterns. I need to maximize revenue while ensuring all slots are filled within the next few days. Given the data below, please provide the best strategy and the specific actions I should take next. Include a list of customer IDs to contact.

    Input Data:

    Appointment Data:
    Total Empty Spots: ${data.appointmentData.totalEmptySpots}
    Slots by Group: ${JSON.stringify(data.appointmentData.slotsByGroup)}
    Timeframe (days): ${data.appointmentData.timeframeDays}

    Customer Data (with dynamic analysis):
    ${JSON.stringify(data.customerData, null, 2)}

    Outreach Status:
    Number of Customers Already Contacted: ${data.outreachStatus.numberOfCustomersAlreadyContacted}

    Conversion Rate Estimate:
    Estimated Conversion Rate: ${data.conversionRateEstimate.estimatedConversionRate}

    Please consider the following when recommending a strategy:
    1. Each client has a personalized readiness score (0-100) based on their booking patterns and message history
    2. Higher readiness scores indicate clients who are more likely to respond and book
    3. Personal thresholds are calculated based on each client's individual booking frequency
    4. Response rates show how well clients typically respond to outreach
    5. Match clients to their preferred appointment groups when possible
    6. Prioritize clients with higher readiness scores and better response rates
    7. Consider the days since last outreach to avoid over-messaging

    Provide a list of specific customer IDs that best match the available slots, prioritizing by their readiness scores and group preferences.
  `;

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini-2024-07-18", 
      messages: [
        { role: "system", content: "You are a strategic AI assistant for a barber shop. Provide a data-driven strategy to fill empty appointment slots using personalized client analysis." },
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
  // Enhanced fallback strategy using readiness scores
  const sortedClients = data.customerData
    .sort((a, b) => b.readinessScore - a.readinessScore)
    .slice(0, Math.min(10, data.appointmentData.totalEmptySpots * 2)); // Contact 2x the slots needed
    
  return {
    recommendedStrategy: "Contact the highest readiness score clients based on their personal booking patterns and communication history.",
    specificActions: {
      customersToContact: sortedClients.map(customer => customer.customerId)
    },
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
      const clientData = client;
      console.log(`Processing client: ${clientData.firstname} ${clientData.lastname} (Score: ${clientData.readiness_score})`);
      
      // Calculate weeks since last visit for more personalized messaging
      const weeksSinceLastVisit = Math.ceil(clientData.days_since_last_appointment / 7);
      const catchUpMessage = getCatchUpMessage(weeksSinceLastVisit);
      console.log(`Weeks since last visit: ${weeksSinceLastVisit}, Message: ${catchUpMessage}`);
      
      const customPrompt = `Your task is to get the user to return to the barber shop through normal informal conversation. Just talk to them very casually and use the conversation history in order to assess how to address the user. Don't immediately bring up that you should come back use informal small talk and then when you see fit bring up that you should swing by the barbershop sometime and when you feel that the user wants to book then use the scheduling instructions to accomplish this.

Here is an example conversation:
AI: Hey man this is Uzi from Uzi cuts. How you doing?

Customer: Im good bro how you been

AI: Im good man. Havent heard from you in a while what you been up to

Customer: Ive been good just busy with work and everything

AI: ${catchUpMessage}

IMPORTANT CONTEXT:
- This client typically books every ${Math.round(clientData.personal_threshold || 90)} days
- It's been ${clientData.days_since_last_appointment} days since their last appointment
- Their response rate to messages is ${clientData.response_rate || 0}%
- Last outreach was ${clientData.days_since_last_outreach} days ago

Make sure to say something along the lines of this somewhere in the conversation: ${catchUpMessage}
Never ask them if they need a cut. If they are asking to see if first make sure that they want to book an appointment before starting the book Appointment sequence. We want this to be a conversation among friends not like a sales pitch.

Adjust your approach based on their response history - if they're a good responder, be more direct. If they rarely respond, be more casual and patient.`;

      await storeAIPrompt(client.id, customPrompt);
      // Check if client has message history to determine message type
      const messageHistory = await getMessagesByClientId(client.id);
      
      let personalizedMessage;
      if (!messageHistory || messageHistory.length === 0) {
        // First time message - introduce yourself and the new business number
        personalizedMessage = "Hey {name}, this is Uzi from Uzi Cuts reaching out from my new business number. How's everything going bro?"
          .replace("{name}", clientData.firstname);
      } else {
        // Regular outreach message - more casual since they know you
        personalizedMessage = "Hey {name}, how's everything going bro?"
          .replace("{name}", clientData.firstname);
      }
      // Save the suggested response with OUTREACH type
      return saveSuggestedResponse(client.id, personalizedMessage, clientData.user_id, 'OUTREACH');
    }));

    return `Suggested responses saved for ${savedResponses.length} clients using dynamic analysis.`;
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
  if (weeksSinceLastVisit <= 54) {
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


// async function main() {
//   await runSaveSuggestedResponsesForClient(3670);
// }

// main()


async function runFillMyCalendarForUser(userId) {
  try {
    console.log(`Running fillMyCalendar for user ${userId}`);
    const result = await fillMyCalendar(userId);
    console.log(`fillMyCalendar result for user ${userId}:`, result);
    return result;
  } catch (error) {
    console.error(`Error running fillMyCalendar for user ${userId}:`, error);
    throw error;
  }
}

// Execute fillMyCalendar for user 1 (for testing)
async function main() {
  try {
    const result = await runFillMyCalendarForUser(1);
    console.log("\n🎉 Main execution complete:", result);
  } catch (error) {
    console.error("❌ Main execution failed:", error);
  }
}

// Run the main function
// main(); // Uncommented for testing

// Modify the module.exports to include the new function
module.exports = {
  fillMyCalendar,
};

/**
 * Checks if we've done recent outreach to prevent duplicate contacts
 * @param {number} userId - The user ID
 * @returns {Promise<Object>} Object with shouldSkip boolean and reason
 */
async function checkRecentOutreach(userId) {
  try {
    const { getNumberOfSuggestedResponses } = require('../model/messages');
    
    // Check if any suggested responses were created in the last hour
    const db = require('../model/dbUtils').getDB();
    const recentResponsesQuery = `
      SELECT COUNT(*) as recent_count
      FROM suggestedresponses sr
      INNER JOIN Client c ON sr.clientid = c.id
      WHERE c.user_id = $1 
      AND sr.createdat >= NOW() - INTERVAL '1 hour'
      AND sr.type = 'OUTREACH'
    `;
    
    const result = await db.query(recentResponsesQuery, [userId]);
    const recentCount = parseInt(result.rows[0].recent_count);
    
    if (recentCount > 0) {
      return {
        shouldSkip: true,
        reason: `${recentCount} outreach messages created in the last hour. Waiting for cooldown.`
      };
    }
    
    // Check if we've contacted too many people today
    const todayResponsesQuery = `
      SELECT COUNT(*) as today_count
      FROM suggestedresponses sr
      INNER JOIN Client c ON sr.clientid = c.id
      WHERE c.user_id = $1 
      AND sr.createdat >= CURRENT_DATE
      AND sr.type = 'OUTREACH'
    `;
    
    const todayResult = await db.query(todayResponsesQuery, [userId]);
    const todayCount = parseInt(todayResult.rows[0].today_count);
    const dailyLimit = 20; // Max 20 outreach per day
    
    if (todayCount >= dailyLimit) {
      return {
        shouldSkip: true,
        reason: `Daily outreach limit reached (${todayCount}/${dailyLimit}). Try again tomorrow.`
      };
    }
    
    return {
      shouldSkip: false,
      reason: `Safe to proceed. Recent: ${recentCount}, Today: ${todayCount}/${dailyLimit}`
    };
    
  } catch (error) {
    console.error('Error checking recent outreach:', error);
    // If we can't check, err on the side of caution
    return {
      shouldSkip: true,
      reason: 'Unable to verify recent outreach status. Skipping for safety.'
    };
  }
}