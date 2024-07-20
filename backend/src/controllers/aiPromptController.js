const { storeAIPrompt, getAIPrompt } = require('../model/aiPrompt');

const setAIPrompt = async (req, res) => {
  try {
    const { clientId, prompt } = req.body;
    await storeAIPrompt(clientId, prompt);
    res.status(200).json({ message: 'AI prompt stored successfully' });
  } catch (error) {
    console.error('Error storing AI prompt:', error);
    res.status(500).json({ error: 'Error storing AI prompt' });
  }
};

const getAIPromptForClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const prompt = await getAIPrompt(clientId);
    res.status(200).json({ prompt });
  } catch (error) {
    console.error('Error fetching AI prompt:', error);
    res.status(500).json({ error: 'Error fetching AI prompt' });
  }
};

module.exports = {
  setAIPrompt,
  getAIPromptForClient
};
