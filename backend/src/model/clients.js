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
            WHERE date > $1
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

function getGroupForAppointmentType(appointmentType) {
    if (!appointmentType) return 1; // Default to group 1 if appointmentType is null or undefined
    const appointmentInfo = appointmentTypes[appointmentType];
    return appointmentInfo ? appointmentInfo.group : 1; // Default to group 1 if not found
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
            .map(c => `${c.id.toString().padEnd(4)} | ${c.firstname.padEnd(20)} | ${c.lastname.padEnd(16)} | ${c.phonenumber}`)
            .join('\n');
    } catch (err) {
        console.error('Error getting formatted client list:', err.message);
        throw err;
    }
}

module.exports = {
    createClient,
    getClientById,
    updateClient,
    deleteClient,
    getAllClients,
    checkClientExists,
    getClientByPhoneNumber,
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
    getFormattedClientList
};