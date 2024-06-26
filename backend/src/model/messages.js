const dbUtils = require('./dbUtils');

async function saveMessage(from, to, body, date, clientid) {
  if (!clientid) {
    throw new Error('Invalid clientid');
  }
  const db = dbUtils.getDB();
  const sql = `
    INSERT INTO Messages (fromText, toText, body, date, clientid)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
  const values = [from, to, body, date, clientid];
  try {
    const res = await db.query(sql, values);
    console.log("Message saved with id:", res.rows[0].id);
    return { id: res.rows[0].id };
  } catch (err) {
    console.error('Error saving message:', err.message);
    throw err;
  }
}

async function getAllMessages() {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM Messages';
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
  const sql = 'SELECT * FROM Messages WHERE clientid = $1';
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

module.exports = {
  saveMessage,
  getAllMessages,
  getMessagesByClientId,
  deleteMessagesByClientId,
};
