const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const readline = require('readline');
dotenv.config({ path: '../../.env' });
const { getAvailability } = require('../services/getAvailability');
const {bookAppointment} = require('../services/bookAppointment')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const assistant_id = process.env.ASSISTANT_ID;

const tools = [{
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
  }  

];

async function createAssistant() {
  return await openai.beta.assistants.create({
    instructions: "I want you to respond to the user about availabilities from my schedule. You will be given times that are already booked. My timings are Monday-Friday from 9am to 5pm. Respond to user queries about availability.",
    name: "Scheduling Assistant",
    model: "gpt-4o",
    tools: tools
  });
}

async function createThread() {
  return await openai.beta.threads.create();
}

async function handleUserInput(assistant, thread) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  rl.setPrompt('Ask your question: ');
  rl.prompt();

  rl.on('line', async (line) => {
    const userMessage = line.trim();

    if (userMessage.toLowerCase() === 'exit') {
      rl.close();
      process.exit(0);
    }

    console.log(`User: ${userMessage}`);

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
          console.log(`Assistant: ${assistantMessage.content[0].text.value}`);
        }

        break;
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
            const output = await bookAppointment(args.date, args.time, args.fname, args.lname, args.phone, args.email)
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

    rl.prompt();
  });
}

async function main() {
  try {
    const assistant = await createAssistant();
    const thread = await createThread();
    await handleUserInput(assistant, thread);
  } catch (error) {
    console.error(error);
  }
}

main();
module.exports = main;
