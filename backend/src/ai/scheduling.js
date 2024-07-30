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
const { clearCustomPrompt } = require('./tools/clearCustomPrompt');
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
  },
  {
    type: "function",
    function: {
      name: "clearCustomPrompt",
      description: "Clears the custom prompt for the client. Use this where specified in the prompt",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];


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
      case "clearCustomPrompt":
        output = await clearCustomPrompt(client.id);
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

async function handleUserInput(userMessages, phoneNumber) {
  console.log(`Starting handleUserInput for ${phoneNumber}`);
  try {
    const client = await getClientByPhoneNumber(phoneNumber);
    if (!client) {
      console.log(`No client found for phone number ${phoneNumber}`);
      throw new Error(`No client found for phone number ${phoneNumber}`);
    }
    console.log(`Client found: ${JSON.stringify(client)}`);

    let thread = await createThread(phoneNumber);
    console.log(`Thread created/retrieved: ${thread.id}`);

    // Add all user messages to the thread
    for (const message of userMessages) {
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: message,
      });
    }
    console.log(`Added ${userMessages.length} messages to the thread`);

    const shouldRespond = await shouldAIRespond(userMessages);
    console.log(`AI should respond: ${shouldRespond}`);
    if (!shouldRespond) {
      return "user"; // Indicate that human attention is required
    }

    let assistant;
    const currentDate = new Date(getCurrentDate());
    const day = currentDate.toLocaleString('en-US', { weekday: 'long' });
    let fname, lname, email;

    if (client.id == '') {
      console.log('Creating temporary assistant for new client');
      thread = await createThread(phoneNumber, true); 
      assistant = await createTemporaryAssistant(phoneNumber);
    } else {
      console.log('Creating assistant for existing client');
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
      thread = await createThread(phoneNumber); 
      assistant = await createAssistant(fname, lname, phone, messages, appointment[0].appointmenttype, currentDate, client, upcomingAppointment);
    }
    console.log(`Assistant created: ${assistant.id}`);

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      additional_instructions: "Don't use commas or proper punctuation. The current date and time is" + currentDate +"and the day of the week is"+ day,
      
    });
    console.log(`Run created: ${run.id}`);

    while (true) {
      await delay(1000);
      const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log(`Run status: ${runStatus.status}`);

      if (runStatus.status === "completed") {
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

        if (assistantMessage) {
          // If you want to re-enable verification, uncomment the next line
          return await verifyResponse(assistantMessage.content[0].text.value, client);
          
          // For now, return the assistant's message directly
          // return assistantMessage.content[0].text.value;
        } else {
          console.log('No assistant message found');
        }
      } else if (runStatus.status === "requires_action") {
        console.log('Run requires action');
        const requiredActions = runStatus.required_action.submit_tool_outputs;
        const toolOutputs = await handleToolCalls(requiredActions, client);

        await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
          tool_outputs: toolOutputs
        });
        console.log('Tool outputs submitted');
      } else if (runStatus.status === "failed") {
        console.error(`Run failed: ${JSON.stringify(runStatus.last_error)}`);
        throw new Error('Run failed');
      } else {
        console.log(`Waiting for run to complete. Current status: ${runStatus.status}`);
        await delay(1000);
      }
    }
  } catch (error) {
    console.error(`Error in handleUserInput for ${phoneNumber}:`, error);
    throw new Error('Error processing request');
  }
}

function calculateTotalDuration(appointmentType, addOnArray) {
  const appointmentDuration = appointmentTypes[appointmentType].duration;
  const addOnsDuration = addOnArray.reduce((total, addOn) => total + addOns[addOn].duration, 0);
  return appointmentDuration + addOnsDuration;
}

async function verifyResponse(response, client) {
  const verificationPromptPath = path.join(__dirname, 'Prompts', 'verificationPrompt.txt');
  let verificationPrompt = fs.readFileSync(verificationPromptPath, 'utf8');
  const currentDate = new Date(getCurrentDate());
  const day = currentDate.toLocaleString('en-US', { weekday: 'long' });
  // Replace placeholders with actual values
  verificationPrompt = verificationPrompt
    .replace('${client.firstname}', client.firstname)
    .replace('${client.lastname}', client.lastname)
    .replace('${client.phonenumber}', client.phonenumber)
    .replace('${response}', response)
    .replace('${currentDate}', currentDate)
    .replace('${day}', day)

  const assistant = await openai.beta.assistants.create({
    instructions: verificationPrompt,
    name: "Response Verification Assistant",
    model: "gpt-4o",
    tools: tools,
    temperature: 0
  });

  // Create a new thread for verification
  const verificationThread = await openai.beta.threads.create();

  // Add the response to be verified to the new thread
  await openai.beta.threads.messages.create(verificationThread.id, {
    role: "user",
    content: response,
  });

  const run = await openai.beta.threads.runs.create(verificationThread.id, {
    assistant_id: assistant.id,
  });

  while (true) {
    await delay(1000);
    const runStatus = await openai.beta.threads.runs.retrieve(verificationThread.id, run.id);

    if (runStatus.status === "completed") {
      const messages = await openai.beta.threads.messages.list(verificationThread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      if (assistantMessage) {
        return assistantMessage.content[0].text.value;
      }
    } else if (runStatus.status === "requires_action") {
      const requiredActions = runStatus.required_action.submit_tool_outputs;
      const toolOutputs = await handleToolCalls(requiredActions, client);

      await openai.beta.threads.runs.submitToolOutputs(verificationThread.id, run.id, {
        tool_outputs: toolOutputs
      });
    } else {
      await delay(1000);
    }
  }
}

async function shouldAIRespond(userMessages) {
  try {
    const initialScreeningPath = path.join(__dirname, 'Prompts', 'initialScreening.txt');
    const initialScreeningInstructions = fs.readFileSync(initialScreeningPath, 'utf-8');

    const screeningMessage = Array.isArray(userMessages) ? userMessages.join('\n') : userMessages;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 100,
      temperature: 0,
      system: initialScreeningInstructions,
      messages: [
        {
          role: "user",
          content: `Should the AI respond to these messages? Answer only with 'true' or 'false':\n${screeningMessage}`
        }
      ]
    });

    const aiDecision = response.content[0].text.trim().toLowerCase();
    console.log("AI decision on whether to respond:", aiDecision);
    return aiDecision === 'true';
  } catch (error) {
    console.error("Error in shouldAIRespond:", error);
    return false; // Default to human attention if there's an error
  }
}

module.exports = { getAvailability, bookAppointment, handleUserInput, createAssistant, createThread, shouldAIRespond };