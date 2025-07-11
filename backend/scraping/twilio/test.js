require('dotenv').config({ path: '../../.env' });
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendTestMessage() {
  try {
    const message = await client.messages.create({
      body: 'Test message from SilaAI backend',
      from: '+18447960403',
      to: '+12038324011'
    });
    
    console.log('Message sent successfully:', message.sid);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// sendTestMessage();