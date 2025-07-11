// require('dotenv').config({ path: '../../.env' });
// const twilio = require('twilio');

// // === EDIT THESE VARIABLES ===
// const TO_NUMBER = '+12159070184'; // Recipient's phone number
// const FROM_NUMBER = '+18447960403'; // Your Twilio number
// const MESSAGE_BODY = 'Sounds good. Will call you Saturday at 10am.'; //Message to send
// // ============================

// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// async function sendMessage() {
//   try {
//     const message = await client.messages.create({
//       body: MESSAGE_BODY,
//       from: FROM_NUMBER,
//       to: TO_NUMBER
//     });
//     console.log('Message sent successfully:', message.sid);
//   } catch (error) {
//     console.error('Error sending message:', error.message);
//   }
// }

// sendMessage(); 