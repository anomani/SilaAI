const { OpenAI } = require('openai');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { getInactiveClients, getClients } = require('./tools/getCustomers');

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function sendMessage(to, body) {
  return client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to,
    body: body
  })
  .then(message => {
    console.log(`Message sent: ${message.sid}`);
    return message;
  })
  .catch(error => {
    console.error(`Failed to send message: ${error.message}`);
    throw error;
  });
};

async function sendMessages(clients, message) {
  try {
    for (const client of clients) {
      await sendMessage(client.number, message);
    }
    return "Successfully sent messages to all clients.";
  } catch (error) {
    console.error(`Failed to send messages: ${error.message}`);
    throw error;
  }
};



const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let assistant;
let thread;
/*
{
  type: "function",
  function: {
    name: "getInactiveClients",
    description: "Retrieves a list of clients who have not visited in the specified number of days.",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "The number of days since the last visit to consider a client inactive."
        }
      },
      required: ["days"]
    }
  }
}
{
  type: "function",
  function: {
    name: "getClients",
    description: "Retrieves a list of all clients in json format. Use the data to answer the user's questions.",
    parameters: {}
  }
}
*/
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
          description: "An array of client objects",
          items: {
            type: "object"
          }
        },
        message: {
          type: "object",
          description: "The message to send to the clients."
        }
      },
      required: ["days"]
    }
  }
},
{
  type: "function",
  function: {
    name: "getInactiveClients",
    description: "Retrieves a list of clients who have not visited in the specified number of days.",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "The number of days since the last visit to consider a client inactive."
        }
      },
      required: ["days"]
    }
  }
}
];

async function createAssistant() {
  if (!assistant) {
    assistant = await openai.beta.assistants.create({
      instructions: "The user is going to ask questions about the clients and business operations. You are going to be given a tool called getInactiveClients which fetches all the clients from the database in a json format who have not shown up in the given amount of days. You can be asked about a certain query and I want you to narrow it down for the user. Give the user the full and correct answer. For example if the user asks for all clients who have not shown up in more than 100 days show them 10 clients then say how many more in total there who match the criteria. You are also going to be given a function to send messages called sendMessages. Write a message and pass it in as a parameter as well as an array of client objects. Before sending any messages confirm with the user that you will send the messages and ask for their permission. If the user agrees then send the messages. If the user does not agree then do not send the messages. ",
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

          let output;
          if (funcName === "getInactiveClients") {
            output = await getInactiveClients(args.days);
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
