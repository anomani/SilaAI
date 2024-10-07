const { verifyToken } = require('../utils/jwtUtils');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  try {
    console.log('Attempting to verify token:', token);
    console.log('JWT_SECRET:', process.env.JWT_SECRET); // Add this line
    const user = verifyToken(token);
    console.log('Verified user:', user);
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.sendStatus(403);
  }
}

module.exports = { authenticateToken };