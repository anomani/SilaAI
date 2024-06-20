const { OpenAI } = require('openai');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { getAvailability, getCurrentDate } = require('./tools/getAvailability');
const { bookAppointment } = require('./tools/bookAppointment');
const {cancelAppointment} = require('./tools/cancelAppointment')
const { getClientByPhoneNumber } = require('../model/clients');
const {getMessagesByClientId} = require('../model/messages')
const {getAllAppointmentsByClientId} = require('../model/appointment')

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
      description: "Given the day will return an array of JSON objects with the following properties: id, appointmentType, clientId, date, startTime, endTime, details. These are the already made appointments for that day.",
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
          appointmentType: {
            type: "string",
            description: "The type of appointment they want to book."
          }
        },
        required: ["date", "startTime", "appointmentType"]
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
  }
];
const assistantInstructions = `
Now, this can either be a campaign to get the user to return to the barbershop and schedule an appointment or this can be a client trying to schedule an appointment. Use your judgement to classify what it is. If the twilio phone number which is +18446480598 was the first one to reach out in the messages then it is most likely a campaign to get the user to return. If the user was the one who reached out then it was most  likely the user trying to schedule an appointment.

If it is a client trying to schedule an appointment here are the following instructions:

I want you to respond to the user about availabilities from my schedule. Using the getAvailability you are going to be given the appointments for the day.
Lets say the only appointment for the day is from 9:00 to 9:30 then respond to the user saying we have availability anytime from 9:30 to 5:00.
Do not tell the user what slots are already booked just give them timings that are not booked. Do not give out any information about specific appointments and client names.
My timings are Monday-Friday from 9am to 5pm. Do not let the user book outside of my timings. You can also be asked to reschedule or cancel.
If you are asked to cancel, then use the cancel function. If you are asked to reschedule then run the function to cancel, then use the other functions to find another time with the customer and schedule a new time.
If you are asked about availiability for tomorrow or today and phrases such as those then
Use the getCurrentDate function to figure out today's date then use your reasoning to figure out the date for the day they are seeking.
Don't ever respond in military time always convert to AM or PM when talking to the user. Make sure to ask the user what type of appointment they want to book. 

If you think this is a campaign to get the user to return to the barbershop. Then, use the following instructions:

Your task is to get the user to return to the barber shop through normal informal conversation. Just talk to them very casually and use the conversation history in order to assess how to address the user. Don't immediately bring up that you should come back use informal small talk and then when you see fit bring up that you should swing by the barbershop sometime and when you feel that the user wants to book then use the scheduling instructions to accomplish this
Here is an example conversation:
AI: Hey man this is Uzi from Uzi cuts. How you doing

Customer: Im good bro how you been

AI: Im good man. Havent heard from you in a while what you been up to

Customer: Ive been good just busy with work and everything

AI: Gochu, yea you should stop by for a cut sometime

Customer: Yea man I actually need a cut soon whats your availability looking like for tomorrow

***Sequence to book appointment starts***

I want you to talk in a similar tone using words such as gochu, yea, man, lmao, etc. The tone should be very casual and not sound like a bot but like a barber
Talk to the user in informal language and address them by their name. 
`;

async function createAssistant() {
  if (!assistant) {
    assistant = await openai.beta.assistants.create({
      instructions: assistantInstructions,
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

async function classifyMessage(message, messageHistory) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `
          You are a classifier that determines whether a message should be handled by an AI assistant or needs human intervention. 
          Classify the following message as either "assistant" if it can be handled by the AI assistant, or "user" if it needs to be forwarded to a human for intervention.
          The capabilities of the AI are as follows: Able to schedule, reschedule, cancel appointments and talk to the user in informal language and address them by their name and 
          should be able to make pretty basic small talk. 
          Examples:
          Message: "Hello"
          Classification: assistant

          Message: "Where you at"
          Classification: user

          Message: "Can I book an appointment for tomorrow at 3 PM?"
          Classification: assistant

          Message: "I have a complaint about my last visit."
          Classification: user

          Message: "What are your working hours?"
          Classification: assistant

          Message: "I need to speak to a manager."
          Classification: user

          Message: "How are you"
          Classification: assistant

          Message: "What's the address"
          Classification: user

          Message: "Hey man"
          Classification: user
          Any greeting phrases should be classified as assistant. If the message is giving information such as I'm outside or I'm going to be ten minutes late then flag as user as this is something that the user should know
          I want the user to be flagged as little as possible only when it is necessary for human input or any specific questions are asked then you should classify as user
          Use the message history to help you with your judgement on wether or not this is something that the asisstant can handle or requires human input
          Here is the message history: ${messageHistory}
        `
      },
      {
        role: "user",
        content: `Message: "${message}"\nClassification:`
      }
    ],
    max_tokens: 1,
    temperature: 0
  });

  return response.choices[0].message.content.trim();
}

async function handleUserInput(userMessage, phoneNumber) {
  try {
    const classification = await classifyMessage(userMessage);
    console.log(classification)
    if (classification === "user") {
      return "user"
    }
    else {
      const assistant = await createAssistant();
      const thread = await createThread();
      const client = await getClientByPhoneNumber(phoneNumber)
      const messages = await getMessagesByClientId(client.id)

      const fname = client.firstName
      const lname = client.lastName
      const email = client.email
      const phone = client.phoneNumber

      const message = await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: userMessage,
      });

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
        additional_instructions: `The client's name is ${fname} ${lname}, their email is ${email}, and their phone number is ${phone}. These are the messages between the client and the user: ${messages}. Address the customer by their name and make it natural`
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
              const output = await bookAppointment(args.date, args.startTime, fname, lname, phone, email, args.appointmentType);
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
    }
  } catch (error) {
    console.error(error);
    throw new Error('Error processing request');
  }
}

module.exports = { getAvailability, bookAppointment, handleUserInput };