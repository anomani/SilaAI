const { deleteThreadByPhoneNumber } = require('./src/model/threads');
const { getClientByPhoneNumber } = require('./src/model/clients');
const { deleteAIPrompt } = require('./src/model/aiPrompt');

async function cleanUserContext(phoneNumber, userId) {
  console.log(`Cleaning context for ${phoneNumber}`);
  
  try {
    // 1. Delete OpenAI thread from database
    const threadResult = await deleteThreadByPhoneNumber(phoneNumber, userId);
    console.log('Thread deleted:', threadResult);
    
    // 2. Get client and clear AI prompt if needed
    const client = await getClientByPhoneNumber(phoneNumber, userId);
    if (client) {
      const promptResult = await deleteAIPrompt(client.id);
      console.log('AI prompt cleared:', promptResult);
    }
    
    console.log('Context cleaned successfully');
    
  } catch (error) {
    console.error('Error cleaning context:', error);
  }
}

// Clean context for your test user
cleanUserContext('+12038324011', 35);