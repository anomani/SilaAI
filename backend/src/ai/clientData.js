const { OpenAI } = require('openai');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { getInfo } = require('./tools/getCustomers');
const {sendMessage, sendMessages} = require('../config/twilio');
const fs = require('fs');
const path = require('path');

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
    name: "sendMessages",
    description: "Sends messages to clients that are passed in as a parameter",
    parameters: {
      type: "object",
      properties: {
        clients: {
          type: "array",
          description: "An array of client phonenumbers",
          items: {
            type: "string"
          }
        },
        message: {
          type: "object",
          description: "The message to send to the clients."
        }
      },
      required: ["clients", "message"]
    }
  }
},
{
  type: "function",
  function: {
    name: "getInfo",
    description: "Retrieves a list of clients who have not visited in the specified number of days.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The SQL query to search the clients for."
        }
      },
      required: ["days"]
    }
  }
}
];

async function createAssistant() {
  const instructionsPath = path.join(__dirname, 'dataInstructions.txt');
  const assistantInstructions = fs.readFileSync(instructionsPath, 'utf8');
  if (!assistant) {
    assistant = await openai.beta.assistants.create({
      instructions: assistantInstructions,
      name: "Client Data",
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


async function handleUserInputData(userMessage) {
  try {
    const date = new Date();
    const assistant = await createAssistant();
    const thread = await createThread();

    const message = await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      additional_instructions: `The current date is ${date}`
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

          let output;
          if (funcName === "getInfo") {
            console.log(args.query)
            output = await getInfo(args.query);
          } else if (funcName === "sendMessages") {
            output = await sendMessages(args.clients, args.message);
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
    console.error(error);
    throw new Error('Error processing request');
  }
}




module.exports = { handleUserInputData };
