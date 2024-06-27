const { savePushToken } = require('../model/pushToken');
const { getUserByPhoneNumber } = require('../model/users');

const savePushTokenController = async (req, res) => {
    try {
      const { phoneNumber, pushToken } = req.body;
      const user = await getUserByPhoneNumber(phoneNumber);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      await savePushToken(user.id, pushToken);
      res.status(200).json({ message: 'Push token saved successfully' });
    } catch (error) {
      console.error('Error saving push token:', error);
      res.status(500).json({ error: 'Error saving push token' });
    }
}

module.exports = { savePushTokenController };