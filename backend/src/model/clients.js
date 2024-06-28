const dbUtils = require('./dbUtils');

async function createClient(firstName, lastName, phoneNumber, email, notes) {
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Client (firstName, lastName, phoneNumber, email, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
    `;
    const values = [firstName, lastName, phoneNumber, email, notes];
    try {
        const res = await db.query(sql, values);
        console.log('Client Created with ID:', res.rows[0].id);
        return res.rows[0].id;
    } catch (err) {
        console.error('Error creating client:', err.message);
        throw err;
    }
}

async function createAltClient(firstName, lastName, phoneNumber, email, daysSinceLastAppointment, notes) {
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Client (firstName, lastName, phoneNumber, email, notes, daysSinceLastAppointment)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
    `;
    const values = [firstName, lastName, phoneNumber, email, notes, daysSinceLastAppointment];
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

async function getAllClients() {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Client';
    try {
        const res = await db.query(sql);
        return res.rows;
    } catch (err) {
        console.error('Error fetching clients:', err.message);
        throw err;
    }
}

async function checkClientExists(phoneNumber) {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Client WHERE phoneNumber = $1';
    const values = [phoneNumber];
    try {
        const res = await db.query(sql, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error checking if client exists:', err.message);
        throw err;
    }
}

async function getClientByPhoneNumber(phoneNumber) {
    const db = dbUtils.getDB();
    const sql = `
        SELECT * FROM Client 
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phoneNumber, '+1', ''), '(', ''), ')', ''), '-', ''), ' ', ''), '.', '') = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE($1, '+1', ''), '(', ''), ')', ''), '-', ''), ' ', ''), '.', '')
        OR phoneNumber = $2
    `;
    const values = [phoneNumber, phoneNumber];
    try {
        const res = await db.query(sql, values);
        if (res.rows[0]) {
            const client = await getClientById(res.rows[0].id.toString());
            return client;
        } else {
            return {
                id: '',
                firstname: '',
                lastnqame: '',
                phonenumber: '',
                email: '',
                notes: '',
                dayssincelastappointment: ''
            };
        }
    } catch (err) {
        console.error('Error fetching client by phone number:', err.message);
        throw err;
    }
}
async function followUp(days) {
    const db = dbUtils.getDB();

    // Ensure days is a number
    const daysNumber = parseInt(days, 10);
    if (isNaN(daysNumber)) {
        throw new Error("The 'days' parameter must be a valid number");
    }

    const sql = 'SELECT * FROM Client WHERE daysSinceLastAppointment >= $1';
    const values = [daysNumber];
    try {
        const res = await db.query(sql, values);
        console.log('Clients found:', res.rows);
        return res.rows;
    } catch (err) {
        console.error('Error fetching clients for follow-up:', err.message);
        throw err;
    }
}

async function searchForClients(query) {
    const db = dbUtils.getDB();
    
    // Validate and convert query to string
    if (query == null) {
        throw new Error("Query parameter is required");
    }
    const searchQuery = `%${String(query)}%`;

    const sql = `
        SELECT * FROM Client
        WHERE firstName LIKE $1 OR lastName LIKE $2
    `;

    const values = [searchQuery, searchQuery];
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
    createAltClient
};
