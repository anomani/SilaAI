const { Client } = require('pg');

const client = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: "postgres",
    database: "postgres"
});

client.connect((err) => {
    if (err) {
        console.error('Error connecting to PostgreSQL database', err.message);
    } else {
        console.log('Connected to the PostgreSQL database.');
    }
});

const createTables = async () => {
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS Client (
                id SERIAL PRIMARY KEY,
                firstName TEXT,
                lastName TEXT,
                phoneNumber TEXT,
                email TEXT,
                notes TEXT,
                daysSinceLastAppointment INTEGER DEFAULT 0
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS Appointment (
                id SERIAL PRIMARY KEY,
                clientId INTEGER,
                date TEXT,
                startTime TEXT,
                endTime TEXT,
                appointmentType TEXT,
                details TEXT,
                FOREIGN KEY(clientId) REFERENCES Client(id)
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS Messages (
                id SERIAL PRIMARY KEY,
                fromText TEXT,
                toText TEXT,
                body TEXT,
                date TEXT,
                clientId INTEGER,
                FOREIGN KEY(clientId) REFERENCES Client(id)
            );
        `);

        console.log('Tables created successfully');
    } catch (err) {
        console.error('Error creating tables', err.message);
    } finally {
        client.end();
    }
};

createTables();

