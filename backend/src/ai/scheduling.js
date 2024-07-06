const { OpenAI } = require('openai');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { getAvailability, getCurrentDate } = require('./tools/getAvailability');
const { bookAppointment } = require('./tools/bookAppointment');
const {cancelAppointment} = require('./tools/cancelAppointment')
const { getClientByPhoneNumber,getDaysSinceLastAppointment, createClient } = require('../model/clients');
const {getMessagesByClientId} = require('../model/messages')
const {getAllAppointmentsByClientId} = require('../model/appointment')
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
      description: "Given the day will return an array of JSON objects with the following properties: id, appointmentType, clientId, date, startTime, endTime, details. These are the already made appointments for that day.",
      parameters: {
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
        required: ["date", "startTime", "appointmentType", "apponintmentDuration"]
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
  }
];


async function createThread(phoneNumber) {
  if (!sessions.has(phoneNumber)) {
    const thread = await openai.beta.threads.create();
    sessions.set(phoneNumber, thread);
  }
  return sessions.get(phoneNumber);
}

async function createAssistant(fname, lname, phone, messages, appointment, appointmentDuration, daysSinceLastAppointment, day) {
  const instructionsPath = path.join(__dirname, 'assistantInstructions.txt');
  let assistantInstructions = fs.readFileSync(instructionsPath, 'utf-8');
  assistantInstructions = assistantInstructions
    .replace('${appointment}', JSON.stringify(appointment, null, 2))
    .replace('${appointmentDuration}', appointmentDuration)
    .replace('${fname}', fname)
    .replace('${lname}', lname)
    .replace('${phone}', phone)
    .replace('${messages}', JSON.stringify(messages, null, 2))
    .replace('${daysSinceLastAppointment}', daysSinceLastAppointment)
    .replace('${day}', day);

  if (!assistants.has(phone)) {
    const newAssistant = await openai.beta.assistants.create({
      instructions: assistantInstructions,
      name: `Scheduling Assistant for ${fname} ${lname}`,
      model: "gpt-4-0613",
      tools: tools,
      temperature: 0.2
    });
    assistants.set(phone, newAssistant);
  }
  return assistants.get(phone);
}

async function handleUserInput(userMessage, phoneNumber) {
  try {
    const client = await getClientByPhoneNumber(phoneNumber);
    let thread;
    let assistant;
    const day = getCurrentDate();
    let fname, lname, email;

    if (client.id == '') {
      thread = await createThread(phoneNumber); 
      // Create a temporary assistant for new users
      assistant = await createAssistant('', '', phoneNumber, [], {}, 0, 0, day);
    } else {
      console.log("Client already exists");
      const messages = (await getMessagesByClientId(client.id)).slice(-10);
      const appointment = (await getAllAppointmentsByClientId(client.id)).slice(0, 1);
      let appointmentDuration = appointment.length > 0 ? getAppointmentDuration(appointment) : 30;
      
      const daysSinceLastAppointment = getDaysSinceLastAppointment(client.id);
      fname = client.firstname;
      lname = client.lastname;
      email = client.email;
      const phone = client.phonenumber;   
      console.log("day", day)
      thread = await createThread(phoneNumber); 
      console.log(fname + lname)
      assistant = await createAssistant(fname, lname, phone, messages, appointment[0], appointmentDuration, daysSinceLastAppointment, day);
    }

    const message = await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage,
    });
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      additional_instructions: "The current date and time is" + day,
      
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

        const toolOutputs = [];

        for (const action of requiredActions.tool_calls) {
          const funcName = action.function.name;
          const args = JSON.parse(action.function.arguments);

          if (funcName === "getAvailability") {
            const output = await getAvailability(args.day, args.duration);
            toolOutputs.push({
              tool_call_id: action.id,
              output: JSON.stringify(output)
            });
          } else if (funcName === "bookAppointment") {
            if (fname && lname && email) {
              const output = await bookAppointment(args.date, args.startTime, fname, lname, phoneNumber, email, args.appointmentType, args.appointmentDuration);
              toolOutputs.push({
                tool_call_id: action.id,
                output: JSON.stringify(output)
              });
            } else {
              toolOutputs.push({
                tool_call_id: action.id,
                output: JSON.stringify({ error: "Client information not available" })
              });
            }
          } else if (funcName === "getCurrentDate") {
            const output = getCurrentDate();

            toolOutputs.push({
              tool_call_id: action.id,
              output: JSON.stringify(output)
            });
          } else if (funcName === "cancelAppointment") {
            const output = await cancelAppointment(phoneNumber, args.date);
            toolOutputs.push({
              tool_call_id: action.id,
              output: JSON.stringify(output)
            });
          } else if (funcName === "getAllAppointmentsByClientId") {
            const output = await getAllAppointmentsByClientId(client.id);
            toolOutputs.push({
              tool_call_id: action.id,
              output: JSON.stringify(output)
            });
          } else if (funcName === "createClient") {
            const output = await createClient(args.firstName, args.lastName, phoneNumber);
            toolOutputs.push({
              tool_call_id: action.id,
              output: JSON.stringify(output)
            });
          } else {
            throw new Error(`Unknown function: ${funcName}`);
          }
        }

        await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
          tool_outputs: toolOutputs
        });

      } else {
        await delay(1000);
      }
    }
  } catch (error) {
    console.error(error);
    throw new Error('Error processing request');
  }
}

module.exports = { getAvailability, bookAppointment, handleUserInput };