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
  getThreadMessages
};
