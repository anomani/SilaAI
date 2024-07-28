const { OpenAI } = require('openai');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { getAvailability, getCurrentDate, findNextAvailableSlots } = require('./tools/getAvailability');
const { bookAppointment } = require('./tools/bookAppointment');
const {cancelAppointment} = require('./tools/cancelAppointment')
const { getClientByPhoneNumber,getDaysSinceLastAppointment, createClient } = require('../model/clients');
const {getMessagesByClientId} = require('../model/messages')
const {getAllAppointmentsByClientId, getUpcomingAppointments} = require('../model/appointment')
const fs = require('fs');
const path = require('path');
const { createRecurringAppointments } = require('./tools/recurringAppointments');
const { findRecurringAvailability } = require('./tools/recurringAvailability');
const { appointmentTypes, addOns } = require('../model/appointmentTypes');
const { getAIPrompt } = require('../model/aiPrompt');
const { Anthropic } = require('@anthropic-ai/sdk');
const { rPush, lRange, del, set, get } = require('../config/redis');
const { sendMessage } = require('../config/twilio');
const { messageQueue } = require('../config/queueConfig');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const assistants = new Map();
const sessions = new Map();
function getAppointmentDuration(appointment) {
  const [startHour, startMinute] = appointment[0].starttime.split(':').map(Number);
  const [endHour, endMinute] = appointment[0].endtime.split(':').map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  return endTotalMinutes - startTotalMinutes;
}
const tools = [
  {
    type: "function",
    function: {
      name: "getAvailability",
      description: "Given the day, appointment type, and add-ons, returns an array of available time slots.",
      parameters: {
        type: "object",
        properties: {
          day: {
            type: "string",
            description: "The day to check availability for, in the format YYYY-MM-DD."
          },
          appointmentType: {
            type: "string",
            enum: Object.keys(appointmentTypes),
            description: "The type of appointment they want to book."
          },
          addOns: {
            type: "array",
            items: {
              type: "string",
              enum: Object.keys(addOns)
            },
            description: "An array of add-ons for the appointment."
          },
          group: {
            type: "number",
            description: "The appointment group (1, 2, or 3)."
          }
        },
        required: ["day", "appointmentType", "addOns", "group"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "bookAppointment",
      description: "Runs script in order to book appointment returns confirmation or if it didn't work",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "The date for the appointment. Date should be converted to YYYY-MM-DD"
          },
          startTime: {
            type: "string",
            description: "The start time for the appointment. This could be in 24-hour format like 14:30. Convert it into military time if it isnt already in the form of HH:MM."
          },
          appointmentType: {
            type: "string",
            enum: Object.keys(appointmentTypes),
            description: "The type of appointment they want to book."
          },
          group: {
            type: "number",
            description: "The appointment group that the appointment is in. Should be a number that is either 1,2, or 3"
          },
          addOns: {
            type: "array",
            description: "The add-ons for the appointment",
            items: {
              type: "string",
              enum: Object.keys(addOns)
            }
          }
        },
        required: ["date", "startTime", "appointmentType", "group", "addOns"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "cancelAppointment",
      description: "Cancels an appointment by the provided name. Make sure to ask for confirmation before cancelling you are going to be given the user's appointment time and info",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date of the appointment they want to cancel"
          }
        },
        required: ["date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getAllAppointmentsByClientId",
      description: "Gets all appointments for the client. This includes the appointment id, appointment type, client id, date, start time, end time, and details",
      parameters: {
        type: "object",
        properties: {
          clientId: {
            type: "string",
            description: "The ID of the client whose appointments are to be retrieved"
          }
        },
        required: ["clientId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "createClient",
      description: "Creates a new client if the client doesn't exist",
      parameters: {
        type: "object",
        properties: {
          firstName: {
            type: "string",
            description: "The first name of the client"
          },
          lastName: {
            type: "string",
            description: "The last name of the client"
          },
          phoneNumber: {
            type: "string",
            description: "The phone number of the client"
          },
          email: {
            type: "string",
            description: "The email address of the client"
          },
          notes: {
            type: "string",
            description: "Any additional notes about the client"
          }
        },
        required: ["firstName", "lastName", "phoneNumber"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "findRecurringAvailability",
      description: "Finds common available slots for recurring appointments over the next year",
      parameters: {
        type: "object",
        properties: {
          initialDate: {
            type: "string",
            description: "The initial date to start searching from (YYYY-MM-DD)"
          },
          appointmentDuration: {
            type: "number",
            description: "Duration of appointment in minutes"
          },
          group: {
            type: "number",
            description: "Appointment group (1, 2, or 3)"
          },
          recurrenceRule: {
            type: "object",
            properties: {
              type: { 
                type: "string", 
                enum: ["daily", "weekly", "monthly"], 
                description: "Type of recurrence. If we have a monthly recurrence then both the day of the week and week of month are required. If we have a weekly recurrence then only the day of the week is required." 
              },
              interval: {
                type: "number",
                description: "Interval for recurrence (e.g., every 2 weeks, every 3 months)"
              },
              dayOfWeek: { 
                type: "number", 
                description: "Day of week (0-6, where 0 is Sunday), for weekly recurrence" 
              },
              weekOfMonth: { 
                type: "number", 
                description: "Week of month (1-5), for monthly recurrence" 
              }
            },
            required: ["type"]
          },
          clientId: {
            type: "number",
            description: "The ID of the client booking the recurring appointment"
          }
        },
        required: ["initialDate", "appointmentDuration", "group", "recurrenceRule", "clientId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "createRecurringAppointments",
      description: "Creates recurring appointments for the next year",
      parameters: {
        type: "object",
        properties: {
          initialDate: {
            type: "string",
            description: "The date for the first appointment (YYYY-MM-DD)"
          },
          startTime: {
            type: "string",
            description: "The start time for the appointments (HH:MM)"
          },
          appointmentType: { type: "string", description: "Type of appointment" },
          appointmentDuration: { type: "number", description: "Duration of appointment in minutes" },
          group: { type: "number", description: "Appointment group (1, 2, or 3)" },
          price: { type: "number", description: "Price of the appointment" },
          addOnArray: { 
            type: "array", 
            items: { type: "string" },
            description: "Array of add-ons for the appointment"
          },
          recurrenceRule: {
            type: "object",
            properties: {
              type: { 
                type: "string", 
                enum: ["daily", "weekly", "biweekly", "monthly", "custom"], 
                description: "Type of recurrence" 
              },
              interval: {
                type: "number",
                description: "Interval for recurrence (e.g., every 2 weeks, every 3 months)"
              },
              dayOfWeek: { 
                type: "number", 
                description: "Day of week (0-6, where 0 is Sunday), for weekly recurrence" 
              },
              dayOfMonth: { 
                type: "number", 
                description: "Day of month (1-31), for monthly recurrence" 
              },
              weekOfMonth: { 
                type: "number", 
                description: "Week of month (1-5), for monthly recurrence" 
              }
            },
            required: ["type"]
          }
        },
        required: ["initialDate", "startTime", "fname", "lname", "phone", "email", "appointmentType", "appointmentDuration", "group", "price", "addOnArray", "recurrenceRule"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getUpcomingAppointments",
      description: "Gets the upcoming appointments for the client, sorted by date",
      parameters: {
        type: "object",
        properties: {
          clientId: {
            type: "string",
            description: "The ID of the client whose appointments are to be retrieved"
          },
          limit: {
            type: "number",
            description: "The maximum number of appointments to retrieve (optional)"
          }
        },
        required: ["clientId"]
      },
  },
  },
  {
    type: "function",
    function: {
      name: "getCurrentDate",
      description: "Gets the current date and time",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
    }
];

const DELAY_TIME = 120000; // 2 minutes in milliseconds

async function createThread(phoneNumber, initialMessage = false) {
  if (initialMessage || !sessions.has(phoneNumber)) {
    const thread = await openai.beta.threads.create();
    sessions.set(phoneNumber, thread);
  }
  return sessions.get(phoneNumber);
}

async function createAssistant(fname, lname, phone, messages, appointment, day, client, upcomingAppointment) {
  const instructionsPath = path.join(__dirname, 'Prompts', 'assistantInstructions.txt');
  let assistantInstructions = fs.readFileSync(instructionsPath, 'utf-8');
  
  // Get the AI prompt for this client
  const aiPrompt = await getAIPrompt(client.id);

  // Format messages for better readability
  const formattedMessages = messages.map(msg => 
    `From: ${msg.fromtext}\nTo: ${msg.totext}\nDate: ${msg.date}\nMessage: ${msg.body}`
  ).join('\n\n');

  // Place aiPrompt before assistantInstructions
  let fullInstructions = `${aiPrompt}\n\n${assistantInstructions}`;
  fullInstructions = fullInstructions
    .replace('${appointment}', JSON.stringify(appointment, null, 2))
    .replace('${fname}', fname)
    .replace('${lname}', lname)
    .replace('${phone}', phone)
    .replace('${messages}', formattedMessages)
    .replace('${day}', day)
    .replace('${upcomingAppointment}', upcomingAppointment);

  if (!assistants.has(phone)) {
    const newAssistant = await openai.beta.assistants.create({
      instructions: fullInstructions,
      name: `Scheduling Assistant for ${fname} ${lname}`,
      model: "gpt-4o",
      tools: tools,
      temperature: 0
    });
    assistants.set(phone, newAssistant);
  }
  return assistants.get(phone);
}

async function createTemporaryAssistant(phoneNumber) {
  const newAssistant = await openai.beta.assistants.create({
    instructions: "Simply say. Hey bro, don't think I've heard from you before. Can you just give me your first and last name so I can save it? Then call the createClient tool with the corresponding first name and last name",
    name: `Assistant to get name of the client`,
    model: "gpt-4o",
    tools: tools,
    temperature: 0
  });
  return newAssistant;
}

async function handleToolCalls(requiredActions, client) {
  const toolOutputs = [];

  for (const action of requiredActions.tool_calls) {
    const funcName = action.function.name;
    const args = JSON.parse(action.function.arguments);

    let output;
    let totalDuration;
    switch (funcName) {
      case "getAvailability":
        const appointmentTypeInfo = appointmentTypes[args.appointmentType];
        if (!appointmentTypeInfo) {
          throw new Error(`Invalid appointment type: ${args.appointmentType}`);
        }
        totalDuration = calculateTotalDuration(args.appointmentType, args.addOns);
        output = await getAvailability(args.day, args.appointmentType, args.addOns, args.group, totalDuration);
        if (output.length === 0) {
          output = {
            requestedDay: args.day,
            nextAvailableSlots: await findNextAvailableSlots(args.day, args.appointmentType, args.addOns, args.group)
          };
        }
        break;
      case "bookAppointment":
        const appointmentInfo = appointmentTypes[args.appointmentType];
        const addOnInfo = args.addOns.map(addon => addOns[addon]);
        const totalPrice = appointmentInfo.price + addOnInfo.reduce((sum, addon) => sum + addon.price, 0);
        totalDuration = calculateTotalDuration(args.appointmentType, args.addOns);
        output = await bookAppointment(
          args.date,
          args.startTime,
          client.firstname,
          client.lastname,
          client.phonenumber,
          client.email,
          args.appointmentType,
          totalDuration,
          args.group,
          totalPrice,
          args.addOns
        );
        break;
      case "cancelAppointment":
        output = await cancelAppointment(client.phonenumber, args.date);
        break;
      case "getAllAppointmentsByClientId":
        output = await getAllAppointmentsByClientId(client.id);
        break;
      case "createClient":
        output = await createClient(args.firstName, args.lastName, client.phonenumber);
        break;
      case "findRecurringAvailability":
        output = await findRecurringAvailability(
          args.initialDate,
          args.appointmentDuration,
          args.group,
          args.recurrenceRule,
          client.id
        );
        break;
      case "createRecurringAppointments":
        output = await createRecurringAppointments(
          args.initialDate,
          args.startTime,
          client.firstname,
          client.lastname,
          client.phonenumber,
          client.email,
          args.appointmentType,
          args.appointmentDuration,
          args.group,
          args.price,
          args.addOnArray,
          args.recurrenceRule
        );
        break;
      case "getUpcomingAppointments":
        output = await getUpcomingAppointments(client.id, args.limit);
        break;
      case "getCurrentDate":
        output = await getCurrentDate();
        break;
      default:
        throw new Error(`Unknown function: ${funcName}`);
    }

    toolOutputs.push({
      tool_call_id: action.id,
      output: JSON.stringify(output)
    });
  }

  return toolOutputs;
}

async function processMessage(job) {
  const { Body, Author } = job.data;
  
  try {
    if (!Body || Body.trim() === '') {
      console.log(`Received empty message from ${Author}`);
      return "Empty message";
    }

    const client = await getClientByPhoneNumber(Author);
    let thread = await createThread(Author);

    // Add user message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: Body
    });

    const shouldRespond = await shouldAIRespond(Body, thread);
    if (!shouldRespond) {
      console.log(`AI decided not to respond to message from ${Author}`);
      return "user"; // Indicate that human attention is required
    }

    let assistant;
    const currentDate = new Date(getCurrentDate());
    const day = currentDate.toLocaleString('en-US', { weekday: 'long' });
    let fname, lname, email;

    if (client.id == '') {
      thread = await createThread(Author, true); 
      assistant = await createTemporaryAssistant(Author);
    } else {
      const upcomingAppointmentJSON = (await getUpcomingAppointments(client.id, 1))[0];
      let upcomingAppointment = '';
      if (upcomingAppointmentJSON) {
        const appointmentDate = upcomingAppointmentJSON.date;
        const appointmentTime = upcomingAppointmentJSON.starttime;
        upcomingAppointment = `Date: ${appointmentDate} Time: ${appointmentTime}`;
      }
      const messages = (await getMessagesByClientId(client.id)).slice(-10);
      const appointment = (await getAllAppointmentsByClientId(client.id)).slice(-5);
      let appointmentDuration = appointment.length > 0 ? getAppointmentDuration(appointment) : 30;
      
      const daysSinceLastAppointment = getDaysSinceLastAppointment(client.id);
      fname = client.firstname;
      lname = client.lastname;
      email = client.email;
      const phone = client.phonenumber;   
      thread = await createThread(Author); 
      assistant = await createAssistant(fname, lname, phone, messages, appointment[0].appointmenttype, currentDate, client, upcomingAppointment);
    }

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      additional_instructions: "Don't use commas or proper punctuation. The current date and time is" + currentDate +"and the day of the week is"+ day,
      
    });

    while (true) {
      await delay(1000);
      const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

      if (runStatus.status === "completed") {
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

        if (assistantMessage) {
          // Add verification step here with the thread
          const verifiedResponse = await verifyResponse(assistantMessage.content[0].text.value, client, thread);
          if (verifiedResponse && verifiedResponse.trim() !== '') {
            await sendMessage(Author, verifiedResponse);
          } else {
            console.log(`Empty AI response for message from ${Author}`);
          }
          return verifiedResponse || "Empty AI response";
        }
      } else if (runStatus.status === "requires_action") {
        const requiredActions = runStatus.required_action.submit_tool_outputs;
        const toolOutputs = await handleToolCalls(requiredActions, client);

        await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
          tool_outputs: toolOutputs
        });
      } else {
        await delay(1000);
      }
    }
  } catch (error) {
    console.error('Error processing message:', error);
    return "Error processing request";
  } finally {
    await del(`processing:${Author}`);
  }
}

function calculateTotalDuration(appointmentType, addOnArray) {
  const appointmentDuration = appointmentTypes[appointmentType].duration;
  const addOnsDuration = addOnArray.reduce((total, addOn) => total + addOns[addOn].duration, 0);
  return appointmentDuration + addOnsDuration;
}

async function verifyResponse(response, client, thread) {
  console.log("Verifying response: " + response);
  const verificationPromptPath = path.join(__dirname, 'Prompts', 'verificationPrompt.txt');
  let verificationPrompt = fs.readFileSync(verificationPromptPath, 'utf8');

  // Replace placeholders with actual values
  verificationPrompt = verificationPrompt
    .replace('${client.firstname}', client.firstname)
    .replace('${client.lastname}', client.lastname)
    .replace('${client.phonenumber}', client.phonenumber)
    .replace('${response}', response);

  const assistant = await openai.beta.assistants.create({
    instructions: verificationPrompt,
    name: "Response Verification Assistant",
    model: "gpt-4o",
    tools: tools,
    temperature: 0
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id,
  });

  while (true) {
    await delay(1000);
    const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

    if (runStatus.status === "completed") {
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      if (assistantMessage) {
        return assistantMessage.content[0].text.value;
      }
    } else if (runStatus.status === "requires_action") {
      const requiredActions = runStatus.required_action.submit_tool_outputs;
      const toolOutputs = await handleToolCalls(requiredActions, client);

      await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
        tool_outputs: toolOutputs
      });
    } else {
      await delay(1000);
    }
  }
}

async function shouldAIRespond(userMessage, thread) {
  try {
    const initialScreeningPath = path.join(__dirname, 'Prompts', 'initialScreening.txt');
    const initialScreeningInstructions = fs.readFileSync(initialScreeningPath, 'utf-8');

    // Create a new message in the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Should the AI respond to this message? Answer only with 'true' or 'false': "${userMessage}"`,
    });

    const assistant = await openai.beta.assistants.create({
      instructions: initialScreeningInstructions,
      name: "Initial Screening Assistant",
      model: "gpt-4o",
      temperature: 0
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    while (true) {
      await delay(1000);
      const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

      if (runStatus.status === "completed") {
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        if (assistantMessage) {
          const aiDecision = assistantMessage.content[0].text.value.trim().toLowerCase();
          console.log(aiDecision);
          return aiDecision === 'true';
        }
      } else {
        await delay(1000);
      }
    }
  } catch (error) {
    console.error("Error in shouldAIRespond:", error);
    return false; // Default to human attention if there's an error
  }
}

// Set up the queue processor
messageQueue.process(async (job) => {
  console.log('Processing job:', job.data);
  await processMessage(job);
});

module.exports = {
  createAssistant,
  createThread,
  shouldAIRespond,
  processMessage
};