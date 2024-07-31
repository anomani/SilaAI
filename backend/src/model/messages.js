const dbUtils = require('./dbUtils');

async function saveMessage(from, to, body, date, clientid, read = true, isAI = false) {
  if (!clientid) {
    throw new Error('Invalid clientid');
  }
  const db = dbUtils.getDB();

  const sql = `
    INSERT INTO Messages (fromText, toText, body, date, clientid, read, is_ai)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `;
  const values = [from, to, body, date, clientid, read, isAI];
  try {
    const res = await db.query(sql, values);
    const newId = res.rows[0].id;
    console.log("Message saved with id:", newId);
    
    return { id: newId };
  } catch (err) {
    console.error('Error saving message:', err.message);
    throw err;
  }
}

async function getAllMessages() {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM Messages ORDER BY date ASC';
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
  const sql = 'SELECT * FROM Messages WHERE clientid = $1 ORDER BY id DESC';
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

async function getAllMessagesGroupedByClient() {
  const db = dbUtils.getDB();
  const sql = `
    SELECT 
      clientid,
      json_agg(
        json_build_object(
          'id', id,
          'fromText', fromText,
          'toText', toText,
          'body', body,
          'date', date,
          'read', read,
          'is_ai', is_ai
        ) ORDER BY date ASC
      ) AS messages
    FROM Messages
    GROUP BY clientid
  `;
  try {
    const res = await db.query(sql);
    return res.rows.reduce((acc, row) => {
      acc[row.clientid] = row.messages;
      return acc;
    }, {});
  } catch (err) {
    console.error('Error fetching grouped messages:', err.message);
    throw err;
  }
}

module.exports = {
  saveMessage,
  getAllMessages,
  getMessagesByClientId,
  deleteMessagesByClientId,
  toggleLastMessageReadStatus,
  setMessagesRead,
  getAllMessagesGroupedByClient
};