# Twilio Messaging Script for Chicago Barbershops

This script automatically sends SMS messages to barbershops from the scraped CSV data using Twilio.

## 📋 Prerequisites

1. **Twilio Account**: You need a Twilio account with:
   - Account SID
   - Auth Token
   - A verified phone number (+1 878 226 9721)

2. **Environment Variables**: Make sure your `backend/.env` file contains:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
   ```

3. **CSV File**: The script reads from `chicago-barbers-progress-1pages.csv` in the same directory.

## 🚀 How to Run

1. **Navigate to the scraping directory**:
   ```bash
   cd backend/scraping
   ```

2. **Run the script**:
   ```bash
   node send-twilio-messages.js
   ```

## 📊 What the Script Does

1. **Reads CSV Data**: Loads barbershop information from the CSV file
2. **Formats Phone Numbers**: Automatically formats phone numbers to E.164 format (+1XXXXXXXXXX)
3. **Sends Messages**: Sends personalized SMS messages to each barbershop
4. **Handles Errors**: Includes retry logic and error handling
5. **Rate Limiting**: Adds 1-second delays between messages to avoid Twilio rate limits
6. **Provides Summary**: Shows detailed results at the end

## 📱 Message Template

The script sends this message to each barbershop:

```
Hi [Barbershop Name]! 👋

I hope this message finds you well. I came across your barbershop online and was impressed by your work! 

I run a digital marketing agency that specializes in helping local barbershops and salons grow their business through social media marketing, website development, and online booking systems.

Would you be interested in a quick 15-minute call to discuss how we could help you attract more clients and streamline your booking process? No pressure at all - just a friendly chat about growing your business.

Let me know if you'd like to learn more!

Best regards,
Adam
```

## 📈 Output Example

```
🚀 Starting Twilio messaging campaign for Chicago barbershops...

✅ Twilio credentials found
📱 Sending messages from: +18782269721

📖 Reading barbershop data from CSV...
📊 Found 30 barbershops in CSV

✅ Message sent to Jays impressions (+12199854434): SM1234567890abcdef
⏳ Waiting 1 second before next message...
✅ Message sent to FRESHCUTZ (+17082059667): SM1234567890abcdef
⏳ Waiting 1 second before next message...
...

📊 FINAL SUMMARY
================
Total barbershops: 30
Messages sent successfully: 28
Failed to send: 1
Invalid phone numbers: 1

❌ ERRORS:
   Some Barber ((invalid-number)): Invalid phone number format
```

## 🔧 Features

- **Phone Number Validation**: Automatically formats and validates phone numbers
- **Retry Logic**: Attempts to send each message up to 3 times with exponential backoff
- **Error Handling**: Gracefully handles invalid numbers and API errors
- **Rate Limiting**: Prevents hitting Twilio's rate limits
- **Detailed Logging**: Shows progress and results for each message
- **Summary Report**: Provides comprehensive results at the end

## ⚠️ Important Notes

1. **Twilio Costs**: Each SMS message costs money through Twilio. Check your account balance before running.

2. **Phone Number Verification**: Make sure your Twilio phone number (+1 878 226 9721) is verified and active.

3. **Compliance**: Ensure you comply with SMS marketing regulations and have proper consent.

4. **Rate Limits**: The script includes 1-second delays, but monitor your Twilio usage to avoid hitting limits.

## 🛠️ Customization

### Change the Message Template
Edit the `messageTemplate` function in the script:

```javascript
const messageTemplate = (name) => `Your custom message here for ${name}`;
```

### Adjust Rate Limiting
Change the delay between messages:

```javascript
// Change 1000 to desired milliseconds
await new Promise(resolve => setTimeout(resolve, 1000));
```

### Modify Retry Logic
Adjust the number of retry attempts:

```javascript
// Change maxRetries from 3 to desired number
const result = await sendMessageWithRetry(barber.phone, message, barber.name, 5);
```

## 🐛 Troubleshooting

### "Missing Twilio credentials" Error
- Check that your `.env` file exists in the `backend` directory
- Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set correctly

### "CSV file not found" Error
- Ensure `chicago-barbers-progress-1pages.csv` exists in the same directory
- Check the file name matches exactly

### "Invalid phone number format" Errors
- The script automatically handles most formats
- Check the CSV data for malformed phone numbers

### Twilio API Errors
- Verify your Twilio account has sufficient balance
- Check that your phone number is verified and active
- Ensure you're not hitting rate limits

## 📞 Support

If you encounter issues:
1. Check the error messages in the console output
2. Verify your Twilio account settings
3. Ensure all prerequisites are met
4. Check the CSV file format and data 