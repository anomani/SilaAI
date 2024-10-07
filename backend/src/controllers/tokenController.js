const { savePushToken } = require('../model/pushToken');

const savePushTokenController = async (req, res) => {
    try {
      const userId = req.user.id;
      const { pushToken } = req.body;
      if (!userId) {
        return res.status(404).json({ error: 'User not found' });
      }
      await savePushToken(userId, pushToken);
      res.status(200).json({ message: 'Push token saved successfully' });
    } catch (error) {
      console.error('Error saving push token:', error);
      res.status(500).json({ error: 'Error saving push token' });
    }
}

module.exports = { savePushTokenController };