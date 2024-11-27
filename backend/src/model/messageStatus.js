const db = require('../config/db');

async function updateAIResponseStatus(clientId, status) {
  const query = `
    INSERT INTO ai_response_status (client_id, status, created_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (client_id) 
    DO UPDATE SET 
      status = $2,
      updated_at = NOW()
  `;
  
  try {
    await db.query(query, [clientId, status]);
  } catch (error) {
    console.error('Error updating AI response status:', error);
    throw error;
  }
}

async function getAIResponseStatus(clientId) {
  const query = `
    SELECT status, created_at, updated_at
    FROM ai_response_status 
    WHERE client_id = $1
  `;
  
  try {
    const result = await db.query(query, [clientId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting AI response status:', error);
    throw error;
  }
}



module.exports = {
  updateAIResponseStatus,
  getAIResponseStatus
};