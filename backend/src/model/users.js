const dbUtils = require('./dbUtils');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwtUtils');

async function createUser(username, password, email, phoneNumber, isBarber = false) {
  const db = dbUtils.getDB();
  const hashedPassword = await bcrypt.hash(password, 10);
  const sql = `
    INSERT INTO users (username, password, email, phone_number, is_barber)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
  const values = [username, hashedPassword, email, phoneNumber, isBarber];
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

async function login(phoneNumber, password) {
  const user = await getUserByPhoneNumber(phoneNumber);
  if (!user) {
    throw new Error('User not found');
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }
  const token = generateToken(user);
  return { user, token };
}

async function addBusinessNumberColumn() {
  const db = dbUtils.getDB();
  const sql = `
    ALTER TABLE users
    ADD COLUMN business_number VARCHAR(50);
  `;
  try {
    await db.query(sql);
    console.log("Business number column added successfully");
  } catch (err) {
    console.error('Error adding business number column:', err.message);
    throw err;
  }
}

async function getUserById(userId) {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM users WHERE id = $1';
  const values = [userId];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error fetching user by ID:', err.message);
    throw err;
  }
}

async function getAllUsers() {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM Users';
  try {
    const res = await db.query(sql);
    return res.rows;
  } catch (err) {
    console.error('Error fetching all users:', err.message);
    throw err;
  }
}

async function getUserByBusinessNumber(businessNumber) {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM users WHERE business_number = $1';
  const values = [businessNumber];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error fetching user by business number:', err.message);
    throw err;
  }
}



module.exports = {
  createUser,
  getUserByPhoneNumber,
  login,
  addBusinessNumberColumn,
  getUserById,
  getAllUsers,
  getUserByBusinessNumber  // Add this line
};