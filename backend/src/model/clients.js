const dbUtils = require('./dbUtils');

async function createClient(firstName, lastName, phoneNumber, email, daysSinceLastAppointment, notes) {
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Client (firstName, lastName, phoneNumber, email, notes, daysSinceLastAppointment)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    return new Promise((resolve, reject) => {
        db.run(sql, [firstName, lastName, phoneNumber, email, notes, daysSinceLastAppointment], function(err) {
            if (err) {
                console.error('Error creating client:', err.message);
                reject(err);
            } else {
                console.log('Client Created with ID:', this.lastID);
                resolve(this.lastID);
            }
        });
    });
}

async function getClientById(clientId) {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Client WHERE id = ?';
    return new Promise((resolve, reject) => {
        db.get(sql, [clientId], (err, row) => {
            if (err) {
                console.error('Error fetching client:', err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

async function updateClient(clientId, updateData) {
    const db = dbUtils.getDB();
    const sql = `
        UPDATE Client
        SET firstName = ?, lastName = ?, phoneNumber = ?, email = ?, notes = ?, daysSinceLastAppointment = ?
        WHERE id = ?
    `;
    const params = [updateData.firstName, updateData.lastName, updateData.phoneNumber, updateData.email, updateData.notes, updateData.daysSinceLastAppointment, clientId];
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error('Error updating client:', err.message);
                reject(err);
            } else {
                console.log(`Client Updated: ${this.changes} changes made`);
                resolve(this.changes);
            }
        });
    });
}

async function deleteClient(clientId) {
    const db = dbUtils.getDB();
    const sql = 'DELETE FROM Client WHERE id = ?';
    return new Promise((resolve, reject) => {
        db.run(sql, [clientId], function(err) {
            if (err) {
                console.error('Error deleting client:', err.message);
                reject(err);
            } else {
                console.log('Client Deleted');
                resolve(this.changes);
            }
        });
    });
}
async function getAllClients() {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Client';
    return new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('Error fetching clients:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function checkClientExists(phoneNumber) {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Client WHERE phoneNumber = ?';
    return new Promise((resolve, reject) => {
        db.get(sql, [phoneNumber], (err, row) => {
            if (err) {
                console.error('Error checking if client exists:', err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

async function getClientByPhoneNumber(phoneNumber) {
    const db = dbUtils.getDB();
    if (phoneNumber.startsWith('+1')) {
        phoneNumber = phoneNumber.slice(2);
    }
    const sql = 'SELECT * FROM Client WHERE phoneNumber = ?';
    return new Promise((resolve, reject) => {
        db.get(sql, [phoneNumber], async (err, row) => {
            if (err) {
                console.error('Error fetching client by phone number:', err.message);
                reject(err);
            } else if (row) {
                try {
                    const client = await getClientById(row.id.toString());
                    resolve(client);
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error('Client not found'));
            }
        });
    });
}

async function followUp(days) {
    const db = dbUtils.getDB();

    // Ensure days is a number
    const daysNumber = parseInt(days, 10);
    if (isNaN(daysNumber)) {
        throw new Error("The 'days' parameter must be a valid number");
    }

    const sql = 'SELECT * FROM Client WHERE daysSinceLastAppointment >= ?';
    return new Promise((resolve, reject) => {
        db.all(sql, [daysNumber], (err, rows) => {
            if (err) {
                console.error('Error fetching clients for follow-up:', err.message);
                reject(err);
            } else {
                console.log('Clients found:', rows);
                resolve(rows);
            }
        });
    });
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
        WHERE firstName LIKE ? OR lastName LIKE ?
    `;

    return new Promise((resolve, reject) => {
        db.all(sql, [searchQuery, searchQuery], (err, rows) => {
            if (err) {
                console.error(`Error searching for clients: ${err.message}`);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function getDaysSinceLastAppointment(clientId) {
    const db = dbUtils.getDB();

    const sql = `
        SELECT date
        FROM Appointment
        WHERE clientId = ?
        ORDER BY date DESC
        LIMIT 1
    `;

    return new Promise((resolve, reject) => {
        db.get(sql, [clientId], (err, row) => {
            if (err) {
                console.error('Error fetching last appointment date:', err.message);
                reject(err);
            } else if (row) {
                const lastAppointmentDate = new Date(row.date);
                const currentDate = new Date();
                const timeDifference = currentDate - lastAppointmentDate;
                const daysSinceLastAppointment = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
                resolve(daysSinceLastAppointment);
            } else {
                resolve(null); // No appointments found for the client
            }
        });
    });
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
    getDaysSinceLastAppointment
};
