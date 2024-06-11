const { OpenAI } = require('openai');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { getAvailability, getCurrentDate } = require('./tools/getAvailability');
const { bookAppointment } = require('./tools/bookAppointment');
const {cancelAppointment} = require('./tools/cancelAppointment')


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
      description: "Given the day will return an array of JSON objects with the following properties: _id, appointmentType, clientId, date, startTime, endTime, details. These are the already made appointments for that day.",
      parameters: {
        type: "object",
        properties: {
          day: {
            type: "string",
            description: "What day that they are checking availability for. This should be in the form of YYYY-MM-DD. Convert anything else that the user gives to this form. Use the getCurrentDate if the user uses phrases such as today or tomorrow"
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
            description: "The date for the appointment. Date should be converted to YYYY-MM-DD"
          },
          startTime: {
            type: "string",
            description: "The time for the appointment. This could be in 24-hour format like 14:30. Convert it into military time if it isnt already in the form of HH:MM."
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
          },
          appointmentType: {
            type: "string",
            description: "The type of appointment they want to book."
          }
        },
        required: ["date", "startTime", "fname", "lname", "phone", "email", "appointmentType"]
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
          number: {
            type: "string",
            description: "Number of the client trying to cancel their appointment"
          },
          date: {
            type: "string",
            description: "Date of the appointment they want to cancel"
          }
        },
        required: ["number", "date"]
      }
    }
  }
];

async function createAssistant() {
  if (!assistant) {
    assistant = await openai.beta.assistants.create({
      instructions: "I want you to respond to the user about availabilities from my schedule. Using the getAvailability you are going to be given the appointments for the day. Lets say the only appointment for the day is from 9:00 to 9:30 then respond to the user saying we have availability anytime from 9:30 to 5:00. Do not tell the user what slots are already booked just give them timings that are not booked. Do not give out any information about specific appointments and client names. My timings are Monday-Friday from 9am to 5pm. Do not let the user book outside of my timings. You can also be asked to reschedule or cancel. If you are asked to cancel, then use the cancel function. If you are asked to reschedule then run the function to cancel, then use the other functions to find another time with the customer and schedule a new time. If you are asked about availiability for tomorrow or today and phrases such as those then Use the getCurrentDate function to figure out today's date then use your reasoning to figure out the date for the day they are seeking. Don't ever respond in military time always convert to AM or PM when talking to the user",
      name: "Scheduling Assistant",
      model: "gpt-4o",
      tools: tools,
      temperature: 0.1
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
          const args = JSON.parse(action.function.arguments);

          if (funcName === "getAvailability") {
            const output = await getAvailability(args.day);
            toolOutputs.push({
              tool_call_id: action.id,
              output: JSON.stringify(output)
            });
          } else if (funcName === "bookAppointment") {
            const output = await bookAppointment(args.date, args.startTime, args.fname, args.lname, args.phone, args.email, args.appointmentType);
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
            const output = await cancelAppointment(args.number, args.date);
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