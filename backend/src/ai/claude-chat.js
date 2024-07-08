const { Anthropic } = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { getAvailability, getCurrentDate } = require('./tools/getAvailability');
const { bookAppointment } = require('./tools/bookAppointment');
const { cancelAppointment } = require('./tools/cancelAppointment');
const { getClientByPhoneNumber, getDaysSinceLastAppointment, createClient } = require('../model/clients');
const { getMessagesByClientId } = require('../model/messages');
const { getAllAppointmentsByClientId } = require('../model/appointment');
const fs = require('fs');
const path = require('path');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
    name: "getAvailability",
    description: "Given the day will return an array of JSON objects with the following properties: id, appointmentType, clientId, date, startTime, endTime, details. These are the already made appointments for that day.",
    input_schema: {
      type: "object",
      properties: {
        day: {
          type: "string",
          description: "What day that they are checking availability for. This should be in the form of YYYY-MM-DD. Convert anything else that the user gives to this form. Use the getCurrentDate if the user uses phrases such as today or tomorrow"
        },
        duration: {
          type: "number",
          description: "The duration of the appointment in minutes"
        }
      },
      required: ["day", "duration"]
    }
  },
  {
    name: "bookAppointment",
    description: "Runs script in order to book appointment returns confirmation or if it didn't work",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "The date for the appointment. Date should be converted to YYYY-MM-DD"
        },
        startTime: {
          type: "string",
          description: "The time for the appointment. This could be in 24-hour format like 14:30. Convert it into military time if it isnt already in the form of HH:MM."
        },
        appointmentType: {
          type: "string",
          description: "The type of appointment they want to book."
        },
        appointmentDuration: {
          type: "number",
          description: "The duration of the appointment in minutes"
        }
      },
      required: ["date", "startTime", "appointmentType", "appointmentDuration"]
    }
  },
  {
    name: "cancelAppointment",
    description: "Cancel an existing appointment.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date of the appointment to cancel" }
      },
      required: ["date"]
    }
  },
  {
    name: "getAllAppointmentsByClientId",
    description: "Get all appointments for a client.",
    input_schema: {
      type: "object",
      properties: {
        clientId: { type: "string", description: "ID of the client" }
      },
      required: ["clientId"]
    }
  },
  {
    name: "createClient",
    description: "Create a new client record.",
    input_schema: {
      type: "object",
      properties: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        phoneNumber: { type: "string" },
        email: { type: "string" },
        notes: { type: "string" }
      },
      required: ["firstName", "lastName", "phoneNumber"]
    }
  }
];

async function createSession(phoneNumber) {
  if (!sessions.has(phoneNumber)) {
    sessions.set(phoneNumber, []);
  }
  return sessions.get(phoneNumber);
}

async function handleUserInput(userMessage, phoneNumber) {
  try {
    const client = await getClientByPhoneNumber(phoneNumber);
    let session = await createSession(phoneNumber);
    const day = getCurrentDate();
    let fname, lname, email, appointment, appointmentDuration, messages;

    let systemInstruction = "";

    if (client.id !== '') {
      messages = (await getMessagesByClientId(client.id)).slice(-10);
      appointment = (await getAllAppointmentsByClientId(client.id)).slice(0, 1);
      appointmentDuration = appointment.length > 0 ? getAppointmentDuration(appointment) : 30;
      
      const daysSinceLastAppointment = getDaysSinceLastAppointment(client.id);
      fname = client.firstname;
      lname = client.lastname;
      email = client.email;

      const instructionsPath = path.join(__dirname, 'assistantInstructions.txt');
      systemInstruction = fs.readFileSync(instructionsPath, 'utf-8');
      systemInstruction = systemInstruction
        .replace('${appointment}', JSON.stringify(appointment[0] || {}, null, 2))
        .replace('${appointmentDuration}', appointmentDuration)
        .replace('${fname}', fname)
        .replace('${lname}', lname)
        .replace('${phone}', phoneNumber)
        .replace('${messages}', JSON.stringify(messages, null, 2))
        .replace('${daysSinceLastAppointment}', daysSinceLastAppointment)
        .replace('${day}', day);
    } else {
      systemInstruction = `You are a helpful assistant for scheduling appointments. The current date is ${day}. Always use the provided tools to get information or perform actions.`;
    }

    // Encourage tool use in the user message
    const enhancedUserMessage = `${userMessage}\n\nPlease use the available tools to assist with this request. For example, you can use getAvailability to check open slots, or bookAppointment to schedule a new appointment.`;

    session.push({ role: "user", content: enhancedUserMessage });

    console.log("Sending request to Claude with tools:", tools);

    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      temperature: 0.2,
      system: systemInstruction,
      messages: session,
      tools: tools
    });

    console.log("Claude response:", response);

    let assistantMessage = response.content[0].text;
    let toolCalls = response.tool_calls || [];

    console.log("Tool calls:", toolCalls);

    if (toolCalls.length === 0) {
      console.log("No tool calls were made. Attempting to encourage tool use.");
      session.push({ role: "assistant", content: assistantMessage });
      session.push({ role: "user", content: "Please use the available tools to help with my request. For example, you can use getAvailability to check open slots." });

      const followUpResponse = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        temperature: 0.2,
        system: systemInstruction,
        messages: session,
        tools: tools
      });

      console.log("Follow-up Claude response:", followUpResponse);

      assistantMessage += "\n" + followUpResponse.content[0].text;
      toolCalls = followUpResponse.tool_calls || [];
      console.log("Follow-up tool calls:", toolCalls);
    }

    for (const toolCall of toolCalls) {
      const toolName = toolCall.name;
      const args = JSON.parse(toolCall.input);

      console.log(`Executing tool: ${toolName} with args:`, args); // Log tool execution

      let toolResult;
      try {
        if (toolName === "getAvailability") {
          toolResult = await getAvailability(args.day, args.duration);
        } else if (toolName === "bookAppointment") {
          if (fname && lname && email) {
            toolResult = await bookAppointment(args.date, args.startTime, fname, lname, phoneNumber, email, args.appointmentType, args.appointmentDuration);
          } else {
            toolResult = { error: "Client information not available" };
          }
        } else if (toolName === "cancelAppointment") {
          toolResult = await cancelAppointment(phoneNumber, args.date);
        } else if (toolName === "getAllAppointmentsByClientId") {
          toolResult = await getAllAppointmentsByClientId(client.id);
        } else if (toolName === "createClient") {
          toolResult = await createClient(args.firstName, args.lastName, phoneNumber, args.email, args.notes);
        } else {
          throw new Error(`Unknown function: ${toolName}`);
        }

        console.log(`Tool result:`, toolResult); // Log tool result
      } catch (error) {
        console.error(`Error executing tool ${toolName}:`, error);
        toolResult = { error: `Error executing ${toolName}: ${error.message}` };
      }

      if (toolResult === undefined) {
        console.warn(`Tool ${toolName} returned undefined. Setting to empty object.`);
        toolResult = {};
      }

      session.push({
        role: "user",
        content: [{
          type: "tool_result",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        }]
      });

      const followUpResponse = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        temperature: 0.2,
        system: systemInstruction,
        messages: session,
        tools: tools
      });

      assistantMessage += "\n" + followUpResponse.content[0].text;
    }

    session.push({ role: "assistant", content: assistantMessage });
    return assistantMessage;

  } catch (error) {
    console.error("Error in handleUserInput:", error);
    throw new Error('Error processing request');
  }
}

// async function main() {
//     const response = await handleUserInput("whats your availability for tomorrow", "+12038324011");
//     console.log(response);
// }

// main();

module.exports = { handleUserInput };
