
const { OpenAI } = require('openai');
const dotenv = require('dotenv')
dotenv.config({path : '../../.env'})
const {getAvailability} = require('../services/availability')
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

assistant_id = process.env.ASSISTANT_ID

async function main() {
  tools = [
    {
      "type": "function",
      "function": {
          "name": "getAvailability",
          "description": "Gets the times from the week that are already booked or are blocked off"
      }
  }
  ]
  
  
  const myAssistant = await openai.beta.assistants.create({
      instructions:
      "I want you to respond to the user about availabilities from my schedule. You will be given times that are already booked. My timings are Monday-Friday from 9am to 5pm. Respond to user queries about availability.",
      name: "Scheduling Assistant",
      model: "gpt-4o",
      tools: tools
    }
  )
  console.log(myAssistant)
  
  const thread = await openai.beta.threads.create();
  
  const message = await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: "Do you have availability on monday, May 27 at 11:00 am",
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: myAssistant.id,
    instructions: "Please address the user as Mervin Praison"
  })
  console.log(run)
  
  while(true) {
    run_status = await openai.beta.threads.runs.retrieve(thread.id, run.id)

    console.log(run_status)

    if (run_status.status === "completed") {
      const messages = await openai.beta.threads.messages.list(thread.id)
      messages.data.forEach(msg => {
        const content = msg.content[0].text.value
      });
      break;
    } else if(run_status.status === "requires_action") {
        console.log("Requires action")
        const required_actions = run_status.required_action.submit_tool_outputs 
        console.log(required_actions)

        const tools_outputs = []

        required_actions.tool_calls.forEach(async action => {
          const name = action.function.name
          const arguments = action.function.arguments
          if (name === "getAvailability") {

            const output = await getAvailability()
            const element = {"tool_call_id": action.id, "output": output }
            tools_outputs.push(element)
          }
          else {
            console.log("Function not found")
          }

          openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
            tool_outputs: tools_outputs
          })
        })
        

    } else {
      console.log("Waiting for run to complete")
      delay(5000)
    }

    


  }
  

}

main()

module.exports = main;
