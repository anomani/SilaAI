const dbUtils = require('./dbUtils');

async function savePushToken(userId, pushToken) {
  const db = dbUtils.getDB();
  const sql = `
    INSERT INTO push_tokens (user_id, push_token, created_at)
    VALUES ($1, $2, NOW())
    RETURNING id
  `;
  const values = [userId, pushToken];
  try {
    const res = await db.query(sql, values);
    console.log("Push token saved with id:", res.rows[0].id);
    return { id: res.rows[0].id };
  } catch (err) {
    console.error('Error saving push token:', err.message);
    throw err;
  }
}

async function getUserPushTokens(userId) {
  const db = dbUtils.getDB();
  const sql = 'SELECT push_token FROM push_tokens WHERE user_id = $1';
  const values = [userId];
  try {
    const res = await db.query(sql, values);
    return res.rows.map(row => row.push_token);
  } catch (err) {
    console.error('Error fetching push tokens:', err.message);
    throw err;
  }
}


module.exports = {
  savePushToken,
  getUserPushTokens,
};