const dbUtils = require('./dbUtils');

async function saveMessage(from, to, body, date, clientid) {
  if (!clientid) {
    throw new Error('Invalid clientid');
  }
  const db = dbUtils.getDB();
  
  // First, let's check the current max ID
  const checkMaxIdSql = 'SELECT MAX(id) FROM Messages';
  const maxIdResult = await db.query(checkMaxIdSql);
  const currentMaxId = maxIdResult.rows[0].max || 0;
  console.log("Current max ID in Messages table:", currentMaxId);

  // Reset the sequence if it's out of sync
  const resetSequenceSql = `
    SELECT setval('messages_id_seq', COALESCE((SELECT MAX(id) FROM Messages), 0));
  `;
  await db.query(resetSequenceSql);

  const sql = `
    INSERT INTO Messages (fromText, toText, body, date, clientid)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
  const values = [from, to, body, date, clientid];
  try {
    const res = await db.query(sql, values);
    const newId = res.rows[0].id;
    console.log("Message saved with id:", newId);
    
    if (newId <= currentMaxId) {
      console.warn(`Warning: New ID (${newId}) is not greater than current max ID (${currentMaxId})`);
    }
    
    return { id: newId };
  } catch (err) {
    console.error('Error saving message:', err.message);
    throw err;
  }
}

async function getAllMessages() {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM Messages ORDER BY id ASC';
  try {
    const res = await db.query(sql);
    return res.rows;
  } catch (err) {
    console.error('Error fetching all messages:', err.message);
    throw err;
  }
}

async function getMessagesByClientId(clientid) {
  if (!clientid) {
    throw new Error('Invalid clientid');
  }
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM Messages WHERE clientid = $1 ORDER BY id ASC';
  const values = [clientid];
  try {
    const res = await db.query(sql, values);
    return res.rows;
  } catch (err) {
    console.error('Error fetching messages by clientid:', err.message);
    throw err;
  }
}

async function deleteMessagesByClientId(clientid) {
  if (!clientid) {
    throw new Error('Invalid clientid');
  }
  const db = dbUtils.getDB();
  const sql = 'DELETE FROM Messages WHERE clientid = $1 RETURNING *';
  const values = [clientid];
  try {
    const res = await db.query(sql, values);
    console.log(`Messages deleted for clientid ${clientid}:`, res.rowCount);
    return { deletedCount: res.rowCount };
  } catch (err) {
    console.error('Error deleting messages by clientid:', err.message);
    throw err;
  }
}

async function toggleLastMessageReadStatus(clientid) {
  const db = dbUtils.getDB();
  const sql = `
    UPDATE Messages
    SET read = NOT read
    WHERE id = (
      SELECT id FROM Messages
      WHERE clientid = $1
      ORDER BY date DESC
      LIMIT 1
    )
  `;
  const values = [clientid];
  try {
    const res = await db.query(sql, values);
    console.log(`Last message for clientid ${clientid} read status toggled`);
    return { updatedCount: res.rowCount };
  } catch (err) {
    console.error('Error toggling last message read status:', err.message);
    throw err;
  }
}

async function setMessagesRead(clientid) {
  const db = dbUtils.getDB();
  const sql = 'UPDATE Messages SET read = true WHERE clientid = $1';
  const values = [clientid];

  try {
    const res = await db.query(sql, values);
    console.log(`Messages marked as read for clientid ${clientid}:`, res.rowCount);
    return { updatedCount: res.rowCount };
  } catch (err) {
    console.error('Error setting messages as read:', err.message);
    throw err;
  }
}

module.exports = {
  saveMessage,
  getAllMessages,
  getMessagesByClientId,
  deleteMessagesByClientId,
  toggleLastMessageReadStatus,
  setMessagesRead
};