const dbUtils = require('./dbUtils');

async function createUser(username, password, email, phoneNumber, isBarber = false) {
  const db = dbUtils.getDB();
  const sql = `
    INSERT INTO users (username, password, email, phone_number, is_barber)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
  const values = [username, password, email, phoneNumber, isBarber];
  try {
    const res = await db.query(sql, values);
    console.log("User created with id:", res.rows[0].id);
    return { id: res.rows[0].id };
  } catch (err) {
    console.error('Error creating user:', err.message);
    throw err;
  }
}

async function getUserByPhoneNumber(phoneNumber) {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM users WHERE phone_number = $1';
  const values = [phoneNumber];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error fetching user by phone number:', err.message);
    throw err;
  }
}

module.exports = {
  createUser,
  getUserByPhoneNumber,
};
