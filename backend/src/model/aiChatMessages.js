const dbUtils = require('./dbUtils');

async function createMessage(threadId, message, role, user_id) {
  console.log('[createMessage] user_id:', user_id);
  const db = dbUtils.getDB();

  const sql = `
    INSERT INTO ai_chat_messages (thread_id, message, role, created_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING id, message, role, created_at
  `;
  const values = [threadId, message, role];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error creating message:', err.message);
    throw err;
  }
}

async function getThreadMessages(threadId, user_id) {
  console.log('[getThreadMessages] user_id:', user_id);
  const db = dbUtils.getDB();
  const sql = `
    SELECT m.* 
    FROM ai_chat_messages m
    JOIN ai_chat_threads t ON m.thread_id = t.id
    WHERE t.id = $1 AND t.user_id = $2
    ORDER BY m.created_at ASC
  `;
  const values = [threadId, user_id];
  try {
    const res = await db.query(sql, values);
    return res.rows;
  } catch (err) {
    console.error('Error fetching thread messages:', err.message);
    throw err;
  }
}

async function deleteThreadMessages(threadId, user_id) {
  console.log('[deleteThreadMessages] user_id:', user_id);
  const db = dbUtils.getDB();
  const sql = `
    DELETE FROM ai_chat_messages m
    USING ai_chat_threads t
    WHERE m.thread_id = t.id
    AND t.id = $1 
    AND t.user_id = $2
    RETURNING m.id
  `;
  const values = [threadId, user_id];
  try {
    const res = await db.query(sql, values);
    return { deletedCount: res.rowCount };
  } catch (err) {
    console.error('Error deleting thread messages:', err.message);
    throw err;
  }
}

module.exports = {
  createMessage,
  getThreadMessages,
  deleteThreadMessages
}; 