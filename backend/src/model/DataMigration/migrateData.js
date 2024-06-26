const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Client } = require('pg');

const client = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: "postgres",
    database: "postgres",
    statement_timeout: 60000, // Increase statement timeout to 60 seconds
    query_timeout: 60000, // Increase query timeout to 60 seconds
    connectionTimeoutMillis: 60000 // Increase connection timeout to 60 seconds
});

const insertClient = async (clientData) => {
    const query = `
        INSERT INTO Client (id, firstName, lastName, phoneNumber, email, notes, daysSinceLastAppointment)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [
        clientData.id,
        clientData.firstName,
        clientData.lastName,
        clientData.phoneNumber,
        clientData.email,
        clientData.notes,
        clientData.daysSinceLastAppointment
    ];
    await client.query(query, values);
};

const insertMessage = async (messageData) => {
    const query = `
        INSERT INTO Messages (id, fromText, toText, body, date, clientId)
        VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [
        messageData.id,
        messageData.fromText,
        messageData.toText,
        messageData.body,
        messageData.date,
        messageData.clientId
    ];
    await client.query(query, values);
};

const insertAppointment = async (appointmentData) => {
    const query = `
        INSERT INTO Appointment (id, clientId, date, startTime, endTime, appointmentType, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [
        appointmentData.id,
        appointmentData.clientId,
        appointmentData.date,
        appointmentData.startTime,
        appointmentData.endTime,
        appointmentData.appointmentType,
        appointmentData.details
    ];
    await client.query(query, values);
};

const csvFilePaths = {
    client: path.join(__dirname, 'client.csv'),
    message: path.join(__dirname, 'message.csv'),
    appointment: path.join(__dirname, 'appointment.csv')
};

const readCSV = (filePath, insertFunction) => {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                rows.push(row);
            })
            .on('end', async () => {
                console.log(`${filePath} file successfully processed`);
                try {
                    for (const row of rows) {
                        if(row.daysSinceLastAppointment === '') {
                            row.daysSinceLastAppointment = 0;
                        }
                        await insertFunction(row);
                    }
                    resolve();
                } catch (err) {
                    reject(err);
                }
            })
            .on('error', (err) => {
                reject(err);
            });
    });
};

async function migrateData() {
    try {
        await client.connect();
        // await readCSV(csvFilePaths.client, insertClient);
        // await readCSV(csvFilePaths.message, insertMessage);
        await readCSV(csvFilePaths.appointment, insertAppointment);
        console.log('Data migration completed');
    } catch (err) {
        console.error('Error during data migration', err.message);
    } finally {
        await client.end();
    }
}

migrateData();
