// require('dotenv').config({ path: '../../.env' });
// const fs = require('fs');
// const path = require('path');
// const csv = require('csv-parser');
// const twilio = require('twilio');

// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// const FROM_NUMBER = '+18447960403';
// const CSV_PATH = path.join(__dirname, '../booksy-public/philly3_deduped.csv');
// const messages = [
//   `Hey, I'm doing some research on how independent barbers handle the business side of things - scheduling, client communication, etc. Would you be up for a quick 15-minute call to share your experience? I'd love to hear what works and what's frustrating about running your shop.`,
//   `Hi, I'm trying to understand the day-to-day challenges small barbershop owners face. Could I grab 15 minutes of your time for a quick call? I'm curious about stuff like client management, scheduling headaches, that kind of thing. Your insights would be really valuable.`,
//   `Hey, I'm researching how barbers manage their businesses and I'd love to pick your brain for 15 minutes. Are you free for a quick call this week? I'm curious about what takes up most of your time outside of actually cutting hair.`,
//   `Hi, I'm studying the biggest operational headaches for independent barbers. Would you be open to a brief 15-minute call to share what's most frustrating about running your shop? I'm genuinely curious about the behind-the-scenes challenges.`
// ];

// function normalizePhone(phone) {
//   // Remove non-digit characters, add +1 if 10 digits
//   if (!phone) return null;
//   const digits = phone.replace(/\D/g, '');
//   if (digits.length === 10) return `+1${digits}`;
//   if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
//   if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`; // fallback for international
//   return null;
// }

// let messageIndex = 0;
// let sentCount = 0;

// fs.createReadStream(CSV_PATH)
//   .pipe(csv())
//   .on('data', async (row) => {
//     const phone = normalizePhone(row['Phone']);
//     if (!phone) {
//       console.log(`Skipping invalid phone: ${row['Phone']} (${row['Name']})`);
//       return;
//     }
//     const messageBody = messages[messageIndex % messages.length];
//     messageIndex++;
//     try {
//       const message = await client.messages.create({
//         body: messageBody,
//         from: FROM_NUMBER,
//         to: phone
//       });
//       sentCount++;
//       console.log(`Sent to ${phone} (${row['Name']}): ${message.sid}`);
//     } catch (error) {
//       console.error(`Error sending to ${phone} (${row['Name']}):`, error.message);
//     }
//   })
//   .on('end', () => {
//     console.log(`\nDone. Attempted to send ${sentCount} messages.`);
//   }); 