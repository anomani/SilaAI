const { OpenAI } = require('openai');
const dotenv = require('dotenv');
dotenv.config({ path: '../env' });
const { getAvailability, getCurrentDate, findNextAvailableSlots } = require('./tools/getAvailability');
const { bookAppointment, bookAppointmentInternal } = require('./tools/bookAppointment');
const {cancelAppointment, cancelAppointmentInternal} = require('./tools/cancelAppointment')
const { getClientByPhoneNumber, createClient, updateClientNames } = require('../model/clients');
const {getMessagesByClientId} = require('../model/messages')
const {getAllAppointmentsByClientId, getUpcomingAppointments, getAppointmentsByDay} = require('../model/appointment')
const fs = require('fs');
const path = require('path');
const { createRecurringAppointments, createRecurringAppointmentsInternal } = require('./tools/recurringAppointments');
const { findRecurringAvailability } = require('./tools/recurringAvailability');
const { appointmentTypes, addOns } = require('../model/appointmentTypes');
const { getAIPrompt , deleteAIPrompt} = require('../model/aiPrompt');
const { Anthropic } = require('@anthropic-ai/sdk');
const { rescheduleAppointmentByPhoneAndDate, rescheduleAppointmentByPhoneAndDateInternal } = require('./tools/rescheduleAppointment');
const { getThreadByPhoneNumber, saveThread } = require('../model/threads');
const { createWaitlistRequest } = require('../model/waitlist');
const { getAppointmentTypes, getAddOns } = require('../model/appTypes');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const assistants = new Map();
const sessions = new Map();

const tools = [
  {
    type: "function",
    function: {
      name: "getAvailability",
      description: "Given the day, appointment type, and add-ons, returns an array of available time slots for the given day. ",
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
          }
        },
        required: ["day", "appointmentType", "addOns"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "bookAppointment",
      description: "Books an appointment for a client. Returns confirmation if the appointment was booked or if the slot trying to be booked is unabailable",
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
          addOns: {
            type: "array",
            description: "The add-ons for the appointment",
            items: {
              type: "string",
              enum: Object.keys(addOns)
            }
          }
        },
        required: ["date", "startTime", "appointmentType", "addOns"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "cancelAppointment",
      description: "Cancels an appointment by the provided date. Make sure to ask for confirmation before cancelling you are going to be given the user's appointment time and info",
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
      description: "Gets the upcoming appointments for the client, sorted by date. When a customer is talking about an appointment in the future you can use this tool to find that appointment",
      parameters: {
        type: "object",
        properties: {
          clientId: {
            type: "string",
            description: "The ID of the client whose appointments are to be retrieved"
          },
          limit: {
            type: "number",
            description: "The maximum number of appointments to retrieve (optional). Default is 5 but if you need to see farther in the future you can increase this number"
          }
        },
        required: ["clientId"]
      },
    }
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
      description: "Clears the custom prompt for the client. Use this where specified in the instructions. Some customers have specific prompt add ons for their conversations. Call this function after the assistant confirms the appointment",
      parameters: {
        type: "object",
        properties: {
          clientId: {
            type: "number",
            description: "The ID of the client whose prompt is to be cleared"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "rescheduleAppointmentByPhoneAndDate",
      description: "Reschedules an appointment for the client. Make sure to ask for confirmation before rescheduling you are going to be given the user's appointment time and info. When rescheduling and finding availabilities do not ask again for the appointment type assume the same one as the last appointment",
      parameters: {
        type: "object",
        properties: {
          phoneNumber: {
            type: "string",
            description: "The phone number of the client"
          },
          currentDate: {
            type: "string",
            description: "The current date of the appointment"
          },
          newDate: {
            type: "string",
            description: "The new date of the appointment"
          },
          newStartTime: {
            type: "string",
            description: "The new start time of the appointment"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "createWaitlistRequest",
      description: "Creates a waitlist request for a client when they want to be notified about appointment openings",
      parameters: {
        type: "object",
        properties: {
          clientId: { type: "number" },
          requestType: { 
            type: "string", 
            enum: ["specific", "range"] 
          },
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date" },
          startTime: { type: "string", format: "time" },
          endTime: { type: "string", format: "time" },
          appointmentType: { type: "string" }
        },
        required: ["clientId", "requestType", "appointmentType"]
      }
    }
  }
];

async function createThread(phoneNumber, initialMessage = false, userId) {
  console.log('Function: createThread');
  console.log('Parameters:');
  console.log('phoneNumber:', phoneNumber);
  console.log('initialMessage:', initialMessage);
  console.log('userId:', userId);
  try {
    let thread;
    
    // Check if a thread already exists for this phone number
    const existingThread = await getThreadByPhoneNumber(phoneNumber, userId);

    if (existingThread && !initialMessage) {
      // Thread exists, retrieve it from OpenAI
      console.log('Retrieving existing thread from OpenAI');
      thread = await openai.beta.threads.retrieve(existingThread.thread_id);
    } else {
      // Create a new thread
      thread = await openai.beta.threads.create();
      
      // Store the new thread in the database
      await saveThread(phoneNumber, thread.id, userId);
    }

    sessions.set(phoneNumber, thread);
    return thread;
  } catch (error) {
    console.error(`Error in createThread for ${phoneNumber}:`, error);
    throw error;
  }
}

async function createAssistant(fname, lname, phone, messages, appointment, day, client, upcomingAppointment, userId) {
  const instructionsPath = path.join(__dirname, 'Prompts', 'assistantInstructions.txt');
  let assistantInstructions = fs.readFileSync(instructionsPath, 'utf-8');
    // Fetch appointment types and add-ons for the user
  const appointmentTypes = await getAppointmentTypes(userId);
  const addOns = await getAddOns(userId);

  // Group appointment types by group number
  const groupedAppointmentTypes = appointmentTypes.reduce((acc, type) => {
    if (!acc[type.group_number]) {
      acc[type.group_number] = [];
    }
    acc[type.group_number].push(type);
    return acc;
  }, {});

  // Create a string representation of appointment types
  let appointmentTypesString = '';
  for (const [group, types] of Object.entries(groupedAppointmentTypes)) {
    appointmentTypesString += `Group ${group}:\n`;
    types.forEach(type => {
      const price = typeof type.price === 'number' ? `CA$${type.price.toFixed(2)}` : type.price;
      appointmentTypesString += `  ${type.name} (${type.duration} minutes @ ${price})\n`;
    });    
    // Add availability information for the group
    if (types[0].availability) {
      appointmentTypesString += '  Availability:\n';
      for (const [day, times] of Object.entries(types[0].availability)) {
        appointmentTypesString += `    ${day}: ${times.join(', ')}\n`;
      }
    }
    appointmentTypesString += '\n';
  }
  console.log(appointmentTypesString);
  // Create a string representation of add-ons
  const addOnsString = addOns.map(addon => {
    const price = typeof addon.price === 'number' ? `CA$${addon.price.toFixed(2)}` : addon.price;
    return `${addon.name}: ${addon.duration} minutes @ ${price}\n  Compatible with: ${addon.compatible_appointment_types.join(', ')}`;
  }).join('\n\n');
  console.log(addOnsString);
  // Add the appointment types and add-ons information to the beginning of the instructions
  assistantInstructions = `Appointment Types:\n${appointmentTypesString}\nAdd-ons:\n${addOnsString}\n\n${assistantInstructions}`;
  
  // Get the AI prompt for this client
  const aiPrompt = await getAIPrompt(client.id);
  console.log("AI prompt", aiPrompt)
  // Place aiPrompt before assistantInstructions
  let fullInstructions = `${aiPrompt}\n\n${assistantInstructions}`;
  fullInstructions = fullInstructions
    .replace('${appointment}', appointment)
    .replace('${fname}', fname)
    .replace('${lname}', lname)
    .replace('${phone}', phone)
    .replace('${day}', day)
    .replace('${upcomingAppointment}', upcomingAppointment);


  if (!assistants.has(phone)) {
    const newAssistant = await openai.beta.assistants.create({
      instructions: fullInstructions,
      name: `Scheduling Assistant for ${fname} ${lname}`,
      model: "gpt-4o-mini",
      tools: tools,
      temperature: 0
    });
    assistants.set(phone, newAssistant);
  }
  return assistants.get(phone);
}

tempTools = [{
  type: "function",
  function: {
    name: "createClient",
    description: "Creates a new client if the client doesn't exist after getting their name",
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
        email: {
          type: "string",
          description: "The email address of the client"
        },
        notes: {
          type: "string",
          description: "Any additional notes about the client"
        }
      },
      required: ["firstName", "lastName"]
    }
  }
}]

async function createTemporaryAssistant(phoneNumber) {
  const newAssistant = await openai.beta.assistants.create({
    instructions: "Initially say hey bro, don't think I've heard from you before. Can you just give me your first and last name so I can save it? Then with the name that they give call the createClient tool with the corresponding first name and last name. After you call it respond by saying, How can I help you today bro. ALWAYS CALL createClient function",
    name: `Assistant to get name of the client`,
    model: "gpt-4-turbo",
    tools: tempTools,
    temperature: 0
  });
  return newAssistant;
}

async function handleToolCalls(requiredActions, client, phoneNumber, userId) {
  console.log(requiredActions)
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
        output = await getAvailability(args.day, args.appointmentType, args.addOns, userId, client.id);
        if (output.length === 0) {
          output = {
            requestedDay: args.day,
            nextAvailableSlots: await findNextAvailableSlots(args.day, args.appointmentType, args.addOns, userId)
          };
        }
        break;
      case "bookAppointment":
        const appointmentInfo = appointmentTypes[args.appointmentType];
        const addOnInfo = args.addOns.map(addon => addOns[addon]);
        const totalPrice = appointmentInfo.price + addOnInfo.reduce((sum, addon) => sum + addon.price, 0);
        output = await bookAppointment(
          args.date,
          args.startTime,
          client.firstname,
          client.lastname,
          client.phonenumber,
          client.email,
          args.appointmentType,
          totalPrice,
          args.addOns,
          userId
        );
        break;
      case "cancelAppointment":
        output = await cancelAppointment(client.phonenumber, args.date, userId);
        break;
      case "getAllAppointmentsByClientId":
        output = await getAllAppointmentsByClientId(client.id, userId);
        break;
      case "createClient":
        console.log("creating client")
        output = await updateClientNames(client.id, args.firstName, args.lastName);
        break;
      case "findRecurringAvailability":
        output = await findRecurringAvailability(
          args.initialDate,
          args.appointmentDuration,
          args.group,
          args.recurrenceRule,
          userId,
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
          args.addOns,
          args.recurrenceRule,
          userId,
          client.id
        );
        break;
      case "getUpcomingAppointments":
        output = await getUpcomingAppointments(args.clientId, args.limit, userId);
        break;
      case "getCurrentDate":
        output = getCurrentDate();
        break;
      case "clearCustomPrompt":
        console.log("clearing prompt!")
        output = await deleteAIPrompt(client.id);
        // Update the assistant instructions after clearing the custom prompt
        await updateAssistantInstructions(client.phonenumber);
        break;
      case "rescheduleAppointmentByPhoneAndDate":
        output = await rescheduleAppointmentByPhoneAndDate(client.phonenumber, args.currentDate, args.newDate, args.newStartTime, userId);
        break;
      case "createWaitlistRequest":
        console.log("Creating waitlist request with the following parameters:");
        console.log("Client ID:", client.id);
        console.log("Request Type:", args.requestType);
        console.log("Start Date:", args.startDate);
        console.log("End Date:", args.endDate);
        console.log("Start Time:", args.startTime);
        console.log("End Time:", args.endTime);
        console.log("Appointment Type:", args.appointmentType);
        output = await createWaitlistRequest(
          client.id,
          args.requestType,
          args.startDate,
          args.endDate,
          args.startTime,
          args.endTime,
          args.appointmentType,
          userId
        );
        break;
      default:
        const functionDetails = requiredActions.tool_calls[0].function;
        console.log(functionDetails);
        throw new Error(`Unknown function: ${funcName}`);
    }

    toolOutputs.push({
      tool_call_id: action.id,
      output: JSON.stringify(output)
    });
  }

  return toolOutputs;
}


async function handleToolCallsInternal(requiredActions, client, phoneNumber, userId) {
  console.log(requiredActions)
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
        output = await getAvailability(args.day, args.appointmentType, args.addOns, userId, client.id);
        if (output.length === 0) {
          output = {
            requestedDay: args.day,
            nextAvailableSlots: await findNextAvailableSlots(args.day, args.appointmentType, args.addOns, userId)
          };
        }
        break;
      case "bookAppointment":
        const appointmentInfo = appointmentTypes[args.appointmentType];
        const addOnInfo = args.addOns.map(addon => addOns[addon]);
        const totalPrice = appointmentInfo.price + addOnInfo.reduce((sum, addon) => sum + addon.price, 0);
        output = await bookAppointmentInternal(
          args.date,
          args.startTime,
          client.firstname,
          client.lastname,
          client.phonenumber,
          client.email,
          args.appointmentType,
          totalPrice,
          args.addOns,
          userId
        );
        break;
      case "cancelAppointment":
        output = await cancelAppointmentInternal(client.phonenumber, args.date);
        break;
      case "getAllAppointmentsByClientId":
        output = await getAllAppointmentsByClientId(client.id, userId);
        break;
      case "createClient":
        console.log("creating client")
        output = await createClient(args.firstName, args.lastName, phoneNumber, userId);
        break;
      case "findRecurringAvailability":
        output = await findRecurringAvailability(
          args.initialDate,
          args.appointmentDuration,
          args.group,
          args.recurrenceRule,
          client.id,
          userId
        );
        break;
      case "createRecurringAppointments":
        output = await createRecurringAppointmentsInternal(
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
          args.addOns,
          args.recurrenceRule,
          userId
        );
        break;
      case "getUpcomingAppointments":
        output = await getUpcomingAppointments(args.clientId, args.limit, userId);
        break;
      case "getCurrentDate":
        output = getCurrentDate();
        break;
      case "clearCustomPrompt":
        console.log("clearing prompt!")
        output = await deleteAIPrompt(client.id);
        // Update the assistant instructions after clearing the custom prompt
        await updateAssistantInstructions(client.phonenumber);
        break;
      case "rescheduleAppointmentByPhoneAndDate":
        output = await rescheduleAppointmentByPhoneAndDateInternal(client.phonenumber, args.currentDate, args.newDate, args.newStartTime);
        break;
      case "createWaitlistRequest":
        console.log("Creating waitlist request with the following parameters:");
        console.log("Client ID:", client.id);
        console.log("Request Type:", args.requestType);
        console.log("Start Date:", args.startDate);
        console.log("End Date:", args.endDate);
        console.log("Start Time:", args.startTime);
        console.log("End Time:", args.endTime);
        console.log("Appointment Type:", args.appointmentType);
        output = await createWaitlistRequest(
          client.id,
          args.requestType,
          args.startDate,
          args.endDate,
          args.startTime,
          args.endTime,
          args.appointmentType
        );
        break;
      default:
        const functionDetails = requiredActions.tool_calls[0].function;
        console.log(functionDetails);
        throw new Error(`Unknown function: ${funcName}`);
    }

    toolOutputs.push({
      tool_call_id: action.id,
      output: JSON.stringify(output)
    });
  }

  return toolOutputs;
}

// Add this new function to update assistant instructions
async function updateAssistantInstructions(phoneNumber) {
  if (assistants.has(phoneNumber)) {
    const assistant = assistants.get(phoneNumber);
    const instructionsPath = path.join(__dirname, 'Prompts', 'assistantInstructions.txt');
    let assistantInstructions = fs.readFileSync(instructionsPath, 'utf-8');

    // Update the assistant with the new instructions
    await openai.beta.assistants.update(assistant.id, {
      instructions: assistantInstructions,
    });

    console.log(`Updated instructions for assistant ${assistant.id}`);
  }
}

async function handleUserInput(userMessages, phoneNumber, userId) {
  console.log("userMessages", userMessages)
  try {
    const client = await getClientByPhoneNumber(phoneNumber, userId);
    console.log(`Client found: ${JSON.stringify(client)}`);

    let thread = await createThread(phoneNumber, false, userId);

    // Add all user messages to the thread
    for (const message of userMessages) {
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: message,
      });
    }

    let assistant;
    const currentDate = new Date(getCurrentDate());
    const dayOfWeek = currentDate.toLocaleString('en-US', { weekday: 'long' });
    const formattedDate = currentDate.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
    const dateTimeString = `${dayOfWeek}, ${formattedDate}`;
    console.log("Current date and time:", dateTimeString);
    let fname, lname, email;

    if (!client.firstname && !client.lastname) {
      thread = await createThread(phoneNumber, false, userId); 
      assistant = await createTemporaryAssistant(phoneNumber);
    } else {
      const upcomingAppointmentJSON = (await getUpcomingAppointments(client.id, 1, userId))[0];
      let upcomingAppointment = '';
      if (upcomingAppointmentJSON) {
        const appointmentDate = upcomingAppointmentJSON.date;
        const appointmentTime = upcomingAppointmentJSON.starttime;
        upcomingAppointment = `Date: ${appointmentDate} Time: ${appointmentTime}`;
      }

      const messages = (await getMessagesByClientId(client.id)).slice(-10);
      const appointment = (await getAllAppointmentsByClientId(client.id, userId)).slice(0,5);
      console.log("appointment", appointment)

      let appointmentType = '';
      if (appointment.length > 0) {
        appointmentType = appointment[0].appointmenttype;
      }
      console.log(appointmentType)
      fname = client.firstname;
      lname = client.lastname;
      email = client.email;
      const phone = client.phonenumber;   
      thread = await createThread(phoneNumber, false, userId); 
      assistant = await createAssistant(fname, lname, phone, messages, appointmentType, currentDate, client, upcomingAppointment, userId);
    }


    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      additional_instructions: "Don't use commas or proper punctuation. The current date and time is" + dateTimeString,
    });

    const MAX_RETRIES = 3;
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
      try {
        await delay(1000);
        const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        console.log(runStatus.status)
        if (runStatus.status === "completed") {
          const messages = await openai.beta.threads.messages.list(thread.id);
          const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
          if (assistantMessage) {
            console.log(assistantMessage.content[0].text.value);
            if (assistantMessage.content[0].text.value === 'user' || assistantMessage.content[0].text.value === 'User') {
              return 'user';
            }
            const verifiedResponse = await verifyResponse(assistantMessage.content[0].text.value, client, thread);
            return verifiedResponse
            
          } else {
            return "user";
          }
        } else if (runStatus.status === "requires_action") {
          console.log("requires action")
          const requiredActions = runStatus.required_action.submit_tool_outputs;
          const toolOutputs = await handleToolCalls(requiredActions, client, phoneNumber, userId);

          await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
            tool_outputs: toolOutputs
          });
        } else if (runStatus.status === "failed") {
          console.error("Run failed");
          throw new Error('Run failed');
        } else {
          await delay(1000);
        }
      } catch (error) {
        if (error.status === 503) {
          retryCount++;
          console.log(`OpenAI service temporarily unavailable. Retry ${retryCount} of ${MAX_RETRIES}...`);
          await delay(5000);
          continue;
        }
        throw error;  // Re-throw if it's not a 503 error
      }
    }

    // If we've exhausted all retries
    return "I'm sorry, but I'm having persistent issues connecting to my brain. Please try again later or contact support.";

  } catch (error) {
    console.error(`Error in handleUserInput for ${phoneNumber}:`, error);
    return 'user'; 
  }
}

async function handleUserInputInternal(userMessages, phoneNumber, userId) {
  try {
    const client = await getClientByPhoneNumber(phoneNumber, userId);
    console.log(`Client found: ${JSON.stringify(client)}`);

    let thread = await createThread(phoneNumber, false, userId);

    // Add all user messages to the thread
    for (const message of userMessages) {
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: message,
      });
    }
    let assistant;
    const currentDate = new Date(getCurrentDate());
    const dayOfWeek = currentDate.toLocaleString('en-US', { weekday: 'long' });
    const formattedDate = currentDate.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
    const dateTimeString = `${dayOfWeek}, ${formattedDate}`;
    console.log("Current date and time:", dateTimeString);
    let fname, lname, email;

    if (!client.firstname && !client.lastname) {
      thread = await createThread(phoneNumber, false, userId); 
      assistant = await createTemporaryAssistant(phoneNumber);
    } else {
      const upcomingAppointmentJSON = (await getUpcomingAppointments(client.id, 1, userId))[0];
      let upcomingAppointment = '';
      if (upcomingAppointmentJSON) {
        const appointmentDate = upcomingAppointmentJSON.date;
        const appointmentTime = upcomingAppointmentJSON.starttime;
        upcomingAppointment = `Date: ${appointmentDate} Time: ${appointmentTime}`;
      }

      const messages = (await getMessagesByClientId(client.id)).slice(-10);
      const appointment = (await getAllAppointmentsByClientId(client.id, userId)).slice(0,5);
      console.log("appointment", appointment)
      let appointmentType = '';
      if (appointment.length > 0) {
        appointmentType = appointment[0].appointmenttype;
      }
      fname = client.firstname;
      lname = client.lastname;
      email = client.email;
      const phone = client.phonenumber;   
      thread = await createThread(phoneNumber, false, userId); 
      assistant = await createAssistant(fname, lname, phone, messages, appointmentType, currentDate, client, upcomingAppointment, userId);
    }


    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      additional_instructions: "Don't use commas or proper punctuation. The current date and time is" + dateTimeString,
    });

    const MAX_RETRIES = 3;
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
      try {
        await delay(1000);
        const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        console.log(runStatus.status)
        if (runStatus.status === "completed") {
          const messages = await openai.beta.threads.messages.list(thread.id);
          const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
          if (assistantMessage) {
            console.log(assistantMessage.content[0].text.value);
            if (assistantMessage.content[0].text.value === 'user' || assistantMessage.content[0].text.value === 'User') {
              return 'user';
            }
            // const verifiedResponse = await verifyResponse(assistantMessage.content[0].text.value, client, thread);
            // return verifiedResponse;
            return assistantMessage.content[0].text.value;
          } else {
            return "user";
          }
        } else if (runStatus.status === "requires_action") {
          console.log("requires action")
          const requiredActions = runStatus.required_action.submit_tool_outputs;
          const toolOutputs = await handleToolCallsInternal(requiredActions, client, phoneNumber, userId);

          await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
            tool_outputs: toolOutputs
          });
        } else if (runStatus.status === "failed") {
          console.error("Run failed");
          throw new Error('Run failed');
        } else {
          await delay(1000);
        }
      } catch (error) {
        if (error.status === 503) {
          retryCount++;
          console.log(`OpenAI service temporarily unavailable. Retry ${retryCount} of ${MAX_RETRIES}...`);
          await delay(5000);
          continue;
        }
        throw error;  // Re-throw if it's not a 503 error
      }
    }

    // If we've exhausted all retries
    return "I'm sorry, but I'm having persistent issues connecting to my brain. Please try again later or contact support.";

  } catch (error) {
    console.error(`Error in handleUserInput for ${phoneNumber}:`, error);
    if (error.status === 503) {
      return "I apologize, but I'm having trouble connecting to my brain at the moment. Please try again in a few minutes.";
    }
    return 'user'; 
  }
}

function calculateTotalDuration(appointmentType, addOnArray) {
  const appointmentDuration = appointmentTypes[appointmentType].duration;
  const addOnsDuration = addOnArray.reduce((total, addOn) => total + addOns[addOn].duration, 0);
  return appointmentDuration + addOnsDuration;
}

async function verifyResponse(response, client, thread) {
  console.log(`Verifying response: ${response}`);
  let verificationThread;
  try {
    const verificationPromptPath = path.join(__dirname, 'Prompts', 'toneVerification.txt');
    let verificationPrompt = fs.readFileSync(verificationPromptPath, 'utf8');
    const currentDate = new Date(getCurrentDate());
    const day = currentDate.toLocaleString('en-US', { weekday: 'long' });

    // Get formatted thread messages
    let formattedThreadMessages = '';
    if (thread) {
      const threadMessages = await openai.beta.threads.messages.list(thread.id);
      formattedThreadMessages = threadMessages.data.map(msg => 
        `${msg.role}: ${msg.content[0].text.value}`
      ).join('\n');
    }

    // Replace placeholders with actual values
    verificationPrompt = verificationPrompt
      .replace('${client.firstname}', client.firstname)
      .replace('${client.lastname}', client.lastname)
      .replace('${client.phonenumber}', client.phonenumber)
      .replace('${response}', response)
      .replace('${currentDate}', currentDate)
      .replace('${day}', day)
      .replace('${formattedThreadMessages}', formattedThreadMessages);

    const assistant = await openai.beta.assistants.create({
      instructions: verificationPrompt,
      name: "Response Verification Assistant",
      model: "gpt-4o",
      tools: tools,
      temperature: 0
    });

    verificationThread = await openai.beta.threads.create();

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
          console.log(`Verified message: ${assistantMessage.content[0].text.value}`);
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
  } finally {
    if (verificationThread) {
      await openai.beta.threads.del(verificationThread.id);
    }
  }
}

async function shouldAIRespond(userMessages, thread) {
  try {
    const initialScreeningPath = path.join(__dirname, 'Prompts', 'initialScreening.txt');
    let initialScreeningInstructions = fs.readFileSync(initialScreeningPath, 'utf-8');

    const screeningMessage = Array.isArray(userMessages) ? userMessages.join('\n') : userMessages;
    
    let formattedThreadMessages = '';
    if (thread) {
      const threadMessages = await openai.beta.threads.messages.list(thread.id);
      formattedThreadMessages = threadMessages.data.map(msg => 
        `${msg.role}: ${msg.content[0].text.value}`
      ).join('\n');
    }

    initialScreeningInstructions = initialScreeningInstructions.replace('${formattedThreadMessages}', formattedThreadMessages);

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
    console.log(`AI decision: ${aiDecision}`);
      return aiDecision === 'true';

  } catch (error) {
    console.error("Error in shouldAIRespond:", error);
    return false; // Default to human attention if there's an error
  }
}

module.exports = { getAvailability, bookAppointment, handleUserInput, createAssistant, createThread, shouldAIRespond, handleUserInputInternal, handleToolCalls, handleToolCallsInternal};
