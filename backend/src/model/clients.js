const dbUtils = require('./dbUtils');
const { appointmentTypes } = require('./appointmentTypes');

async function createClient(firstName, lastName, phoneNumber, email, notes, user_id) {
    console.log('[createClient] user_id:', user_id);
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Client (firstName, lastName, phoneNumber, email, notes, user_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
    `;
    const values = [firstName, lastName, phoneNumber, email, notes, user_id];
    try {
        const res = await db.query(sql, values);
        console.log('Client Created with ID:', res.rows[0].id);
        return res.rows[0].id;
    } catch (err) {
        console.error('Error creating client:', err.message);
        throw err;
    }
}

async function createAltClient(firstName, lastName, phoneNumber, email, daysSinceLastAppointment, notes, user_id) {
    console.log('[createAltClient] user_id:', user_id);
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Client (firstName, lastName, phoneNumber, email, notes, daysSinceLastAppointment, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    `;
    const values = [firstName, lastName, phoneNumber, email, notes, daysSinceLastAppointment, user_id];
    try {
        const res = await db.query(sql, values);
        console.log('Client Created with ID:', res.rows[0].id);
        return res.rows[0].id;
    } catch (err) {
        console.error('Error creating client:', err.message);
        throw err;
    }
}

async function getClientById(clientId) {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Client WHERE id = $1';
    const values = [clientId];
    try {
        const res = await db.query(sql, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error fetching client:', err.message);
        throw err;
    }
}

async function updateClient(clientId, firstName, lastName, phoneNumber, email, notes) {
    const db = dbUtils.getDB();
    const sql = `
        UPDATE Client
        SET firstName = $1, lastName = $2, phoneNumber = $3, email = $4, notes = $5
        WHERE id = $6
        RETURNING *
    `;
    const params = [firstName, lastName, phoneNumber, email, notes, clientId];
    try {
        const res = await db.query(sql, params);
        console.log(`Client Updated: ${res.rowCount} changes made`);
        return res.rows[0];
    } catch (err) {
        console.error('Error updating client:', err.message);
        throw err;
    }
}

async function deleteClient(clientId) {
    const db = dbUtils.getDB();
    const sql = 'DELETE FROM Client WHERE id = $1';
    const values = [clientId];
    try {
        const res = await db.query(sql, values);
        console.log('Client Deleted');
        return res.rowCount;
    } catch (err) {
        console.error('Error deleting client:', err.message);
        throw err;
    }
}

async function getAllClients(user_id) {
    console.log('[getAllClients] user_id:', user_id);
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Client WHERE user_id = $1 ORDER BY LOWER(lastName), LOWER(firstName)';
    const values = [user_id];
    try {
        const res = await db.query(sql, values);
        return res.rows;
    } catch (err) {
        console.error('Error fetching clients:', err.message);
        throw err;
    }
}

async function checkClientExists(phoneNumber, user_id) {
    console.log('[checkClientExists] user_id:', user_id);
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Client WHERE phoneNumber = $1 AND user_id = $2';
    const values = [phoneNumber, user_id];
    try {
        const res = await db.query(sql, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error checking if client exists:', err.message);
        throw err;
    }
}

async function getClientByPhoneNumber(phoneNumber, user_id) {
    console.log('[getClientByPhoneNumber] user_id:', user_id);
    const db = dbUtils.getDB();
    const sql = `
        SELECT * FROM Client 
        WHERE (REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phoneNumber, '+1', ''), '(', ''), ')', ''), '-', ''), ' ', ''), '.', '') = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE($1, '+1', ''), '(', ''), ')', ''), '-', ''), ' ', ''), '.', '')
        OR phoneNumber = $1)
        AND user_id = $2
    `;
    const values = [phoneNumber, user_id];
    try {
        const res = await db.query(sql, values);
        if (res.rows[0]) {
            const client = await getClientById(res.rows[0].id.toString());
            return client;
        } else {
            return {
                id: '',
                firstname: '',
                lastname: '',
                phonenumber: '',
                email: '',
                notes: ''
            };
        }
    } catch (err) {
        console.error('Error fetching client by phone number:', err.message);
        throw err;
    }
}

async function checkClientExistsByPhone(phoneNumber, user_id) {
    console.log('[checkClientExistsByPhone] START');
    console.log('Input phoneNumber:', phoneNumber);
    console.log('Input user_id:', user_id);
    
    const db = dbUtils.getDB();
    const sql = `
        SELECT * FROM Client 
        WHERE (REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phoneNumber, '+1', ''), '(', ''), ')', ''), '-', ''), ' ', ''), '.', '') = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE($1, '+1', ''), '(', ''), ')', ''), '-', ''), ' ', ''), '.', '')
        OR phoneNumber = $1)
        AND user_id = $2
    `;
    const values = [phoneNumber, user_id];
    
    console.log('SQL query:', sql);
    console.log('SQL values:', values);
    
    try {
        const res = await db.query(sql, values);
        console.log('Query result rows:', res.rows.length);
        
        if (res.rows.length > 0 && res.rows[0]) {
            console.log('Found existing client:', res.rows[0]);
            return res.rows[0];
        } else {
            console.log('No existing client found for phone:', phoneNumber, 'and user_id:', user_id);
            return null;
        }
    } catch (err) {
        console.error('Error checking client by phone number:', err.message);
        console.error('Full error:', err);
        throw err;
    }
}

async function followUp(days, user_id) {
    const db = dbUtils.getDB();

    // Ensure days is a number
    const daysNumber = parseInt(days, 10);
    if (isNaN(daysNumber)) {
        throw new Error("The 'days' parameter must be a valid number");
    }

    const sql = 'SELECT * FROM Client WHERE daysSinceLastAppointment >= $1 AND user_id = $2';
    const values = [daysNumber, user_id];
    try {
        const res = await db.query(sql, values);
        console.log('Clients found:', res.rows);
        return res.rows;
    } catch (err) {
        console.error('Error fetching clients for follow-up:', err.message);
        throw err;
    }
}

async function searchForClients(query, user_id) {
    const db = dbUtils.getDB();
    
    // Validate and convert query to string
    if (query == null) {
        throw new Error("Query parameter is required");
    }

    // Convert query to lowercase and trim whitespace
    const searchQuery = String(query).toLowerCase().trim();
    if (searchQuery.length === 0) {
        return [];
    }

    const sql = `
        SELECT * FROM Client
        WHERE (
            LOWER(firstName || ' ' || lastName) LIKE $1
        ) AND user_id = $2
        ORDER BY lastName, firstName
        LIMIT 50
    `;

    // Create the value with wildcard
    const values = [`%${searchQuery}%`, user_id];

    try {
        const res = await db.query(sql, values);
        return res.rows;
    } catch (err) {
        console.error(`Error searching for clients: ${err.message}`);
        throw err;
    }
}

async function getDaysSinceLastAppointment(clientId) {
    const db = dbUtils.getDB();

    const sql = `
        SELECT date
        FROM Appointment
        WHERE clientId = $1
        ORDER BY date DESC
        LIMIT 1
    `;

    const values = [clientId];
    try {
        const res = await db.query(sql, values);
        if (res.rows[0]) {
            const lastAppointmentDate = new Date(res.rows[0].date);
            const currentDate = new Date();
            const timeDifference = currentDate - lastAppointmentDate;
            const daysSinceLastAppointment = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
            return daysSinceLastAppointment;
        } else {
            return null; // No appointments found for the client
        }
    } catch (err) {
        console.error('Error fetching last appointment date:', err.message);
        throw err;
    }
}

async function updateClientOutreachDate(clientId, outreachDate) {
    const db = dbUtils.getDB();

    const sql = `
        UPDATE Client
        SET outreach_date = $1
        WHERE id = $2
    `;

    const values = [outreachDate, clientId];
    try {
        const res = await db.query(sql, values);
        return res.rowCount > 0;
    } catch (err) {
        console.error('Error updating client outreach date:', err.message);
        throw err;
    }
}

async function getClientByName(firstName, lastName, user_id) {
    console.log('[getClientByName] user_id:', user_id);
    console.log("First Name:", firstName);
    console.log("Last Name:", lastName);
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Client WHERE LOWER(firstName) = LOWER($1) AND LOWER(lastName) = LOWER($2) AND user_id = $3';
    const values = [firstName, lastName, user_id];
    try {
        const res = await db.query(sql, values);
        console.log("Result:", res.rows[0]);
        return res.rows[0];
    } catch (err) {
        console.error('Error fetching client by name:', err.message);
        throw err;
    }
}

async function getClientAutoRespond(clientId) {
    const db = dbUtils.getDB();
    const sql = 'SELECT auto_respond FROM Client WHERE id = $1';
    const values = [clientId];
    try {
        const res = await db.query(sql, values);
        return res.rows[0].auto_respond;
    } catch (err) {
        console.error('Error fetching client auto_respond status:', err.message);
        throw err;
    }
}

async function updateClientAutoRespond(clientId, autoRespond) {
    const db = dbUtils.getDB();
    const sql = 'UPDATE Client SET auto_respond = $1 WHERE id = $2 RETURNING *';
    const values = [autoRespond, clientId];
    try {
        const res = await db.query(sql, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error updating client auto_respond status:', err.message);
        throw err;
    }
}

async function updateClientNames(clientId, firstName, lastName) {
    const db = dbUtils.getDB();
    const sql = `
        UPDATE Client
        SET firstName = $1, lastName = $2
        WHERE id = $3
        RETURNING *
    `;
    const values = [firstName, lastName, clientId];
    try {
        const res = await db.query(sql, values);
        console.log(`Client Names Updated: ${res.rowCount} changes made`);
        return res.rows[0];
    } catch (err) {
        console.error('Error updating client names:', err.message);
        throw err;
    }
}

/**
 * Retrieves clients who haven't had an appointment in the last 6 weeks
 * and haven't been contacted in the last 90 days.
 * @returns {Promise<Array>} List of old clients eligible for outreach, sorted by most recent visit
 */
async function getOldClients(user_id) {
    console.log('[getOldClients] user_id:', user_id);
    const db = dbUtils.getDB();
    const inactivityThresholdDays = 42; // Clients inactive for 6 weeks
    const outreachThresholdDays = 90; // No outreach in the last 90 days

    const currentDate = new Date().toISOString().split('T')[0];
    const pastThresholdDate = new Date(Date.now() - inactivityThresholdDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const outreachThresholdDate = new Date(Date.now() - outreachThresholdDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const sql = `
        WITH RankedAppointments AS (
            SELECT 
                clientid,
                appointmenttype,
                COUNT(*) as type_count,
                ROW_NUMBER() OVER (PARTITION BY clientid ORDER BY COUNT(*) DESC) as rn
            FROM Appointment
            GROUP BY clientid, appointmenttype
        ),
        FutureAppointments AS (
            SELECT DISTINCT clientid
            FROM Appointment
            WHERE date::date > CURRENT_DATE
        )
        SELECT 
            c.id, c.firstName, c.lastName, c.phoneNumber, c.outreach_date,
            a.lastAppointmentDate AS lastVisitDate,
            ra.appointmenttype AS mostCommonAppointmentType
        FROM Client c
        LEFT JOIN (
            SELECT clientid, MAX(date) AS lastAppointmentDate
            FROM Appointment
            WHERE date <= $1
            GROUP BY clientid
        ) a ON c.id = a.clientid
        LEFT JOIN RankedAppointments ra ON c.id = ra.clientid AND ra.rn = 1
        WHERE 
            (a.lastAppointmentDate IS NULL OR a.lastAppointmentDate <= $2)
            AND (c.outreach_date IS NULL OR c.outreach_date <= $3)
            AND c.id NOT IN (SELECT clientid FROM FutureAppointments)
            AND c.user_id = $4
        ORDER BY a.lastAppointmentDate DESC NULLS LAST
        LIMIT 100
    `;

    const values = [currentDate, pastThresholdDate, outreachThresholdDate, user_id];

    try {
        const res = await db.query(sql, values);
        return res.rows.map(row => ({
            ...row,
            group: getGroupForAppointmentType(row.mostcommonappointmenttype)
        }));
    } catch (err) {
        console.error('Error fetching old clients:', err.message);
        throw err;
    }
}

/**
 * Maps appointment type to group number
 */
function getGroupForAppointmentType(appointmentType) {
    if (!appointmentType) return 1; // Default group
    
    const typeMapping = {
        'haircut': 1,
        'beard': 2,
        'both': 3,
        'shampoo': 1,
        'styling': 1,
        'trim': 1
    };
    
    const normalizedType = appointmentType.toLowerCase();
    return typeMapping[normalizedType] || 1;
}

/**
 * Updates the outreach information for a client after sending a message.
 * @param {string} clientId - The ID of the client.
 * @returns {Promise<void>}
 */
async function updateClientOutreachInfo(clientId) {
    const db = dbUtils.getDB();
    const sql = `
        UPDATE Client
        SET 
            outreach_date = CURRENT_DATE
        WHERE id = $1
    `;
    const values = [clientId];
    
    try {
        await db.query(sql, values);
        console.log(`Outreach info updated for client ID: ${clientId}`);
    } catch (err) {
        console.error('Error updating outreach info:', err.message);
        throw err;
    }
}

/**
 * Retrieves the number of customers contacted within the last specified number of days.
 * @param {number} [days=30] - The number of days to look back for outreach contacts.
 * @returns {Promise<number>} The count of customers contacted.
 */
async function getNumberOfCustomersContacted(days = 30, user_id) {
    console.log('[getNumberOfCustomersContacted] user_id:', user_id);
    const db = dbUtils.getDB();
    const sql = `
        SELECT COUNT(DISTINCT id) as contacted_count
        FROM Client
        WHERE outreach_date >= CURRENT_DATE - INTERVAL '${days} days'
        AND user_id = $1
    `;
    const values = [user_id];

    try {
        const res = await db.query(sql, values);
        return parseInt(res.rows[0].contacted_count, 10);
    } catch (err) {
        console.error('Error getting number of customers contacted:', err.message);
        throw err;
    }
}

/**
 * Gets a formatted list of all clients for the assistant prompt
 * @param {number} user_id - The ID of the user
 * @returns {Promise<string>} Formatted string of client information
 */
async function getFormattedClientList(user_id) {
    const db = dbUtils.getDB();
    const sql = `
        SELECT id, firstname, lastname, phonenumber 
        FROM Client 
        WHERE user_id = $1 
        ORDER BY lastname, firstname
    `;
    const values = [user_id];
    
    try {
        const res = await db.query(sql, values);
        return res.rows
            .map(c => `${(c.id?.toString() || '').padEnd(4)} | ${(c.firstname || '').padEnd(20)} | ${(c.lastname || '').padEnd(16)} | ${c.phonenumber || ''}`)
            .join('\n');
    } catch (err) {
        console.error('Error getting formatted client list:', err.message);
        throw err;
    }
}

/**
 * Gets clients who are overdue based on their individual booking patterns and message history
 * @param {number} user_id - The ID of the user
 * @returns {Promise<Array>} List of clients with readiness scores, sorted by priority
 */
async function getDynamicLapsedClients(user_id) {
    console.log('[getDynamicLapsedClients] user_id:', user_id);
    const db = dbUtils.getDB();
    
    const sql = `
        WITH ClientBookingPatterns AS (
            SELECT 
                c.id,
                c.firstname,
                c.lastname,
                c.phonenumber,
                c.outreach_date,
                c.user_id,
                COUNT(a.id) as total_appointments,
                MAX(a.date::date) as last_appointment_date,
                MIN(a.date::date) as first_appointment_date,
                CASE 
                    WHEN MAX(a.date::date) IS NOT NULL THEN
                        (CURRENT_DATE - MAX(a.date::date))
                    ELSE NULL
                END as days_since_last_appointment,
                -- Calculate average days between appointments
                CASE 
                    WHEN COUNT(a.id) >= 2 THEN
                        (
                            SELECT AVG(curr_date - prev_date)
                            FROM (
                                SELECT 
                                    a2.date::date as curr_date,
                                    LAG(a2.date::date) OVER (ORDER BY a2.date::date) as prev_date
                                FROM Appointment a2 
                                WHERE a2.clientid = c.id
                                ORDER BY a2.date::date
                            ) date_diffs
                            WHERE prev_date IS NOT NULL
                        )
                    ELSE NULL
                END as avg_days_between_appointments,
                -- Calculate variance in booking intervals
                CASE 
                    WHEN COUNT(a.id) >= 3 THEN
                        (
                            SELECT STDDEV(curr_date - prev_date)
                            FROM (
                                SELECT 
                                    a2.date::date as curr_date,
                                    LAG(a2.date::date) OVER (ORDER BY a2.date::date) as prev_date
                                FROM Appointment a2 
                                WHERE a2.clientid = c.id
                                ORDER BY a2.date::date
                            ) date_diffs
                            WHERE prev_date IS NOT NULL
                        )
                    ELSE NULL
                END as booking_variance,
                -- Get most common appointment type
                (
                    SELECT appointmenttype 
                    FROM Appointment a2 
                    WHERE a2.clientid = c.id 
                    GROUP BY appointmenttype 
                    ORDER BY COUNT(*) DESC 
                    LIMIT 1
                ) as preferred_appointment_type,
                -- Calculate average spending
                AVG(COALESCE(a.price, 0)) as avg_spending
            FROM Client c
            LEFT JOIN Appointment a ON c.id = a.clientid
            WHERE c.user_id = $1
            GROUP BY c.id, c.firstname, c.lastname, c.phonenumber, c.outreach_date, c.user_id
        ),
        ClientMessageStats AS (
            SELECT 
                clientid,
                COUNT(CASE WHEN fromtext = '+18446480598' THEN 1 END) as messages_sent,
                COUNT(CASE WHEN fromtext != '+18446480598' THEN 1 END) as client_responses,
                MAX(CASE WHEN fromtext = '+18446480598' THEN date::date END) as last_outreach_date,
                MAX(CASE WHEN fromtext != '+18446480598' THEN date::date END) as last_response_date,
                -- Calculate response rate
                CASE 
                    WHEN COUNT(CASE WHEN fromtext = '+18446480598' THEN 1 END) > 0 THEN 
                        ROUND((COUNT(CASE WHEN fromtext != '+18446480598' THEN 1 END)::numeric / 
                               COUNT(CASE WHEN fromtext = '+18446480598' THEN 1 END)::numeric) * 100, 2)
                    ELSE 0 
                END as response_rate,
                -- Count consecutive non-responses (simplified)
                CASE 
                    WHEN MAX(CASE WHEN fromtext != '+18446480598' THEN date::date END) IS NULL THEN 
                        COUNT(CASE WHEN fromtext = '+18446480598' THEN 1 END)
                    ELSE 0
                END as consecutive_non_responses
            FROM Messages 
            WHERE date::date >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY clientid
        ),
        FutureAppointments AS (
            SELECT DISTINCT clientid
            FROM Appointment
            WHERE date::date > CURRENT_DATE
        )
        SELECT 
            cbp.*,
            COALESCE(cms.messages_sent, 0) as messages_sent,
            COALESCE(cms.client_responses, 0) as client_responses,
            cms.last_outreach_date,
            cms.last_response_date,
            COALESCE(cms.response_rate, 0) as response_rate,
            COALESCE(cms.consecutive_non_responses, 0) as consecutive_non_responses,
            CASE 
                WHEN cms.last_outreach_date IS NOT NULL THEN
                    (CURRENT_DATE - cms.last_outreach_date)
                ELSE 999
            END as days_since_last_outreach,
            CASE 
                WHEN cms.last_response_date IS NOT NULL THEN
                    (CURRENT_DATE - cms.last_response_date)
                ELSE 999
            END as days_since_last_response
        FROM ClientBookingPatterns cbp
        LEFT JOIN ClientMessageStats cms ON cbp.id = cms.clientid
        WHERE 
            -- Exclude clients with future appointments
            cbp.id NOT IN (SELECT clientid FROM FutureAppointments)
            -- Must have at least one appointment to analyze patterns
            AND cbp.total_appointments > 0
            -- Must have had an appointment (to have a last_appointment_date)
            AND cbp.last_appointment_date IS NOT NULL
        ORDER BY cbp.last_appointment_date DESC
    `;
    
    const values = [user_id];
    
    try {
        const res = await db.query(sql, values);
        
        // Calculate readiness scores for each client
        const clientsWithScores = res.rows.map(client => {
            const readinessScore = calculateOutreachReadiness(client);
            return {
                ...client,
                group: getGroupForAppointmentType(client.preferred_appointment_type),
                readiness_score: readinessScore,
                personal_threshold: calculatePersonalThreshold(client),
                is_overdue: isClientOverdue(client)
            };
        });
        
        // Filter to only overdue clients with good readiness scores
        const eligibleClients = clientsWithScores.filter(client => 
            client.is_overdue && client.readiness_score >= 50
        );
        
        // Sort by readiness score (highest first)
        return eligibleClients.sort((a, b) => b.readiness_score - a.readiness_score);
        
    } catch (err) {
        console.error('Error fetching dynamic lapsed clients:', err.message);
        throw err;
    }
}

/**
 * Calculates a client's personal booking threshold based on their history
 */
function calculatePersonalThreshold(client) {
    const defaultThreshold = 90; // 3 months for clients with limited history
    
    // If client has less than 3 appointments, use default
    if (client.total_appointments < 3) {
        return defaultThreshold;
    }
    
    // If we have booking pattern data
    if (client.avg_days_between_appointments) {
        let personalThreshold = client.avg_days_between_appointments;
        
        // Add buffer based on variance (more irregular clients get longer buffer)
        if (client.booking_variance) {
            personalThreshold += (client.booking_variance * 0.5);
        }
        
        // Add grace period based on appointment history depth
        const gracePeriod = client.total_appointments >= 5 ? 7 : 14; // More history = shorter grace
        personalThreshold += gracePeriod;
        
        // Apply confidence-based adjustments
        if (client.total_appointments >= 5) {
            // High confidence: use pattern + 20% buffer
            personalThreshold *= 1.2;
        } else {
            // Medium confidence: use pattern + 40% buffer  
            personalThreshold *= 1.4;
        }
        
        // Cap the threshold (min 21 days, max 180 days)
        personalThreshold = Math.max(21, Math.min(180, personalThreshold));
        
        return Math.round(personalThreshold);
    }
    
    return defaultThreshold;
}

/**
 * Determines if a client is overdue based on their personal threshold
 */
function isClientOverdue(client) {
    const personalThreshold = calculatePersonalThreshold(client);
    return client.days_since_last_appointment >= personalThreshold;
}

/**
 * Calculates outreach readiness score (0-100) based on multiple factors
 */
function calculateOutreachReadiness(client) {
    const appointmentScore = calculateAppointmentOverdueScore(client);
    const messageCooldownScore = calculateMessageCooldownScore(client);
    const responseScore = calculateResponseScore(client);
    const valueScore = calculateClientValueScore(client);
    
    // Weighted composite score
    const readinessScore = 
        (appointmentScore * 0.4) +      // 40% - main factor
        (messageCooldownScore * 0.3) +  // 30% - respect cooldowns
        (responseScore * 0.2) +         // 20% - prioritize responsive clients
        (valueScore * 0.1);             // 10% - slight bias to high-value
        
    return Math.round(Math.max(0, Math.min(100, readinessScore)));
}

/**
 * Calculates how overdue a client is for their next appointment (0-100)
 */
function calculateAppointmentOverdueScore(client) {
    const personalThreshold = calculatePersonalThreshold(client);
    const daysSinceLastAppointment = client.days_since_last_appointment;
    
    if (daysSinceLastAppointment < personalThreshold) {
        return 0; // Not overdue yet
    }
    
    // Calculate how far past their threshold they are
    const overdueAmount = daysSinceLastAppointment - personalThreshold;
    const maxOverdue = personalThreshold * 0.5; // Consider 150% of threshold as max overdue
    
    return Math.min(100, (overdueAmount / maxOverdue) * 100);
}

/**
 * Calculates message cooldown score based on communication history (0-100)
 */
function calculateMessageCooldownScore(client) {
    const daysSinceLastMessage = client.days_since_last_outreach;
    const responseRate = client.response_rate || 0;
    const consecutiveNonResponses = client.consecutive_non_responses || 0;
    
    // If never messaged, full score
    if (daysSinceLastMessage >= 999) {
        return 100;
    }
    
    // Base cooldown requirements
    let requiredCooldown = 30; // Default 30 days
    
    // Adjust based on response history
    if (responseRate > 70) {
        requiredCooldown = 21;      // Good responders: 3 weeks
    } else if (responseRate < 30 && responseRate > 0) {
        requiredCooldown = 45;      // Poor responders: 6+ weeks
    } else if (responseRate === 0 && client.messages_sent > 0) {
        requiredCooldown = 60;      // Non-responders: 2+ months
    }
    
    // Exponential backoff for consecutive non-responses
    if (consecutiveNonResponses > 0) {
        requiredCooldown = Math.min(120, requiredCooldown * Math.pow(1.5, consecutiveNonResponses));
    }
    
    // Return score (0-100, where 100 = ready to message)
    if (daysSinceLastMessage >= requiredCooldown) {
        return 100;
    }
    
    return Math.round((daysSinceLastMessage / requiredCooldown) * 100);
}

/**
 * Calculates response score based on client's communication history (0-100)
 */
function calculateResponseScore(client) {
    const responseRate = client.response_rate || 0;
    const daysSinceLastResponse = client.days_since_last_response;
    
    // Base score from response rate
    let score = responseRate;
    
    // Bonus for recent responders
    if (daysSinceLastResponse < 30) {
        score += 20;
    } else if (daysSinceLastResponse < 60) {
        score += 10;
    }
    
    // Penalty for never responding
    if (client.messages_sent > 2 && client.client_responses === 0) {
        score = Math.max(0, score - 30);
    }
    
    return Math.min(100, score);
}

/**
 * Calculates client value score based on appointment history (0-100)
 */
function calculateClientValueScore(client) {
    const totalAppointments = client.total_appointments || 0;
    const avgSpending = client.avg_spending || 0;
    
    // Base score from appointment frequency
    let score = Math.min(50, totalAppointments * 5); // Max 50 points for frequency
    
    // Add score from spending (normalize to $200 max)
    score += Math.min(50, (avgSpending / 200) * 50);
    
    return Math.round(score);
}


module.exports = {
    createClient,
    getClientById,
    updateClient,
    deleteClient,
    getAllClients,
    checkClientExists,
    getClientByPhoneNumber,
    checkClientExistsByPhone,
    followUp,
    searchForClients,
    getDaysSinceLastAppointment,
    createAltClient,
    updateClientOutreachDate,
    getClientByName,
    getClientAutoRespond,
    updateClientAutoRespond,
    updateClientNames,
    getOldClients,
    updateClientOutreachInfo,
    getNumberOfCustomersContacted,
    getFormattedClientList,
    getDynamicLapsedClients
};