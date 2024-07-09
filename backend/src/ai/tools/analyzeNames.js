const { OpenAI } = require('openai');
const { getInfo } = require('./getCustomers');
const dotenv = require('dotenv');
dotenv.config({ path: '../../../.env' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeNames(names) {
  const chunkSize = 1000;
  const results = {};
  const chunks = [];

  for (let i = 0; i < names.length; i += chunkSize) {
    chunks.push(names.slice(i, i + chunkSize));
  }

  await Promise.all(chunks.map(async (chunk) => {
    const prompt = `Determine if each name in this list is likely to be a Muslim name. Respond with a JSON object where the key is the name and the value is a boolean (true if likely Muslim, false if not): ${chunk.join(', ')}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const content = response.choices[0].message.content.trim();
      Object.assign(results, JSON.parse(content));
    } catch (error) {
      console.error('Error analyzing names:', error);
    }
  }));

  return results;
}

async function getMuslimClients() {
  const allClientsQuery = "SELECT id, firstname, lastname FROM Client";
  const allClients = await getInfo(allClientsQuery);

  const names = allClients.map(client => `${client.firstname} ${client.lastname}`);

  const analysisResult = await analyzeNames(names);

  const muslimClientIds = allClients.filter((client) => {
    const fullName = `${client.firstname} ${client.lastname}`;
    return analysisResult[fullName];
  }).map(client => client.id);

  // Use a prepared statement to prevent SQL injection
  const placeholders = muslimClientIds.map(() => '?').join(', ');
  const query = `
    SELECT * FROM Client
    WHERE id IN (${placeholders})
  `;

  return { query, params: muslimClientIds };
}

module.exports = { analyzeNames, getMuslimClients };
