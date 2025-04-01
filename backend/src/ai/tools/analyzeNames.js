const { OpenAI } = require('openai');
const { getInfo } = require('./getCustomers');
const dotenv = require('dotenv');
dotenv.config({ path: '../../../.env' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function analyzeNames(names) {
  const chunkSize = 5; // Increased chunk size
  const results = {};
  const chunks = [];

  // Prepare chunks
  for (let i = 0; i < names.length; i += chunkSize) {
    chunks.push(names.slice(i, i + chunkSize));
  }
  console.log(chunks);
  // Process chunks in parallel
  await Promise.all(chunks.map(async (chunk) => {
    const prompt = `Determine if each name in this list is likely to be a Muslim name. Respond with a JSON object where the key is the name and the value is a boolean (true if likely Muslim, false if not): ${chunk.join(', ')}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k", // Using a model with larger context
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const content = response.choices[0].message.content.trim();
      console.log(content);
      Object.assign(results, JSON.parse(content));
    } catch (error) {
      // Error handling
    }
  }));

  return results;
}

async function getMuslimClients() {
  const allClientsQuery = "SELECT id, firstname, lastname FROM Client WHERE user_id = 1";
  const allClients = await getInfo(allClientsQuery);

  const names = allClients.map(client => `${client.firstname} ${client.lastname}`);

  const analysisResult = await analyzeNames(names);

  const muslimClientIds = allClients.filter((client) => {
    const fullName = `${client.firstname} ${client.lastname}`;
    return analysisResult[fullName];
  }).map(client => client.id);

  const query = `
    SELECT * FROM Client
    WHERE id IN (${muslimClientIds.join(', ')})
  `;
  return query;
}

async function getMuslimClientsWithNoEid(user_id) {
  console.log('[getMuslimClientsWithNoEid] Starting...');
  
  try {
    const dbUtils = require('../../model/dbUtils');
    const db = dbUtils.getDB();
    
    // Get the SQL query for Muslim clients
    const muslimClientsQuery = await getMuslimClients();
    
    // Modified query to get Muslim clients who don't have Eid messages in one go
    const query = `
      WITH MuslimClients AS (${muslimClientsQuery.replace(';', '')})
      SELECT DISTINCT mc.*
      FROM MuslimClients mc
      WHERE NOT EXISTS (
        SELECT 1 
        FROM Messages m 
        WHERE m.clientid = mc.id 
        AND m.user_id = $1
        AND m.body ILIKE '%eid mubarak%'
      )
    `;
    
    const result = await db.query(query, [user_id]);
    console.log('Found Muslim clients with no Eid messages:', result.rows.length);
    return result.rows;
  } catch (err) {
    console.error('Error in getMuslimClientsWithNoEid:', err.message);
    console.error('Stack trace:', err.stack);
    throw err;
  }
}

// async function main() {
//   const clients = await getMuslimClientsWithNoEid(1);
//   console.log(clients);
// }

// main();
module.exports = { analyzeNames, getMuslimClients, getMuslimClientsWithNoEid };