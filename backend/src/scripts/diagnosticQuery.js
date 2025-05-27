const dbUtils = require('../model/dbUtils');

async function runDiagnostics() {
    console.log('=== Database Diagnostics ===\n');
    
    const userId = 1;
    const db = dbUtils.getDB();
    
    try {
        // 1. Check total clients for this user
        console.log('1. Total clients for user:');
        const totalClientsQuery = 'SELECT COUNT(*) as total FROM Client WHERE user_id = $1';
        const totalClients = await db.query(totalClientsQuery, [userId]);
        console.log(`   Total clients: ${totalClients.rows[0].total}\n`);
        
        // 2. Check clients with appointments
        console.log('2. Clients with appointments:');
        const clientsWithAppts = await db.query(`
            SELECT COUNT(DISTINCT c.id) as count 
            FROM Client c 
            INNER JOIN Appointment a ON c.id = a.clientid 
            WHERE c.user_id = $1
        `, [userId]);
        console.log(`   Clients with appointments: ${clientsWithAppts.rows[0].count}\n`);
        
        // 3. Check appointment date formats
        console.log('3. Sample appointment dates:');
        const sampleDates = await db.query(`
            SELECT date, clientid 
            FROM Appointment 
            WHERE clientid IN (SELECT id FROM Client WHERE user_id = $1)
            ORDER BY id DESC 
            LIMIT 5
        `, [userId]);
        sampleDates.rows.forEach(row => {
            console.log(`   Date: "${row.date}", Client: ${row.clientid}`);
        });
        console.log('');
        
        // 4. Check recent appointments
        console.log('4. Recent appointments (last 30 days):');
        const recentAppts = await db.query(`
            SELECT COUNT(*) as count 
            FROM Appointment a
            INNER JOIN Client c ON a.clientid = c.id
            WHERE c.user_id = $1 
            AND a.date::date >= CURRENT_DATE - INTERVAL '30 days'
        `, [userId]);
        console.log(`   Recent appointments: ${recentAppts.rows[0].count}\n`);
        
        // 5. Check old appointments (more than 6 weeks)
        console.log('5. Old appointments (more than 6 weeks):');
        const oldAppts = await db.query(`
            SELECT COUNT(DISTINCT a.clientid) as count 
            FROM Appointment a
            INNER JOIN Client c ON a.clientid = c.id
            WHERE c.user_id = $1 
            AND a.date::date <= CURRENT_DATE - INTERVAL '42 days'
        `, [userId]);
        console.log(`   Clients with old appointments: ${oldAppts.rows[0].count}\n`);
        
        // 6. Check future appointments
        console.log('6. Future appointments:');
        const futureAppts = await db.query(`
            SELECT COUNT(DISTINCT a.clientid) as count 
            FROM Appointment a
            INNER JOIN Client c ON a.clientid = c.id
            WHERE c.user_id = $1 
            AND a.date::date > CURRENT_DATE
        `, [userId]);
        console.log(`   Clients with future appointments: ${futureAppts.rows[0].count}\n`);
        
        // 7. Check clients without future appointments but with past appointments
        console.log('7. Clients without future appointments:');
        const eligibleClients = await db.query(`
            SELECT COUNT(DISTINCT c.id) as count
            FROM Client c
            INNER JOIN Appointment a ON c.id = a.clientid
            WHERE c.user_id = $1
            AND c.id NOT IN (
                SELECT DISTINCT clientid 
                FROM Appointment 
                WHERE date::date > CURRENT_DATE
            )
        `, [userId]);
        console.log(`   Clients without future appointments: ${eligibleClients.rows[0].count}\n`);
        
        // 8. Check the most recent appointments for each client
        console.log('8. Sample of most recent appointments per client:');
        const recentPerClient = await db.query(`
            SELECT 
                c.firstname, 
                c.lastname, 
                MAX(a.date::date) as last_appointment,
                (CURRENT_DATE - MAX(a.date::date)) as days_since
            FROM Client c
            INNER JOIN Appointment a ON c.id = a.clientid
            WHERE c.user_id = $1
            GROUP BY c.id, c.firstname, c.lastname
            ORDER BY days_since DESC
            LIMIT 10
        `, [userId]);
        
        recentPerClient.rows.forEach(row => {
            console.log(`   ${row.firstname} ${row.lastname}: ${row.last_appointment} (${row.days_since} days ago)`);
        });
        console.log('');
        
        // 9. Check messages data
        console.log('9. Messages data:');
        const messagesCount = await db.query(`
            SELECT COUNT(*) as total
            FROM Messages m
            INNER JOIN Client c ON m.clientid = c.id
            WHERE c.user_id = $1
        `, [userId]);
        console.log(`   Total messages: ${messagesCount.rows[0].total}\n`);
        
        // 10. Test our filtering logic step by step
        console.log('10. Step-by-step filtering:');
        
        // Step 1: All clients with appointments
        const step1 = await db.query(`
            SELECT COUNT(DISTINCT c.id) as count
            FROM Client c
            LEFT JOIN Appointment a ON c.id = a.clientid
            WHERE c.user_id = $1 AND a.id IS NOT NULL
        `, [userId]);
        console.log(`   Step 1 - Clients with appointments: ${step1.rows[0].count}`);
        
        // Step 2: Exclude future appointments
        const step2 = await db.query(`
            SELECT COUNT(DISTINCT c.id) as count
            FROM Client c
            LEFT JOIN Appointment a ON c.id = a.clientid
            WHERE c.user_id = $1 
            AND a.id IS NOT NULL
            AND c.id NOT IN (
                SELECT DISTINCT clientid 
                FROM Appointment 
                WHERE date::date > CURRENT_DATE
            )
        `, [userId]);
        console.log(`   Step 2 - Exclude future appointments: ${step2.rows[0].count}`);
        
        // Step 3: Must have had an appointment
        const step3 = await db.query(`
            SELECT COUNT(DISTINCT c.id) as count
            FROM Client c
            LEFT JOIN Appointment a ON c.id = a.clientid
            WHERE c.user_id = $1 
            AND a.id IS NOT NULL
            AND c.id NOT IN (
                SELECT DISTINCT clientid 
                FROM Appointment 
                WHERE date::date > CURRENT_DATE
            )
            AND (SELECT MAX(a2.date::date) FROM Appointment a2 WHERE a2.clientid = c.id) IS NOT NULL
        `, [userId]);
        console.log(`   Step 3 - Must have appointment history: ${step3.rows[0].count}`);
        
    } catch (error) {
        console.error('Diagnostic error:', error);
    }
}

runDiagnostics(); 