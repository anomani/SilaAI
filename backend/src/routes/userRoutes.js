const express = require('express');
const router = express.Router();
const { createUser, login, getUserById, getReminderMessageTemplate, setReminderMessageTemplate, getFirstMessageTemplate, setFirstMessageTemplate } = require('../model/users');
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
    res.json(user);
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/business-name', async (req, res) => {
  try {
    const userId = req.query.userId;
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

router.get('/reminder-template', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const template = await getReminderMessageTemplate(userId);
    res.json({ value: template });
  } catch (error) {
    console.error('Error getting reminder template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reminder-template', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { template } = req.body;
    await setReminderMessageTemplate(userId, template);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting reminder template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/first-message-template', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const template = await getFirstMessageTemplate(userId);
    res.json({ value: template });
  } catch (error) {
    console.error('Error getting first message template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/first-message-template', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { template } = req.body;
    await setFirstMessageTemplate(userId, template);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting first message template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;