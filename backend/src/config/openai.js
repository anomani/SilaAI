const { OpenAI } = require('openai');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { getAvailability, getCurrentDate } = require('../services/tools/getAvailability');
const { bookAppointment } = require('../services/tools/bookAppointment');
const {cancelAppointment} = require('../services/tools/cancelAppointment')


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
      name: "getAvailability",
      description: "Gets the times from the week that are already booked or are blocked off. You are gonna be getting unavailable blocked times and times which already have appointments. Those are the times which you are unavailable other than that the customer can book an appointment",
      parameters: {
        type: "object",
        properties: {
          day: {
            type: "string",
            description: "What day that they are checking availability for. This could be phrases such as today or tomorrow or could be actual dates such as May 29"
          }
        },
        required: ["day"]
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
            description: "The date for the appointment. Date should be converted to MM/DD/YYYY"
          },
          time: {
            type: "string",
            description: "The time for the appointment. This could be in 24-hour format like 14:30. Convert it into military time if it isnt already."
          },
          fname: {
            type: "string",
            description: "The first name of the person booking the appointment"
          },
          lname: {
            type: "string",
            description: "The last name of the person booking the appointment"
          },
          phone: {
            type: "string",
            description: "The phone number of the person booking the appointment"
          },
          email: {
            type: "string",
            description: "The email of the person booking the appointment"
          }
        },
        required: ["date", "time", "name", "phone", "email"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getCurrentDate",
      description: "Gets the current date without taking any parameters"
    }
  },
  {
    type: "function",
    function: {
      name: "cancelAppointment",
      description: "Cancels an appointment by the provided name",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name fo the client trying to cancel their appointment"
          }
        },
        required: ["name"]
      }
    }
  }
];

async function createAssistant() {
  if (!assistant) {
    assistant = await openai.beta.assistants.create({
      instructions: "I want you to respond to the user about availabilities from my schedule. You will be given times that are already booked. My timings are Monday-Friday from 9am to 5pm. Respond to user queries about availability and scheduling. Do not let the user book outside of my timings. You can also be asked to reschedule or cancel. If you are asked to cancel, then use the cancel function. If you are asked to reschedule then run the function to cancel, then use the other functions to find another time with the customer and schedule a new time",
      name: "Scheduling Assistant",
      model: "gpt-4o",
      tools: tools
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

async function handleUserInput(userMessage) {
  try {
    const assistant = await createAssistant();
    const thread = await createThread();

    const message = await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      instructions: "Please address the user in very informal language using phrases such as brother or bro"
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
            const output = await getAvailability(args.day);
            toolOutputs.push({
              tool_call_id: action.id,
              output: JSON.stringify(output)
            });
          } else if (funcName === "bookAppointment") {
            const output = await bookAppointment(args.date, args.time, args.fname, args.lname, args.phone, args.email);
            toolOutputs.push({
              tool_call_id: action.id,
              output: JSON.stringify(output)
            });
          } else if (funcName === "getCurrentDate") {
            const output = getCurrentDate();
            toolOutputs.push({
              tool_call_id: action.id,
              output: JSON.stringify(output)
            });
          } else if (funcName === "cancelAppointment") {
            const output = await cancelAppointment(args.name);
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
