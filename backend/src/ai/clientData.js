const { OpenAI } = require('openai');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { getInfo } = require('./tools/getCustomers');
const {sendMessage, sendMessages} = require('../config/twilio');
const fs = require('fs');
const path = require('path');
const { createCustomList, getCustomList } = require('../model/customLists');
const { analyzeNames, getMuslimClients, analyzeNamesQueue } = require('./tools/analyzeNames');
const { v4: uuidv4 } = require('uuid');

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
    const date = new Date();
    const assistant = await createAssistant(date);
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

// Add this function to retrieve the query
function getStoredQuery(id) {
  return queryStore[id];
}

module.exports = { handleUserInputData, getStoredQuery };
