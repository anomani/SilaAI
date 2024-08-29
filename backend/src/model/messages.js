const dbUtils = require('./dbUtils');

async function saveMessage(from, to, body, date, clientid, read = true, isAI = false) {
  if (!clientid) {
    throw new Error('Invalid clientid');
  }
  const db = dbUtils.getDB();

  // Start a transaction
  await db.query('BEGIN');

  try {
    // Save the message
    const sql = `
      INSERT INTO Messages (fromText, toText, body, date, clientid, read, is_ai)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    const values = [from, to, body, date, clientid, read, isAI];
    const res = await db.query(sql, values);
    const newId = res.rows[0].id;
    console.log("Message saved with id:", newId);

    // Clear the suggested response for this client
    await clearSuggestedResponse(clientid);

    // Commit the transaction
    await db.query('COMMIT');
    
    return { id: newId };
  } catch (err) {
    // If there's an error, roll back the transaction
    await db.query('ROLLBACK');
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
        ) ORDER BY id ASC
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

async function saveSuggestedResponse(clientId, response) {
  const db = dbUtils.getDB();
  const sql = `
    INSERT INTO SuggestedResponses (clientId, response)
    VALUES ($1, $2)
    ON CONFLICT (clientId) DO UPDATE
    SET response = EXCLUDED.response, updatedAt = CURRENT_TIMESTAMP
    RETURNING *
  `;
  const values = [clientId, response];
  try {
    const res = await db.query(sql, values);
    console.log(`Suggested response saved for clientId: ${clientId}`);
    return res.rows[0];
  } catch (err) {
    console.error('Error saving suggested response:', err.message);
    throw err;
  }
}

async function getSuggestedResponse(clientId) {
  const db = dbUtils.getDB();
  const sql = 'SELECT response FROM SuggestedResponses WHERE clientId = $1';
  const values = [clientId];
  try {
    const res = await db.query(sql, values);
    return res.rows[0] ? res.rows[0].response : null;
  } catch (err) {
    console.error('Error fetching suggested response:', err.message);
    throw err;
  }
}

async function clearSuggestedResponse(clientId) {
  const db = dbUtils.getDB();
  const sql = 'DELETE FROM SuggestedResponses WHERE clientId = $1';
  const values = [clientId];
  try {
    await db.query(sql, values);
    console.log(`Suggested response cleared for clientId: ${clientId}`);
  } catch (err) {
    console.error('Error clearing suggested response:', err.message);
    // Don't throw the error, just log it
  }
}

async function getMessageMetrics() {
  const db = dbUtils.getDB();
  const metrics = {};

  try {
    // Total number of messages
    const totalMessagesQuery = 'SELECT COUNT(*) FROM Messages';
    const totalMessagesResult = await db.query(totalMessagesQuery);
    metrics.totalMessages = parseInt(totalMessagesResult.rows[0].count);

    // Messages per day (last 30 days)
    const messagesPerDayQuery = `
      SELECT DATE(TO_TIMESTAMP(date, 'MM/DD/YYYY, HH24:MI:SS')) as day, COUNT(*) as count
      FROM Messages
      WHERE TO_TIMESTAMP(date, 'MM/DD/YYYY, HH24:MI:SS') >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(TO_TIMESTAMP(date, 'MM/DD/YYYY, HH24:MI:SS'))
      ORDER BY day
    `;
    const messagesPerDayResult = await db.query(messagesPerDayQuery);
    metrics.messagesPerDay = messagesPerDayResult.rows;

    // Distribution of messages between human and AI responses
    const messageDistributionQuery = `
      SELECT is_ai, COUNT(*) as count
      FROM Messages
      GROUP BY is_ai
    `;
    const messageDistributionResult = await db.query(messageDistributionQuery);
    metrics.messageDistribution = messageDistributionResult.rows;

    // Number of unique clients
    const uniqueClientsQuery = 'SELECT COUNT(DISTINCT clientid) FROM Messages';
    const uniqueClientsResult = await db.query(uniqueClientsQuery);
    metrics.uniqueClients = parseInt(uniqueClientsResult.rows[0].count);

    // Average messages per client
    metrics.avgMessagesPerClient = metrics.totalMessages / metrics.uniqueClients;

    // Most active clients (top 5)
    const activeClientsQuery = `
      SELECT clientid, COUNT(*) as message_count
      FROM Messages
      GROUP BY clientid
      ORDER BY message_count DESC
      LIMIT 5
    `;
    const activeClientsResult = await db.query(activeClientsQuery);
    metrics.mostActiveClients = activeClientsResult.rows;

    return metrics;
  } catch (err) {
    console.error('Error fetching message metrics:', err.message);
    throw err;
  }
}

async function getMostRecentMessagePerClient() {
  const db = dbUtils.getDB();
  const sql = `
    SELECT *
    FROM (
    SELECT DISTINCT ON (clientid)
        *
    FROM Messages
    ORDER BY clientid, id DESC
) subquery
ORDER BY id DESC
  `;
  try {
    const res = await db.query(sql);
    return res.rows;
  } catch (err) {
    console.error('Error fetching most recent messages per client:', err.message);
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
  getAllMessagesGroupedByClient,
  saveSuggestedResponse,
  getSuggestedResponse,
  clearSuggestedResponse,
  getMessageMetrics,
  getMostRecentMessagePerClient
};