const twilio = require('twilio');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = '+18782269721'; // The phone number you specified

// Initialize Twilio client
const client = twilio(accountSid, authToken);

// Function to format phone numbers consistently
function formatPhoneNumber(phoneNumber) {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle different phone number formats
  if (cleaned.length === 10) {
    // Add the +1 country code for US numbers
    cleaned = '1' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // Already has country code
  } else if (cleaned.length === 11 && !cleaned.startsWith('1')) {
    // Remove first digit if it's not 1 and add 1
    cleaned = '1' + cleaned.substring(1);
  } else {
    console.log(`Invalid phone number format: ${phoneNumber}`);
    return null;
  }
  
  return '+' + cleaned;
}

// Function to send a message with retry logic
async function sendMessageWithRetry(to, body, businessName, maxRetries = 3) {
  const formattedTo = formatPhoneNumber(to);
  
  if (!formattedTo) {
    console.log(`❌ Skipping invalid phone number: ${to} for ${businessName}`);
    return { success: false, error: 'Invalid phone number format' };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const message = await client.messages.create({
        from: fromPhoneNumber,
        to: formattedTo,
        body: body
      });
      
      console.log(`✅ Message sent to ${businessName} (${formattedTo}): ${message.sid}`);
      return { success: true, messageSid: message.sid };
      
    } catch (error) {
      console.log(`⚠️  Attempt ${attempt} failed for ${businessName} (${formattedTo}): ${error.message}`);
      
      if (attempt === maxRetries) {
        console.log(`❌ Failed to send message to ${businessName} after ${maxRetries} attempts`);
        return { success: false, error: error.message };
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Function to read CSV and send messages
async function sendMessagesToBarbers() {
  const csvPath = path.join(__dirname, 'chicago-barbers-progress-1pages.csv');
  
  // Check if CSV file exists
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found at:', csvPath);
    return;
  }

  const barbers = [];
  const results = {
    total: 0,
    sent: 0,
    failed: 0,
    invalid: 0,
    errors: []
  };

  // Read CSV file
  console.log('📖 Reading barbershop data from CSV...');
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        barbers.push({
          name: row.Name,
          phone: row.Phone,
          socialMedia: row['Social Media']
        });
      })
      .on('end', async () => {
        console.log(`📊 Found ${barbers.length} barbershops in CSV`);
        
        // Define the message template
        const messageTemplate = (name) => `Hi ${name}! 👋`;

        results.total = barbers.length;
        
        // Send messages with delay to avoid rate limiting
        for (let i = 0; i < barbers.length; i++) {
          const barber = barbers[i];
          
          if (!barber.phone || barber.phone.trim() === '') {
            console.log(`⚠️  No phone number for ${barber.name}`);
            results.invalid++;
            continue;
          }

          const message = messageTemplate(barber.name);
          const result = await sendMessageWithRetry(barber.phone, message, barber.name);
          
          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push({
              name: barber.name,
              phone: barber.phone,
              error: result.error
            });
          }
          
          // Add delay between messages to avoid rate limiting (1 second)
          if (i < barbers.length - 1) {
            console.log('⏳ Waiting 1 second before next message...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Print final summary
        console.log('\n📊 FINAL SUMMARY');
        console.log('================');
        console.log(`Total barbershops: ${results.total}`);
        console.log(`Messages sent successfully: ${results.sent}`);
        console.log(`Failed to send: ${results.failed}`);
        console.log(`Invalid phone numbers: ${results.invalid}`);
        
        if (results.errors.length > 0) {
          console.log('\n❌ ERRORS:');
          results.errors.forEach(error => {
            console.log(`   ${error.name} (${error.phone}): ${error.error}`);
          });
        }
        
        resolve(results);
      })
      .on('error', (error) => {
        console.error('❌ Error reading CSV file:', error);
        reject(error);
      });
  });
}

// Main execution
async function main() {
  console.log('🚀 Starting Twilio messaging campaign for Chicago barbershops...\n');
  
  // Verify Twilio credentials
  if (!accountSid || !authToken) {
    console.error('❌ Missing Twilio credentials in .env file');
    console.error('Please ensure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set');
    return;
  }
  
  console.log('✅ Twilio credentials found');
  console.log(`📱 Sending messages from: ${fromPhoneNumber}`);
  console.log('');
  
  try {
    await sendMessagesToBarbers();
    console.log('\n🎉 Campaign completed successfully!');
  } catch (error) {
    console.error('💥 Campaign failed:', error);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  sendMessagesToBarbers,
  formatPhoneNumber,
  sendMessageWithRetry
}; 