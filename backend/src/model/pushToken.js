const dbUtils = require('./dbUtils');

async function savePushToken(userId, pushToken) {
  const db = dbUtils.getDB();
  const sql = `
    INSERT INTO push_tokens (user_id, push_token)
    VALUES ($1, $2)
    ON CONFLICT (user_id) DO UPDATE SET push_token = $2
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

async function getUserPushToken(userId) {
  const db = dbUtils.getDB();
  const sql = 'SELECT push_token FROM push_tokens WHERE user_id = $1';
  const values = [userId];
  try {
    const res = await db.query(sql, values);
    return res.rows[0]?.push_token;
  } catch (err) {
    console.error('Error fetching push token:', err.message);
    throw err;
  }
}

module.exports = {
  savePushToken,
  getUserPushToken,
};
