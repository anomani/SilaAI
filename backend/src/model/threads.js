const dbUtils = require('./dbUtils');
const { OpenAI } = require('openai');

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

async function getThreadMessages(threadId) {
  if (!threadId) {
    throw new Error('Invalid threadId');
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const messages = await openai.beta.threads.messages.list(threadId);

    // Format messages in a structured way
    const formattedMessages = messages.data.map(message => ({
      role: message.role,
      content: message.content[0].text.value,
      created_at: new Date(message.created_at * 1000).toISOString(),
      id: message.id
    }));

    return {
      thread_id: threadId,
      message_count: formattedMessages.length,
      messages: formattedMessages
    };

  } catch (err) {
    console.error('Error fetching thread messages:', err.message);
    throw new Error(`Failed to fetch thread messages: ${err.message}`);
  }
}

// AI Chat Threads functions
async function createAIChatThread(title, threadId, user_id) {
  if (!threadId || !user_id) {
    throw new Error('Invalid threadId or user_id');
  }
  const db = dbUtils.getDB();

  const sql = `
    INSERT INTO ai_chat_threads (title, thread_id, user_id, last_message_at)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    RETURNING id, title, thread_id, created_at, last_message_at
  `;
  const values = [title || 'New Chat', threadId, user_id];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error creating AI chat thread:', err.message);
    throw err;
  }
}

async function getAIChatThreads(user_id) {
  if (!user_id) {
    throw new Error('user_id is required');
  }
  
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM ai_chat_threads WHERE user_id = $1 ORDER BY last_message_at DESC NULLS LAST';
  try {
    const res = await db.query(sql, [user_id]);
    return res.rows || [];
  } catch (err) {
    console.error('Error fetching AI chat threads:', err.message);
    throw new Error(`Failed to fetch AI chat threads: ${err.message}`);
  }
}

async function getAIChatThread(id, user_id) {
  if (!id || !user_id) {
    throw new Error('id and user_id are required');
  }
  
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM ai_chat_threads WHERE id = $1 AND user_id = $2';
  try {
    const res = await db.query(sql, [id, user_id]);
    return res.rows[0] || null;
  } catch (err) {
    console.error('Error fetching AI chat thread:', err.message);
    throw new Error(`Failed to fetch AI chat thread: ${err.message}`);
  }
}

async function updateAIChatThreadTitle(id, title, user_id) {
  const db = dbUtils.getDB();
  const sql = 'UPDATE ai_chat_threads SET title = $1 WHERE id = $2 AND user_id = $3 RETURNING *';
  try {
    const res = await db.query(sql, [title, id, user_id]);
    return res.rows[0];
  } catch (err) {
    console.error('Error updating AI chat thread title:', err.message);
    throw err;
  }
}

async function deleteAIChatThread(id, user_id) {
  const db = dbUtils.getDB();
  const sql = 'DELETE FROM ai_chat_threads WHERE id = $1 AND user_id = $2 RETURNING *';
  try {
    const res = await db.query(sql, [id, user_id]);
    return res.rows[0];
  } catch (err) {
    console.error('Error deleting AI chat thread:', err.message);
    throw err;
  }
}

async function getThreadByOpenAIId(openaiThreadId, user_id) {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM ai_chat_threads WHERE thread_id = $1 AND user_id = $2';
  try {
    const res = await db.query(sql, [openaiThreadId, user_id]);
    return res.rows[0];
  } catch (err) {
    console.error('Error fetching thread by OpenAI ID:', err.message);
    throw err;
  }
}

async function updateThreadLastMessage(threadId, user_id) {
  const db = dbUtils.getDB();
  
  // If the threadId starts with 'thread_', it's an OpenAI thread ID
  if (typeof threadId === 'string' && threadId.startsWith('thread_')) {
    const thread = await getThreadByOpenAIId(threadId, user_id);
    if (!thread) {
      throw new Error('Thread not found');
    }
    threadId = thread.id;
  }

  const sql = 'UPDATE ai_chat_threads SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *';
  try {
    const res = await db.query(sql, [threadId, user_id]);
    return res.rows[0];
  } catch (err) {
    console.error('Error updating thread last message:', err.message);
    throw err;
  }
}

async function updateAIChatThread(id, threadId, user_id) {
  if (!id || !threadId || !user_id) {
    throw new Error('Invalid id, threadId, or user_id');
  }
  const db = dbUtils.getDB();

  const sql = `
    UPDATE ai_chat_threads 
    SET thread_id = $1, last_message_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND user_id = $3
    RETURNING id, title, thread_id, created_at, last_message_at
  `;
  const values = [threadId, id, user_id];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error updating AI chat thread:', err.message);
    throw err;
  }
}

// async function main() {
//   const threadId = 'thread_EcWzhUR0KjfsObYJSdVpfsER';
//   const messages = await getThreadMessages(threadId);
//   console.log(messages);
// }

// main();

module.exports = {
  saveThread,
  getAllThreads,
  getThreadByPhoneNumber,
  deleteThreadByPhoneNumber,
  updateThreadId,
  getThreadMessages,
  createAIChatThread,
  getAIChatThreads,
  getAIChatThread,
  updateAIChatThreadTitle,
  deleteAIChatThread,
  updateThreadLastMessage,
  getThreadByOpenAIId,
  updateAIChatThread
};
