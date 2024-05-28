const OpenAI = require("openai");
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const yahooFinance = require('yahoo-finance2').default;
const readline = require('readline');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getStockPrice(symbol) {
    const quote = await yahooFinance.quote(symbol);
    return quote.regularMarketPrice;
}

const toolsList = [{
    type: "function",
    function: {
        name: "get_stock_price",
        description: "Retrieve the latest closing price of a stock using its ticker symbol",
        parameters: {
            type: "object",
            properties: {
                symbol: {
                    type: "string",
                    description: "The ticker symbol of the stock"
                }
            },
            required: ["symbol"]
        }
    }
}];

async function main() {
    const assistant = await openai.beta.assistants.create({
        name: "Data Analyst Assistant",
        instructions: "You are a personal Data Analyst Assistant",
        tools: toolsList,
        model: "gpt-4-1106-preview",
    });

    const thread = await openai.beta.threads.create();

    const message = await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: "Can you please provide me stock price of Apple?"
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
        instructions: "Please address the user as Mervin Praison."
    });

    console.log(JSON.stringify(run, null, 4));

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        console.log(JSON.stringify(runStatus, null, 4));

        if (runStatus.status === 'completed') {
            const messages = await openai.beta.threads.messages.list(thread.id);

            messages.data.forEach(msg => {
                console.log(`${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}: ${msg.content[0].text.value}`);
            });

            break;
        } else if (runStatus.status === 'requires_action') {
            console.log("Function Calling");
            const requiredActions = runStatus.required_action.submit_tool_outputs;
            console.log(requiredActions);

            const toolOutputs = [];

            for (const action of requiredActions.tool_calls) {
                const funcName = action.function.name;
                const args = JSON.parse(action.function.arguments);

                if (funcName === "get_stock_price") {
                    const output = await getStockPrice(args.symbol);
                    toolOutputs.push({
                        tool_call_id: action.id,
                        output: JSON.stringify(output)
                    });
                } else {
                    throw new Error(`Unknown function: ${funcName}`);
                }
            }

            console.log("Submitting outputs back to the Assistant...");
            await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, { tool_outputs: toolOutputs });
        } else {
            console.log("Waiting for the Assistant to process...");
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

main().catch(console.error);
