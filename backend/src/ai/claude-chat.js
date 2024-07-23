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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const tools = [
  {
    name: "getAvailability",
    description: "Get available appointment slots for a given day, appointment type, and add-ons.",
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
          description: "An array of add-ons for the appointment."
        },
        group: {
          type: "number",
          description: "The appointment group (1, 2, or 3)."
        }
      },
      required: ["day", "appointmentType", "group"]
    }
  },
  {
    name: "bookAppointment",
    description: "Book an appointment with the given details.",
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
  },
  {
    name: "cancelAppointment",
    description: "Cancel an existing appointment.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Appointment date in YYYY-MM-DD format" }
      },
      required: ["date"]
    }
  },
  {
    name: "getAllAppointmentsByClientId",
    description: "Get all appointments for a specific client.",
    input_schema: {
      type: "object",
      properties: {
        clientId: { type: "string", description: "The unique identifier for the client" }
      },
      required: ["clientId"]
    }
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  }
];

function getAppointmentDuration(appointment) {
  const [startHour, startMinute] = appointment[0].starttime.split(':').map(Number);
  const [endHour, endMinute] = appointment[0].endtime.split(':').map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  return endTotalMinutes - startTotalMinutes;
}

async function handleUserInput(userMessage, phoneNumber) {
  try {
    const client = await getClientByPhoneNumber(phoneNumber);
    const currentDate = new Date(getCurrentDate());
    const day = currentDate.toLocaleString('en-US', { weekday: 'long' });
    let fname, lname, email;

    if (client.id == '') {
      // Handle new client
      const response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Hey bro, don't think I've heard from you before. Can you just give me your first and last name so I can save it? ${userMessage}`
        }],
        system: "You are an assistant to get the name of the client. Ask for their first and last name and then call the createClient tool with the corresponding information.",
      });
      return response.content[0].text;
    } else {
      const messages = (await getMessagesByClientId(client.id)).slice(-10);
      const appointment = (await getAllAppointmentsByClientId(client.id)).slice(-5);
      let appointmentDuration = appointment.length > 0 ? getAppointmentDuration(appointment) : 30;
      
      const daysSinceLastAppointment = getDaysSinceLastAppointment(client.id);
      fname = client.firstname;
      lname = client.lastname;
      email = client.email;
      const phone = client.phonenumber;

      // Get the AI prompt for this client
      const aiPrompt = await getAIPrompt(client.id);

      // Format messages for better readability
      const formattedMessages = messages.map(msg => 
        `From: ${msg.fromtext}\nTo: ${msg.totext}\nDate: ${msg.date}\nMessage: ${msg.body}`
      ).join('\n\n');

      const instructionsPath = path.join(__dirname, 'assistantInstructions.txt');
      let assistantInstructions = fs.readFileSync(instructionsPath, 'utf-8');

      let fullInstructions = `${aiPrompt}\n\n${assistantInstructions}`;
      fullInstructions = fullInstructions
        .replace('${appointment}', JSON.stringify(appointment, null, 2))
        .replace('${appointmentDuration}', appointmentDuration)
        .replace('${fname}', fname)
        .replace('${lname}', lname)
        .replace('${phone}', phone)
        .replace('${messages}', formattedMessages)
        .replace('${daysSinceLastAppointment}', daysSinceLastAppointment)
        .replace('${day}', day);

      const response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: userMessage
        }],
        system: fullInstructions,
        tools: tools,
      });

      const assistantMessage = response.content[0].text;

      // Process the response and handle function calls
      const functionCalls = parseFunctionCalls(assistantMessage);
      for (const call of functionCalls) {
        const result = await executeFunction(call, client, fname, lname, phoneNumber, email);
        // You might want to append the result to the assistant's message or handle it in some way
      }

      return assistantMessage;
    }
  } catch (error) {
    console.error(error);
    throw new Error('Error processing request');
  }
}

function parseFunctionCalls(message) {
  const functionRegex = /(\w+)\((.*?)\)/g;
  const calls = [];
  let match;
  while ((match = functionRegex.exec(message)) !== null) {
    calls.push({
      name: match[1],
      args: JSON.parse(`{${match[2]}}`)
    });
  }
  return calls;
}

async function executeFunction(call, client, fname, lname, phoneNumber, email) {
  const { name, args } = call;
  switch (name) {
    case 'getAvailability':
      const appointmentTypeInfo = appointmentTypes[args.appointmentType];
      if (!appointmentTypeInfo) {
        throw new Error(`Invalid appointment type: ${args.appointmentType}`);
      }
      const totalDuration = calculateTotalDuration(args.appointmentType, args.addOns);
      let output = await getAvailability(args.day, args.appointmentType, args.addOns, args.group, totalDuration);
      if (output.length === 0) {
        const nextAvailableSlots = await findNextAvailableSlots(args.day, args.appointmentType, args.addOns, args.group);
        output = {
          requestedDay: args.day,
          nextAvailableSlots: nextAvailableSlots
        };
      }
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
    case 'getAllAppointmentsByClientId':
      return await getAllAppointmentsByClientId(args.clientId);
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
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}

function calculateTotalDuration(appointmentType, addOnArray) {
  const appointmentDuration = appointmentTypes[appointmentType].duration;
  const addOnsDuration = addOnArray.reduce((total, addOn) => total + addOns[addOn].duration, 0);
  return appointmentDuration + addOnsDuration;
}
// async function main() {
//   const response = await handleUserInput('can i schedule an appointment for today?', '+12038324011');
//   console.log(response);
// }

// main();

module.exports = { getAvailability, bookAppointment, handleUserInput };