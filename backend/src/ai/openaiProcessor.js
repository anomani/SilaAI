const clientData = require('./clientData');

async function processOpenAIJob(message, userId, initialMessage = false) {
  try {
    console.log('Processing message:', message);
    console.log('User ID:', userId);
    console.log('Initial message:', initialMessage);
    
    if (typeof clientData.handleUserInputData !== 'function') {
      console.error('Available exports from clientData:', Object.keys(clientData));
      throw new Error('handleUserInputData is not properly exported from clientData.js');
    }

    const response = await clientData.handleUserInputData(message, userId, initialMessage);
    console.log('Response received:', response);
    return response;
  } catch (error) {
    console.error('Detailed error in processOpenAIJob:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// async function main() {
//   const response = await processOpenAIJob(['Hi'], '+12038324011', 1);
//   console.log(response);
// }

// main();

module.exports = {
  processOpenAIJob
}; 