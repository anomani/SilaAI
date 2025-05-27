require('dotenv').config();
const { saveSuggestedResponse } = require('./src/model/messages');
const { getClientById } = require('./src/model/clients');

async function createTestOutreachMessage() {
  try {
    console.log('🧪 Creating test outreach message for user 3670...');
    
    // First, let's find a client for user 3670
    const db = require('./src/model/dbUtils').getDB();
    
    // Get client 3670 (Adam Nomani)
    const clientQuery = `
      SELECT id, firstname, lastname, phonenumber, user_id
      FROM Client 
      WHERE id = 3670
    `;
    
    const clientResult = await db.query(clientQuery);
    
    if (clientResult.rows.length === 0) {
      console.log('❌ Client 3670 not found');
      return;
    }
    
    const client = clientResult.rows[0];
    console.log(`📋 Found client: ${client.firstname} ${client.lastname} (ID: ${client.id}, User: ${client.user_id})`);
    
    // Create a test outreach message
    const testMessage = `Hey ${client.firstname}, this is Uzi from Uzi Cuts reaching out from my new business number. Please save it to your contacts. How's everything going bro?`;
    
    console.log(`💬 Creating outreach message: "${testMessage}"`);
    
    // Save the suggested response with OUTREACH type (using the correct user_id)
    const result = await saveSuggestedResponse(
      client.id, 
      testMessage, 
      client.user_id, 
      'OUTREACH'
    );
    
    console.log('✅ Test outreach message created successfully!');
    console.log(`📊 Result:`, result);
    
    // Verify it was created
    const verifyQuery = `
      SELECT sr.*, c.firstname, c.lastname 
      FROM suggestedresponses sr
      INNER JOIN client c ON sr.clientid = c.id
      WHERE sr.clientid = $1 
      AND sr.type = 'OUTREACH'
      ORDER BY sr.createdat DESC
      LIMIT 1
    `;
    
    const verifyResult = await db.query(verifyQuery, [client.id]);
    
    if (verifyResult.rows.length > 0) {
      const message = verifyResult.rows[0];
      console.log('🔍 Verification successful:');
      console.log(`   Client: ${message.firstname} ${message.lastname}`);
      console.log(`   Message: ${message.suggestedresponse}`);
      console.log(`   Type: ${message.type}`);
      console.log(`   Created: ${message.createdat}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating test outreach message:', error);
  }
}

// Run the test
// createTestOutreachMessage(); 