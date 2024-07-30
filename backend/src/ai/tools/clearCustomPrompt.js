const { deleteAIPrompt } = require('../../model/aiPrompt');

async function clearCustomPrompt(clientId) {
    console.log("Clearing custom prompt for client", clientId);
    await deleteAIPrompt(clientId)
}


module.exports = {clearCustomPrompt};
