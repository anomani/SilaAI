const { getDynamicLapsedClients } = require('../model/clients');
// const { fillMyCalendar } = require('../ai/fillMyCalendar'); // Commented out to avoid OpenAI dependency

async function testDynamicOutreach() {
    console.log('=== Testing Dynamic Outreach System ===\n');
    
    const userId = 1; // Test with user ID 3670
    
    try {
        // Test 1: Get dynamic lapsed clients
        console.log('1. Testing getDynamicLapsedClients...');
        const dynamicClients = await getDynamicLapsedClients(userId);
        
        console.log(`Found ${dynamicClients.length} dynamically identified lapsed clients\n`);
        
        if (dynamicClients.length > 0) {
            console.log('Top 5 clients by readiness score:');
            dynamicClients.slice(0, 5).forEach((client, index) => {
                console.log(`${index + 1}. ${client.firstname} ${client.lastname}`);
                console.log(`   - Readiness Score: ${client.readiness_score}/100`);
                console.log(`   - Personal Threshold: ${client.personal_threshold} days`);
                console.log(`   - Days Since Last Appointment: ${client.days_since_last_appointment}`);
                console.log(`   - Response Rate: ${client.response_rate}%`);
                console.log(`   - Days Since Last Outreach: ${client.days_since_last_outreach}`);
                console.log(`   - Total Appointments: ${client.total_appointments}`);
                console.log(`   - Avg Spending: $${Number(client.avg_spending || 0).toFixed(2)}`);
                console.log(`   - Is Overdue: ${client.is_overdue}`);
                console.log(`   - Preferred Type: ${client.preferred_appointment_type || 'N/A'}`);
                console.log(`   - Group: ${client.group}`);
                console.log('');
            });
        }
        
        // Test 2: Analyze scoring breakdown
        console.log('2. Analyzing scoring system...');
        if (dynamicClients.length > 0) {
            const testClient = dynamicClients[0];
            console.log(`Analyzing client: ${testClient.firstname} ${testClient.lastname}`);
            console.log(`- Appointment Score: Based on ${testClient.days_since_last_appointment} days vs ${testClient.personal_threshold} threshold`);
            console.log(`- Message Cooldown: ${testClient.days_since_last_outreach} days since last outreach`);
            console.log(`- Response History: ${testClient.response_rate}% response rate`);
            console.log(`- Value Score: ${testClient.total_appointments} appointments, $${Number(testClient.avg_spending || 0).toFixed(2)} avg`);
            console.log(`- Booking Pattern: Avg ${testClient.avg_days_between_appointments || 'N/A'} days between appointments`);
            console.log('');
        }
        
        // Test 3: Compare with old system (if available)
        console.log('3. Comparing with old static system...');
        const { getOldClients } = require('../model/clients');
        const oldClients = await getOldClients(userId);
        
        console.log(`Old system would have found: ${oldClients.length} clients`);
        console.log(`New system found: ${dynamicClients.length} clients`);
        
        // Find overlap
        const oldClientIds = new Set(oldClients.map(c => c.id));
        const newClientIds = new Set(dynamicClients.map(c => c.id));
        const overlap = [...oldClientIds].filter(id => newClientIds.has(id));
        const onlyOld = [...oldClientIds].filter(id => !newClientIds.has(id));
        const onlyNew = [...newClientIds].filter(id => !oldClientIds.has(id));
        
        console.log(`Overlap: ${overlap.length} clients`);
        console.log(`Only in old system: ${onlyOld.length} clients`);
        console.log(`Only in new system: ${onlyNew.length} clients\n`);
        
        // Test 4: Test message cooldown logic
        console.log('4. Testing message cooldown logic...');
        const clientsWithRecentMessages = dynamicClients.filter(c => c.days_since_last_outreach < 30);
        const clientsWithOldMessages = dynamicClients.filter(c => c.days_since_last_outreach >= 30 && c.days_since_last_outreach < 999);
        const neverMessaged = dynamicClients.filter(c => c.days_since_last_outreach >= 999);
        
        console.log(`Clients with recent messages (< 30 days): ${clientsWithRecentMessages.length}`);
        console.log(`Clients with old messages (30-999 days): ${clientsWithOldMessages.length}`);
        console.log(`Never messaged clients: ${neverMessaged.length}\n`);
        
        // Test 5: Test response rate distribution
        console.log('5. Response rate distribution:');
        const highResponders = dynamicClients.filter(c => c.response_rate > 70);
        const mediumResponders = dynamicClients.filter(c => c.response_rate > 30 && c.response_rate <= 70);
        const lowResponders = dynamicClients.filter(c => c.response_rate > 0 && c.response_rate <= 30);
        const nonResponders = dynamicClients.filter(c => c.response_rate === 0 && c.messages_sent > 0);
        const neverContacted = dynamicClients.filter(c => c.messages_sent === 0);
        
        console.log(`High responders (>70%): ${highResponders.length}`);
        console.log(`Medium responders (30-70%): ${mediumResponders.length}`);
        console.log(`Low responders (1-30%): ${lowResponders.length}`);
        console.log(`Non-responders (0%, but messaged): ${nonResponders.length}`);
        console.log(`Never contacted: ${neverContacted.length}\n`);
        
        // Test 6: Personal threshold analysis
        console.log('6. Personal threshold analysis:');
        if (dynamicClients.length > 0) {
            const thresholds = dynamicClients.map(c => c.personal_threshold);
            const avgThreshold = thresholds.reduce((a, b) => a + b, 0) / thresholds.length;
            const minThreshold = Math.min(...thresholds);
            const maxThreshold = Math.max(...thresholds);
            
            console.log(`Average personal threshold: ${avgThreshold.toFixed(1)} days`);
            console.log(`Min threshold: ${minThreshold} days`);
            console.log(`Max threshold: ${maxThreshold} days`);
            
            const defaultThresholdClients = dynamicClients.filter(c => c.personal_threshold === 90);
            console.log(`Clients using default threshold (90 days): ${defaultThresholdClients.length}\n`);
        }
        
        // Test 7: Readiness score distribution
        console.log('7. Readiness score distribution:');
        if (dynamicClients.length > 0) {
            const highReadiness = dynamicClients.filter(c => c.readiness_score >= 80);
            const mediumReadiness = dynamicClients.filter(c => c.readiness_score >= 50 && c.readiness_score < 80);
            const lowReadiness = dynamicClients.filter(c => c.readiness_score < 50);
            
            console.log(`High readiness (80-100): ${highReadiness.length}`);
            console.log(`Medium readiness (50-79): ${mediumReadiness.length}`);
            console.log(`Low readiness (<50): ${lowReadiness.length}`);
            
            const avgReadiness = dynamicClients.reduce((sum, c) => sum + c.readiness_score, 0) / dynamicClients.length;
            console.log(`Average readiness score: ${avgReadiness.toFixed(1)}\n`);
        }
        
        console.log('=== Test Complete ===');
        console.log('\nTo test the full fillMyCalendar integration:');
        console.log('1. Set OPENAI_API_KEY environment variable');
        console.log('2. Uncomment the fillMyCalendar import and test code');
        console.log('3. Run the test again');
        
    } catch (error) {
        console.error('Error during testing:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testDynamicOutreach(); 