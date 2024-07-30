const { deleteAIPrompt } = require('../../model/aiPrompt');

async function clearCustomPrompt(clientId) {
    console.log("Clearing custom prompt for client", clientId);
  try {
    const deleted = await deleteAIPrompt(clientId);
    if (deleted) {
      return { success: true, message: `Custom prompt cleared for client ${clientId}` };
    }
  } catch (err) {
    console.error('Error clearing custom prompt:', err.message);
    throw err;
  }
}

module.exports = clearCustomPrompt;
