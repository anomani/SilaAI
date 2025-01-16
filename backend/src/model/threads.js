const dbUtils = require('./dbUtils');

async function saveThread(phoneNumber, threadId, user_id) {
  console.log('[saveThread] user_id:', user_id);
  if (!phoneNumber || !threadId) {
    throw new Error('Invalid phoneNumber or threadId');
  }
  const db = dbUtils.getDB();

  const sql = `
    INSERT INTO threads (phone_number, thread_id, user_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (phone_number) DO UPDATE SET thread_id = $2
    RETURNING id
  `;
  const values = [phoneNumber, threadId, user_id];
  try {
    const res = await db.query(sql, values);
    const newId = res.rows[0].id;
    console.log("Thread saved with id:", newId);
    
    return { id: newId };
  } catch (err) {
    console.error('Error saving thread:', err.message);
    throw err;
  }
}

async function getAllThreads(user_id) {
  console.log('[getAllThreads] user_id:', user_id);
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM threads WHERE user_id = $1 ORDER BY created_at DESC';
  try {
    const res = await db.query(sql, [user_id]);
    return res.rows;
  } catch (err) {
    console.error('Error fetching all threads:', err.message);
    throw err;
  }
}

async function getThreadByPhoneNumber(phoneNumber, user_id) {
  console.log('[getThreadByPhoneNumber] user_id:', user_id);
  if (!phoneNumber) {
    throw new Error('Invalid phoneNumber');
  }
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM threads WHERE phone_number = $1 AND user_id = $2';
  const values = [phoneNumber, user_id];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error fetching thread by phoneNumber:', err.message);
    throw err;
  }
}

async function deleteThreadByPhoneNumber(phoneNumber, user_id) {
  console.log('[deleteThreadByPhoneNumber] user_id:', user_id);
  if (!phoneNumber) {
    throw new Error('Invalid phoneNumber');
  }
  const db = dbUtils.getDB();
  const sql = 'DELETE FROM threads WHERE phone_number = $1 AND user_id = $2 RETURNING *';
  const values = [phoneNumber, user_id];
  try {
    const res = await db.query(sql, values);
    return { deletedCount: res.rowCount };
  } catch (err) {
    console.error('Error deleting thread by phoneNumber:', err.message);
    throw err;
  }
}

async function updateThreadId(phoneNumber, newThreadId, user_id) {
  console.log('[updateThreadId] user_id:', user_id);
  if (!phoneNumber || !newThreadId) {
    throw new Error('Invalid phoneNumber or newThreadId');
  }
  const db = dbUtils.getDB();
  const sql = 'UPDATE threads SET thread_id = $2 WHERE phone_number = $1 AND user_id = $3 RETURNING *';
  const values = [phoneNumber, newThreadId, user_id];
  try {
    const res = await db.query(sql, values);
    console.log(`Thread updated for phoneNumber ${phoneNumber}`);
    return { updatedCount: res.rowCount };
  } catch (err) {
    console.error('Error updating thread:', err.message);
    throw err;
  }
}

async function createAIChatThread(title, user_id) {
  console.log('[createAIChatThread] user_id:', user_id);
  if (!title) {
    throw new Error('Thread title is required');
  }
  const db = dbUtils.getDB();

  const sql = `
    INSERT INTO ai_chat_threads (title, user_id, created_at, last_message_at)
    VALUES ($1, $2, NOW(), NOW())
    RETURNING id, title, created_at
  `;
  const values = [title, user_id];
  try {
    const res = await db.query(sql, values);
    console.log("AI Chat thread created with id:", res.rows[0].id);
    return res.rows[0];
  } catch (err) {
    console.error('Error creating AI chat thread:', err.message);
    throw err;
  }
}

async function getAllAIChatThreads(user_id) {
  console.log('[getAllAIChatThreads] user_id:', user_id);
  const db = dbUtils.getDB();
  const sql = `
    SELECT 
      t.*,
      (SELECT message 
       FROM ai_chat_messages 
       WHERE thread_id = t.id 
       ORDER BY created_at DESC 
       LIMIT 1) as last_message
    FROM ai_chat_threads t
    WHERE t.user_id = $1 
    ORDER BY t.last_message_at DESC
  `;
  try {
    const res = await db.query(sql, [user_id]);
    return res.rows;
  } catch (err) {
    console.error('Error fetching AI chat threads:', err.message);
    throw err;
  }
}

async function getAIChatThreadById(threadId, user_id) {
  console.log('[getAIChatThreadById] user_id:', user_id);
  const db = dbUtils.getDB();
  const sql = `
    SELECT * FROM ai_chat_threads 
    WHERE id = $1 AND user_id = $2
  `;
  const values = [threadId, user_id];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error fetching AI chat thread:', err.message);
    throw err;
  }
}

async function updateAIChatThread(threadId, updates, user_id) {
  console.log('[updateAIChatThread] user_id:', user_id);
  const db = dbUtils.getDB();
  const { title } = updates;
  
  const sql = `
    UPDATE ai_chat_threads 
    SET title = $1, 
        last_message_at = NOW()
    WHERE id = $2 AND user_id = $3
    RETURNING *
  `;
  const values = [title, threadId, user_id];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error updating AI chat thread:', err.message);
    throw err;
  }
}

async function deleteAIChatThread(threadId, user_id) {
  console.log('[deleteAIChatThread] user_id:', user_id);
  const db = dbUtils.getDB();
  const sql = 'DELETE FROM ai_chat_threads WHERE id = $1 AND user_id = $2 RETURNING *';
  const values = [threadId, user_id];
  try {
    const res = await db.query(sql, values);
    return { deletedCount: res.rowCount };
  } catch (err) {
    console.error('Error deleting AI chat thread:', err.message);
    throw err;
  }
}

async function updateAIChatThreadLastMessage(threadId, user_id) {
  console.log('[updateAIChatThreadLastMessage] user_id:', user_id);
  const db = dbUtils.getDB();
  const sql = `
    UPDATE ai_chat_threads 
    SET last_message_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `;
  const values = [threadId, user_id];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error updating AI chat thread last message:', err.message);
    throw err;
  }
}

module.exports = {
  saveThread,
  getAllThreads,
  getThreadByPhoneNumber,
  deleteThreadByPhoneNumber,
  updateThreadId,
  createAIChatThread,
  getAllAIChatThreads,
  getAIChatThreadById,
  updateAIChatThread,
  deleteAIChatThread,
  updateAIChatThreadLastMessage
};
