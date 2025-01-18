const dbUtils = require('./dbUtils');

async function getFillMyCalendarStatus(userId) {
  const db = dbUtils.getDB();
  const sql = 'SELECT status FROM Settings WHERE user_id = $1 AND feature_name = $2';
  const values = [userId, 'fillMyCalendar'];
  try {
    const res = await db.query(sql, values);
    return res.rows[0]?.status || false;
  } catch (err) {
    console.error('Error fetching fillMyCalendar status:', err.message);
    throw err;
  }
}

async function setFillMyCalendarStatus(userId, status) {
  const db = dbUtils.getDB();
  const sql = `
    INSERT INTO Settings (user_id, feature_name, status)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, feature_name) DO UPDATE
    SET status = EXCLUDED.status
  `;
  const values = [userId, 'fillMyCalendar', status];
  try {
    await db.query(sql, values);
    console.log(`fillMyCalendar status set to: ${status} for user: ${userId}`);
  } catch (err) {
    console.error('Error setting fillMyCalendar status:', err.message);
    throw err;
  }
}

async function getNextDayRemindersStatus(userId) {
  const db = dbUtils.getDB();
  const sql = 'SELECT status FROM Settings WHERE user_id = $1 AND feature_name = $2';
  const values = [userId, 'nextDayReminders'];
  try {
    const res = await db.query(sql, values);
    return res.rows[0]?.status || false;
  } catch (err) {
    console.error('Error fetching nextDayReminders status:', err.message);
    throw err;
  }
}

async function setNextDayRemindersStatus(userId, status) {
  const db = dbUtils.getDB();
  const sql = `
    INSERT INTO Settings (user_id, feature_name, status)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, feature_name) DO UPDATE
    SET status = EXCLUDED.status
  `;
  const values = [userId, 'nextDayReminders', status];
  try {
    await db.query(sql, values);
    console.log(`nextDayReminders status set to: ${status} for user: ${userId}`);
  } catch (err) {
    console.error('Error setting nextDayReminders status:', err.message);
    throw err;
  }
}

module.exports = {
  getFillMyCalendarStatus,
  setFillMyCalendarStatus,
  getNextDayRemindersStatus,
  setNextDayRemindersStatus,
};
