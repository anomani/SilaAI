const { deleteAIPrompt } = require('../../model/aiPrompt');

async function clearCustomPrompt(clientId) {
    console.log("Clearing custom prompt for client", clientId);
    await deleteAIPrompt(clientId)
}

async function main() {
    await clearCustomPrompt(3367)
}
main()
module.exports = {clearCustomPrompt};
