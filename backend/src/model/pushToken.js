const dbUtils = require('./dbUtils');

async function savePushToken(userId, pushToken) {
  const db = dbUtils.getDB();
  
  // First, check if the token already exists for this user
  const checkSql = `
    SELECT id FROM push_tokens 
    WHERE user_id = $1 AND push_token = $2
  `;
  const checkValues = [userId, pushToken];
  
  try {
    const checkRes = await db.query(checkSql, checkValues);
    
    if (checkRes.rows.length > 0) {
      // Token exists, update the timestamp
      const updateSql = `
        UPDATE push_tokens 
        SET created_at = NOW() 
        WHERE id = $1 
        RETURNING id
      `;
      const updateValues = [checkRes.rows[0].id];
      const updateRes = await db.query(updateSql, updateValues);
      console.log("Push token updated with id:", updateRes.rows[0].id);
      return { id: updateRes.rows[0].id };
    } else {
      // Token doesn't exist, insert new row
      const insertSql = `
        INSERT INTO push_tokens (user_id, push_token, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id
      `;
      const insertValues = [userId, pushToken];
      const insertRes = await db.query(insertSql, insertValues);
      console.log("Push token saved with id:", insertRes.rows[0].id);
      return { id: insertRes.rows[0].id };
    }
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

async function main() {
  await savePushToken(1, 'ExponentPushToken[rswz3mF3E2725DCf4tUSAU]');
}


module.exports = {
  savePushToken,
  getUserPushTokens,
};