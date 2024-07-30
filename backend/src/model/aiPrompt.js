const dbUtils = require('./dbUtils');

async function storeAIPrompt(clientId, aiPrompt) {
  const db = dbUtils.getDB();
  const sql = `
    INSERT INTO ai_prompts (client_id, prompt)
    VALUES ($1, $2)
    ON CONFLICT (client_id) DO UPDATE SET prompt = $2, updated_at = CURRENT_TIMESTAMP
  `;
  const values = [clientId, aiPrompt];
  try {
    await db.query(sql, values);
    console.log(`AI prompt stored for client ${clientId}`);
  } catch (err) {
    console.error('Error storing AI prompt:', err.message);
    throw err;
  }
}

async function getAIPrompt(clientId) {
  const db = dbUtils.getDB();
  const sql = 'SELECT prompt FROM ai_prompts WHERE client_id = $1';
  const values = [clientId];
  try {
    const res = await db.query(sql, values);
    return res.rows[0]?.prompt;
  } catch (err) {
    console.error('Error fetching AI prompt:', err.message);
    throw err;
  }
}

async function deleteAIPrompt(clientId) {
  const db = dbUtils.getDB();
  const sql = 'DELETE FROM ai_prompts WHERE client_id = $1';
  const values = [clientId];
  try {
    const res = await db.query(sql, values);
    console.log(`AI prompt deleted for client ${clientId}`);
    return res.rowCount > 0; // Returns true if a row was deleted, false otherwise
  } catch (err) {
    console.error('Error deleting AI prompt:', err.message);
    throw err;
  }
}

module.exports = {
  storeAIPrompt,
  getAIPrompt,
  deleteAIPrompt
};