const { OpenAI } = require('openai');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { getInfo } = require('./tools/getCustomers');
const { sendMessage, sendMessages } = require('../config/twilio');
const fs = require('fs');
const path = require('path');
const { createCustomList, getCustomList } = require('../model/customLists');
const { analyzeNames, getMuslimClients, analyzeNamesQueue } = require('./tools/analyzeNames');
const { v4: uuidv4 } = require('uuid');
const { getClientByName } = require('../model/clients');
const { bookAppointmentAdmin } = require('./tools/bookAppointment');
const { appointmentTypes, addOns } = require('../model/appointmentTypes');
const { getAvailability, getCurrentDate } = require('./tools/getAvailability');
const { cancelAppointment, cancelAppointmentById } = require('./tools/cancelAppointment');
const { createBlockedTime } = require('../model/appointment');

// Add this object to store queries
const queryStore = {};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let assistant;
let thread;
const tools = [
{
  type: "function",
  function: {
    name: "getInfo",
    description: "Gets information about a client based on the given query",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The SQL query to get the information"
        }
      },
      required: ["query"]
    }
  }
},
{
  type: "function",
  function: {
    name: "createCustomList",
    description: "Creates a custom list of clients based on the given query and returns the id of the list to view",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The name of the custom list"
        },
        query: {
          type: "string",
          description: "The SQL query to create the custom list"
        }
      },
      required: ["name", "query"]
    }
  }
},
{
  type: "function",
  function: {
    name: "getMuslimClients",
    description: "Starts a background job to analyze Muslim names and returns a job ID",
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
    name: "bookAppointmentAdmin",
    description: "Books an appointment with admin privileges, bypassing time restrictions",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "number",
          description: "The ID of the client"
        },
        date: {
          type: "string",
          description: "The date for the appointment (YYYY-MM-DD)"
        },
        startTime: {
          type: "string",
          description: "The start time for the appointment (HH:MM)"
        },
        appointmentType: {
          type: "string",
          enum: Object.keys(appointmentTypes),
          description: "The type of appointment to book"
        },
        addOns: {
          type: "array",
          items: {
            type: "string",
            enum: Object.keys(addOns)
          },
          description: "An array of add-ons for the appointment"
        }
      },
      required: ["clientId", "date", "startTime", "appointmentType"]
    }
  }
},
{
  type: "function",
  function: {
    name: "getClientByName",
    description: "Retrieves a client by their first and last name",
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
        }
      },
      required: ["firstName", "lastName"]
    }
  }
},
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
    name: "cancelAppointmentById",
    description: "Cancels an appointment for a client on a specific date using the client ID",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "number",
          description: "The ID of the client"
        },
        date: {
          type: "string",
          description: "The date of the appointment to cancel (YYYY-MM-DD)"
        }
      },
      required: ["clientId", "date"]
    }
  }
},
{
  type: "function",
  function: {
    name: "blockTime",
    description: "Blocks a time slot in the appointment schedule",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "The date to block time (YYYY-MM-DD)"
        },
        startTime: {
          type: "string",
          description: "The start time of the blocked period (HH:MM)"
        },
        endTime: {
          type: "string",
          description: "The end time of the blocked period (HH:MM)"
        },
        reason: {
          type: "string",
          description: "The reason for blocking the time"
        }
      },
      required: ["date", "startTime", "endTime"]
    }
  }
}
];

async function createAssistant(date) {
  const instructionsPath = path.join(__dirname, 'dataInstructions.txt');
  const assistantInstructions = fs.readFileSync(instructionsPath, 'utf8');
  if (!assistant) {
    assistant = await openai.beta.assistants.create({
      instructions: assistantInstructions + `\nDate: ${date}`,
      name: "Client Data",
      model: "gpt-4o",
      tools: tools,
      temperature: 1
    });
  }
  return assistant;
}


async function createThread() {
  if (!thread) {
    thread = await openai.beta.threads.create();
  }
  return thread;
}


async function handleUserInputData(userMessage) {
  try {
    const date = getCurrentDate();
    console.log(date)
    const assistant = await createAssistant(date);
    const thread = await createThread();

    
    // Check if there's an active run
    const runs = await openai.beta.threads.runs.list(thread.id);
    const activeRun = runs.data.find(run => ['in_progress', 'queued'].includes(run.status));

    if (activeRun) {
      // If there's an active run, wait for it to complete
      await waitForRunCompletion(thread.id, activeRun.id);
    }

    // Now it's safe to create a new message and start a new run
    const message = await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
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
          let args;
          try {
            args = JSON.parse(action.function.arguments);
          } catch (parseError) {
            console.error('Error parsing function arguments:', parseError);
            console.log('Raw arguments:', action.function.arguments);
            throw new Error('Invalid function arguments');
          }

          let output;
          if (funcName === "getInfo") {
            console.log("getInfo", args.query);
            output = await getInfo(args.query);
          } else if (funcName === "sendMessages") {
            output = await sendMessages(args.clients, args.message);
          } else if (funcName === "createCustomList") {
            console.log("createCustomList", args.name, args.query);
            const list = await createCustomList(args.name, args.query);
            const queryId = uuidv4();
            queryStore[queryId] = args.query;
            const listLink = `/custom-list?id=${queryId}`;
            console.log(listLink);
            output = queryId;
          } else if (funcName === "getMuslimClients") {
            console.log("getMuslimClients");
            const list = await getMuslimClients();
            const queryId = uuidv4();
            queryStore[queryId] = list;
            const listLink = `/custom-list?id=${queryId}`;
            console.log(listLink);
            output = queryId;
          } else if (funcName === "bookAppointmentAdmin") {
            output = await bookAppointmentAdmin(
              args.clientId,
              args.date,
              args.startTime,
              args.appointmentType,
              args.addOns || []
            );
          } else if (funcName === "getClientByName") {
            output = await getClientByName(args.firstName, args.lastName);
          } else if (funcName === "getAvailability") {
            output = await getAvailability(args.day, args.appointmentType, args.addOns, args.group);
          } else if (funcName === "cancelAppointmentById") {
            output = await cancelAppointmentById(args.clientId, args.date);
          } else if (funcName === "blockTime") {
            output = await createBlockedTime(args.date, args.startTime, args.endTime, args.reason);
          } else {
            throw new Error(`Unknown function: ${funcName}`);
          }
          toolOutputs.push({
            tool_call_id: action.id,
            output: JSON.stringify(output)
          });
        }

        await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
          tool_outputs: toolOutputs
        });

      } else {
        await delay(1000);
      }
    }
  } catch (error) {
    console.error('Detailed error in handleUserInputData:', error);
    console.log('User message:', userMessage);
    throw new Error('Error processing request: ' + error.message);
  }
}

// Add this helper function to wait for a run to complete
async function waitForRunCompletion(threadId, runId) {
  while (true) {
    await delay(1000);
    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    if (['completed', 'failed', 'cancelled'].includes(runStatus.status)) {
      break;
    }
  }
}

// Add this function to retrieve the query
function getStoredQuery(id) {
  console.log(id)
  console.log(queryStore);
  return queryStore[id];
}

module.exports = { handleUserInputData, getStoredQuery };