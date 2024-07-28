const { Anthropic } = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { getAvailability, getCurrentDate, findNextAvailableSlots } = require('./tools/getAvailability');
const { bookAppointment } = require('./tools/bookAppointment');
const { cancelAppointment } = require('./tools/cancelAppointment');
const { getClientByPhoneNumber, getDaysSinceLastAppointment, createClient } = require('../model/clients');
const { getMessagesByClientId } = require('../model/messages');
const { getAllAppointmentsByClientId, getUpcomingAppointments } = require('../model/appointment');
const fs = require('fs');
const path = require('path');
const { createRecurringAppointments } = require('./tools/recurringAppointments');
const { findRecurringAvailability } = require('./tools/recurringAvailability');
const { appointmentTypes, addOns } = require('../model/appointmentTypes');
const { getAIPrompt } = require('../model/aiPrompt');

// Add this at the top of the file, outside of any function
const conversationHistory = new Map();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL_SONNET = "claude-3-sonnet-20240229";

// Define the tool schemas
const getAvailabilitySchema = {
  name: "getAvailability",
  description: "Get available appointment slots for a given day, appointment type, and add-ons. Call this function whenever a user is asking about availabilities for days. When user is asking about larger time frames use it for each day that is in that frame. Returns an array of available slots with fields of starttime and endtime with the day that it was called for.",
  input_schema: {
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
        description: "An array of add-ons for the appointment. If there are no add ons then set this as an empty array"
      },
      group: {
        type: "number",
        description: "The appointment group (1, 2, or 3)."
      }
    },
    required: ["day", "appointmentType", "group", "addOns"]
  }
};

const bookAppointmentSchema = {
  name: "bookAppointment",
  description: "Book an appointment with the given details. It will return a confirmation or a reason that the booking did not work",
  input_schema: {
    type: "object",
    properties: {
      date: { type: "string", description: "Appointment date in YYYY-MM-DD format" },
      startTime: { type: "string", description: "Start time in HH:MM format" },
      firstName: { type: "string" },
      lastName: { type: "string" },
      phoneNumber: { type: "string" },
      email: { type: "string" },
      appointmentType: { type: "string", enum: Object.keys(appointmentTypes) },
      duration: { type: "number", description: "Appointment duration in minutes" },
      group: { type: "number", enum: [1, 2, 3] },
      price: { type: "number" },
      addOns: { 
        type: "array", 
        items: { type: "string", enum: Object.keys(addOns) },
        description: "Array of add-on names"
      }
    },
    required: ["date", "startTime", "firstName", "lastName", "phoneNumber", "email", "appointmentType", "duration", "group", "price"]
  }
};

const cancelAppointmentSchema = {
  name: "cancelAppointment",
  description: "Cancel an existing appointment.",
  input_schema: {
    type: "object",
    properties: {
      date: { type: "string", description: "Appointment date in YYYY-MM-DD format" }
    },
    required: ["date"]
  }
};

const getAllAppointmentsByClientIdSchema = {
  name: "getAllAppointmentsByClientId",
  description: "Get all appointments for a specific client.",
  input_schema: {
    type: "object",
    properties: {
      clientId: { type: "string", description: "The unique identifier for the client" }
    },
    required: ["clientId"]
  }
};

const createClientSchema = {
  name: "createClient",
  description: "Create a new client in the system.",
  input_schema: {
    type: "object",
    properties: {
      firstName: { type: "string" },
      lastName: { type: "string" },
      phoneNumber: { type: "string" }
    },
    required: ["firstName", "lastName", "phoneNumber"]
  }
};

const findRecurringAvailabilitySchema = {
  name: "findRecurringAvailability",
  description: "Find available slots for recurring appointments.",
  input_schema: {
    type: "object",
    properties: {
      initialDate: { type: "string", description: "Initial date in YYYY-MM-DD format" },
      appointmentDuration: { type: "number", description: "Duration of each appointment in minutes" },
      group: { type: "number", enum: [1, 2, 3], description: "The appointment group" },
      recurrenceRule: { type: "string", description: "The recurrence rule (e.g., 'RRULE:FREQ=WEEKLY;BYDAY=MO')" },
      clientId: { type: "string", description: "The unique identifier for the client" }
    },
    required: ["initialDate", "appointmentDuration", "group", "recurrenceRule", "clientId"]
  }
};

const createRecurringAppointmentsSchema = {
  name: "createRecurringAppointments",
  description: "Create a series of recurring appointments.",
  input_schema: {
    type: "object",
    properties: {
      initialDate: { type: "string", description: "Initial date in YYYY-MM-DD format" },
      startTime: { type: "string", description: "Start time in HH:MM format" },
      firstName: { type: "string" },
      lastName: { type: "string" },
      phoneNumber: { type: "string" },
      email: { type: "string" },
      appointmentType: { type: "string", enum: Object.keys(appointmentTypes) },
      appointmentDuration: { type: "number", description: "Duration of each appointment in minutes" },
      group: { type: "number", enum: [1, 2, 3] },
      price: { type: "number" },
      addOnArray: { 
        type: "array", 
        items: { type: "string", enum: Object.keys(addOns) },
        description: "Array of add-on names"
      },
      recurrenceRule: { type: "string", description: "The recurrence rule (e.g., 'RRULE:FREQ=WEEKLY;BYDAY=MO')" }
    },
    required: ["initialDate", "startTime", "firstName", "lastName", "phoneNumber", "email", "appointmentType", "appointmentDuration", "group", "price", "recurrenceRule"]
  }
};

const getUpcomingAppointmentsSchema = {
  name: "getUpcomingAppointments",
  description: "Get upcoming appointments for a client.",
  input_schema: {
    type: "object",
    properties: {
      clientId: { type: "string", description: "The unique identifier for the client" },
      limit: { type: "number", description: "The maximum number of appointments to retrieve" }
    },
    required: ["clientId"]
  }
};

const getCurrentDateSchema = {
  name: "getCurrentDate",
  description: "Get the current date and time. Does not require any arguments",
  input_schema: {
    type: "object",
    properties: {},
    required: []
  }
};


// Combine all tool schemas
const tools = [
  getAvailabilitySchema,
  bookAppointmentSchema,
  cancelAppointmentSchema,
  createClientSchema,
  findRecurringAvailabilitySchema,
  createRecurringAppointmentsSchema,
  getUpcomingAppointmentsSchema,
  getCurrentDateSchema
];

function getAppointmentDuration(appointment) {
  const [startHour, startMinute] = appointment[0].starttime.split(':').map(Number);
  const [endHour, endMinute] = appointment[0].endtime.split(':').map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  return endTotalMinutes - startTotalMinutes;
}

async function createAPIMessage(model, messages, fullInstructions) {
  return anthropic.messages.create({
    model,
    max_tokens: 1000,
    temperature: 0,
    messages,
    system: fullInstructions,
    tools: tools,
  });
}

async function shouldAIRespond(userMessage) {
  try {
    const initialScreeningPath = path.join(__dirname, 'Prompts', 'initialScreening.txt');
    const initialScreeningInstructions = fs.readFileSync(initialScreeningPath, 'utf-8');

    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 100,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: initialScreeningInstructions
        },
        {
          role: "user",
          content: `Should the AI respond to this message? Answer only with 'true' or 'false': "${userMessage}"`
        }
      ]
    });

    const aiDecision = response.content[0].text.trim().toLowerCase();
    return aiDecision === 'true';
  } catch (error) {
    console.error("Error in shouldAIRespond:", error);
    return false; // Default to human attention if there's an error
  }
}

async function handleUserInputClaude(userMessage, phoneNumber) {
  try {
    const shouldRespond = await shouldAIRespond(userMessage);
    if (!shouldRespond) {
      return "user"; // Indicate that human attention is required
    }

    const client = await getClientByPhoneNumber(phoneNumber);
    const currentDate = new Date(getCurrentDate());
    console.log("currentDate: ", currentDate);
    const date = currentDate.toISOString().split('T')[0];
    const time = currentDate.toTimeString().split(' ')[0];
    console.log("Date:", date);
    console.log("Time:", time);
    const day = currentDate.toLocaleString('en-US', { weekday: 'long' });
    if (client.id == '') {
      // Handle new client
      const response = await anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Hey bro, don't think I've heard from you before. Can you just give me your first and last name so I can save it? ${userMessage}`
        }],
        system: "You are an assistant to get the name of the client. Ask for their first and last name and then call the createClient tool with the corresponding information.",
      });
      return response.content[0].text;
    } else {
      const appointment = (await getAllAppointmentsByClientId(client.id)).slice(-5);
      let appointmentDuration = appointment.length > 0 ? getAppointmentDuration(appointment) : 30;
      const upcomingAppointmentJSON = (await getUpcomingAppointments(client.id, 1))[0];
      let upcomingAppointment = '';
      if (upcomingAppointmentJSON) {
        const appointmentDate = upcomingAppointmentJSON.date;
        const appointmentTime = upcomingAppointmentJSON.starttime;
        upcomingAppointment = `Date: ${appointmentDate} Time: ${appointmentTime}`;
      }
      const daysSinceLastAppointment = getDaysSinceLastAppointment(client.id);
      const { firstname: fname, lastname: lname, email, phonenumber: phone } = client;

      // Get the AI prompt for this client
      const aiPrompt = await getAIPrompt(client.id);

      const instructionsPath = path.join(__dirname, 'edit.txt');
      let assistantInstructions = fs.readFileSync(instructionsPath, 'utf-8');

      let fullInstructions = `${aiPrompt}\n\n${assistantInstructions}`;
      fullInstructions = fullInstructions
        .replace('${appointment}', JSON.stringify(appointment, null, 2))
        .replace('${appointmentDuration}', appointmentDuration)
        .replace('${fname}', fname)
        .replace('${lname}', lname)
        .replace('${phone}', phone)
        .replace('${daysSinceLastAppointment}', daysSinceLastAppointment)
        .replace('${dayOfWeek}', day)
        .replace('${date}', date)
        .replace('${time}', time)
        .replace('${upcomingAppointment}', upcomingAppointment);

      // Get or initialize conversation history for this client
      if (!conversationHistory.has(client.id)) {
        conversationHistory.set(client.id, []);
      }
      const clientHistory = conversationHistory.get(client.id);

      // Prepare the messages array for the API request
      const messages = [
        ...clientHistory,
        { role: "user", content: userMessage }
      ];
      console.log("messages: ", messages);
      let response = await anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        temperature: 0,
        messages: messages,
        system: fullInstructions,
        tools: tools,
      });

      while (response.stop_reason === "tool_use") {
        const toolMessages = {
          role: "user",
          content: [],
        };

        for (const content of response.content) {
          if (content.type === "text") {
            console.log("AI: ", content.text);
          } else if (content.type === "tool_use") {
            const toolResult = await executeFunction(
              { name: content.name, args: content.input },
              client,
              client.firstname,
              client.lastname,
              client.phonenumber,
              client.email
            );

            toolMessages.content.push({
              type: "tool_result",
              tool_use_id: content.id,
              content: JSON.stringify(toolResult),
            });
          }
        }

        response = await anthropic.messages.create({
          model: MODEL_SONNET,
          max_tokens: 1000,
          temperature: 0,
          messages: [
            ...messages,
            {
              role: "assistant",
              content: response.content
            },
            toolMessages
          ],
          system: fullInstructions,
          tools: tools,
        });
      }

      // Add the new messages to the conversation history
      clientHistory.push({ role: "user", content: userMessage });
      clientHistory.push({ role: "assistant", content: response.content[0].text });

      // Optionally, limit the history to a certain number of messages
      if (clientHistory.length > 10) {  // For example, keep only the last 10 messages
        clientHistory.splice(0, clientHistory.length - 10);
      }

      return response.content[0].text || "No response";
    }
  } catch (error) {
    console.error("Error in handleUserInput:", error);
    throw new Error('Error processing request');
  }
}

async function executeFunction(call, client, fname, lname, phoneNumber, email) {
  const { name, args } = call;
  console.log("name: ", name);
  console.log("args: ", args);
  switch (name) {
    case 'getAvailability':
      console.log("getAvailability");
      const appointmentTypeInfo = appointmentTypes[args.appointmentType];
      if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type: ${args.appointmentType}`);
      }
      let output = await getAvailability(args.day, args.appointmentType, args.addOns, args.group, client.id);
      // if (output.length === 0) {
      //   const nextAvailableSlots = await findNextAvailableSlots(args.day, args.appointmentType, args.addOns, args.group);
      //   output = {
      //     requestedDay: args.day,
      //     nextAvailableSlots: nextAvailableSlots
      //   };
      // }
      return output;
    case 'bookAppointment':
      const addOnInfo = args.addOns.map(addon => addOns[addon]);
      const totalPrice = appointmentTypeInfo.price + addOnInfo.reduce((sum, addon) => sum + addon.price, 0);
      const appointmentDuration = appointmentTypeInfo.duration + addOnInfo.reduce((sum, addon) => sum + addon.duration, 0);
      return await bookAppointment(
        args.date,
        args.startTime,
        fname,
        lname,
        phoneNumber,
        email,
        args.appointmentType,
        appointmentDuration,
        args.group,
        totalPrice,
        args.addOns
      );
    case 'cancelAppointment':
      return await cancelAppointment(phoneNumber, args.date);
    case 'createClient':
      return await createClient(args.firstName, args.lastName, args.phoneNumber);
    case 'findRecurringAvailability':
      return await findRecurringAvailability(
        args.initialDate,
        args.appointmentDuration,
        args.group,
        args.recurrenceRule,
        args.clientId
      );
    case 'createRecurringAppointments':
      return await createRecurringAppointments(
        args.initialDate,
        args.startTime,
        fname,
        lname,
        phoneNumber,
        email,
        args.appointmentType,
        args.appointmentDuration,
        args.group,
        args.price,
        args.addOnArray,
        args.recurrenceRule
      );
    case 'getUpcomingAppointments':
      return await getUpcomingAppointments(args.clientId, args.limit);
    case 'getCurrentDate':
      return await getCurrentDate();
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}

function calculateTotalDuration(appointmentType, addOnArray) {
  const appointmentDuration = appointmentTypes[appointmentType].duration;
  const addOnsDuration = addOnArray.reduce((total, addOn) => total + addOns[addOn].duration, 0);
  return appointmentDuration + addOnsDuration;
}

module.exports = { getAvailability, bookAppointment, handleUserInputClaude, shouldAIRespond };