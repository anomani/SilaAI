const dotenv = require('dotenv');
dotenv.config({ path: '../env' });
const { OpenAI } = require('openai');
const { zodResponseFormat } = require("openai/helpers/zod");
const { z } = require("zod");
console.log(process.env.OPENAI_API_KEY)

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

async function fetchEvent() {
    try {
        const completion = await openai.beta.chat.completions.parse({
          model: "gpt-4o-2024-08-06",
          messages: [
            { role: "system", content: "Extract the event information." },
            { role: "user", content: "Alice and Bob are going to a science fair on Friday." },
          ],
          response_format: zodResponseFormat(CalendarEvent, "event"),
        });
        
        const event = completion.choices[0].message.parsed;
        
        console.log(event);
    } catch (error) {
        console.error("Error fetching event:", error);
    }
}

fetchEvent();
