const dbUtils = require('./dbUtils');

async function updateAIResponseStatus(clientId, status) {
  const db = dbUtils.getDB();
  const query = `
    INSERT INTO ai_response_status (client_id, status, created_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (client_id) 
    DO UPDATE SET 
      status = $2,
      updated_at = NOW()
  `;
  
  try {
    await db.query('BEGIN');
    await db.query(query, [clientId, status]);
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error updating AI response status:', error);
    throw error;
  }
}

async function getAIResponseStatus(clientId) {
  const db = dbUtils.getDB();
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