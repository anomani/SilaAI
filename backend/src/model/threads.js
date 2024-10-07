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

module.exports = {
  saveThread,
  getAllThreads,
  getThreadByPhoneNumber,
  deleteThreadByPhoneNumber,
  updateThreadId
};
