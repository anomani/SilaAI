// backend/controllers/chatController.js
const openai = require('../config/openai');

const handleChat = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: message,
      max_tokens: 150,
    });

    res.json({ message: response.data.choices[0].text.trim() });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
};

module.exports = { handleChat };
