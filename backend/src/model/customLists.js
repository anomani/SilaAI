const dbUtils = require('./dbUtils');

async function createCustomList(name, query) {
  const db = dbUtils.getDB();
  try {
    const clients = await db.query(query);
    console.log(clients.rows);
    return clients.rows;
  } catch (err) {
    console.error('Error creating custom list:', err.message);
    throw err;
  }
}

async function getCustomList(query) {
  const db = dbUtils.getDB();
  try {
    const res = await db.query(query);
    return res.rows;
  } catch (err) {
    console.error('Error fetching custom list:', err.message);
    throw err;
  }
}

module.exports = { createCustomList, getCustomList };
