const express = require('express');
const router = express.Router();
const { createUser, login, getUserById } = require('../model/users');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/register', async (req, res) => {
  try {
    const { username, password, email, phoneNumber, isBarber } = req.body;
    const result = await createUser(username, password, email, phoneNumber, isBarber);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserById(userId);
    if (!user) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ username: user.username, phoneNumber: user.phone_number });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/business-name', async (req, res) => {
  try {
    const userId = 1; // TODO: change this to the actual user id
    const user = await getUserById(userId);
    if (!user) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ businessName: user.business_name });
  } catch (error) {
    console.error('Error fetching business name:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;