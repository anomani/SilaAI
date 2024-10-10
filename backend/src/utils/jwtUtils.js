const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
console.log(process.env.JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // It's better to use an environment variable

function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      jti: uuidv4() // Add a unique identifier for each token
    }, 
    JWT_SECRET, 
    { expiresIn: '30d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function getUserIdFromToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.id;
  } catch (error) {
    console.error('Error decoding token:', error.message);
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  getUserIdFromToken,  // Add this line
};