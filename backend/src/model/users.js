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

async function getUserByEmail(email) {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM users WHERE email = $1';
  const values = [email];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error fetching user by email:', err.message);
    throw err;
  }
}

async function login(email, password) {
  const user = await getUserByEmail(email);
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

async function getUserByCalendarID(calendarID) {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM users WHERE calendarid = $1';
  const values = [calendarID];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error fetching user by calendar ID:', err.message);
    throw err;
  }
}

async function createUserManual(username, password, email, phoneNumber, isBarber, businessNumber, calendarId, acuityApiKey, acuityUserId) {
  const db = dbUtils.getDB();
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = `
    INSERT INTO users (
      username, password, email, phone_number, is_barber, 
      business_number, calendarid, acuity_api_key, acuity_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `;

  const values = [
    username, 
    hashedPassword, 
    email, 
    phoneNumber, 
    isBarber,
    businessNumber,
    calendarId,
    acuityApiKey,
    acuityUserId
  ];

  try {
    const res = await db.query(sql, values);
    console.log("User created with id:", res.rows[0].id);
    return { id: res.rows[0].id };
  } catch (err) {
    console.error('Error creating user:', err.message);
    throw err;
  }
}

async function getReminderMessageTemplate(userId) {
  const db = dbUtils.getDB();
  const sql = 'SELECT reminder_template FROM users WHERE id = $1';
  const values = [userId];
  try {
    const res = await db.query(sql, values);
    return res.rows[0]?.reminder_template || 'Hey {firstname}, just wanted to confirm if you\'re good for your appointment tomorrow at {time}?';
  } catch (err) {
    console.error('Error fetching reminder template:', err.message);
    throw err;
  }
}

async function setReminderMessageTemplate(userId, template) {
  const db = dbUtils.getDB();
  const sql = 'UPDATE users SET reminder_template = $1 WHERE id = $2';
  const values = [template, userId];
  try {
    await db.query(sql, values);
    console.log(`Reminder template updated for user: ${userId}`);
  } catch (err) {
    console.error('Error setting reminder template:', err.message);
    throw err;
  }
}

async function getFirstMessageTemplate(userId) {
  const db = dbUtils.getDB();
  const sql = 'SELECT first_message_template FROM users WHERE id = $1';
  const values = [userId];
  try {
    const res = await db.query(sql, values);
    return res.rows[0]?.first_message_template || 'Hey {firstname}, this is Uzi from UziCuts reaching out from my new business number. Please save it to your contacts.\n\nJust wanted to confirm, are you good for your appointment tomorrow at {time}?';
  } catch (err) {
    console.error('Error fetching first message template:', err.message);
    throw err;
  }
}

async function setFirstMessageTemplate(userId, template) {
  const db = dbUtils.getDB();
  const sql = 'UPDATE users SET first_message_template = $1 WHERE id = $2';
  const values = [template, userId];
  try {
    console.log('Executing SQL to update first message template:', {
      sql,
      values,
      userId,
      template
    });
    await db.query(sql, values);
    
    // Verify the update
    const verifySQL = 'SELECT first_message_template FROM users WHERE id = $1';
    const verifyResult = await db.query(verifySQL, [userId]);
    console.log('Verification result:', verifyResult.rows[0]);
    
    console.log(`First message template updated for user: ${userId}`);
  } catch (err) {
    console.error('Error setting first message template:', err.message);
    throw err;
  }
}

/**
 * Fetches user's outreach message templates
 * @param {number} userId - The user ID
 * @returns {Promise<Object>} Object containing firstOutreachMessage and outreachMessage
 */
async function getUserMessageTemplates(userId) {
  const db = dbUtils.getDB();
  const sql = `
    SELECT first_outreach_message, outreach_message 
    FROM users 
    WHERE id = $1
  `;
  
  try {
    const res = await db.query(sql, [userId]);
    if (res.rows.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return {
      firstOutreachMessage: res.rows[0].first_outreach_message,
      outreachMessage: res.rows[0].outreach_message
    };
  } catch (err) {
    console.error('Error fetching user message templates:', err.message);
    throw err;
  }
}

module.exports = {
  createUser,
  createUserManual,
  getUserByPhoneNumber,
  login,
  addBusinessNumberColumn,
  getUserById,
  getAllUsers,
  getUserByBusinessNumber,
  getUserByEmail,
  getUserByCalendarID,
  getReminderMessageTemplate,
  setReminderMessageTemplate,
  getFirstMessageTemplate,
  setFirstMessageTemplate,
  getUserMessageTemplates
};
