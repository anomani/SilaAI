const { handleUserInput } = require('../ai/scheduling');
const {handleUserInputData} = require('../ai/clientData');

const handleChatRequest = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Here, we're simulating handling user input and generating a response
    // You might need to adapt the `handleUserInput` function to fit this use case.
    const responseMessage = await handleUserInput(message);
    res.json({ message: responseMessage });
  } catch (error) {
    console.error('Error handling chat request:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
};


const handleUserInputDataController = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const responseMessage = await handleUserInputData(message);
    res.json({ message: responseMessage });
  } catch (error) {
    console.error('Error handling user input data:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
};
module.exports = { handleChatRequest, handleUserInputDataController };
