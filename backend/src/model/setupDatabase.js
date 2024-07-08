const { Client } = require('pg');
const {Pool} = require('pg');
const dotenv = require('dotenv')
dotenv.config({path : '../../.env'})
console.log(process.env.DATABASE_URL)


const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
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

// createTables();

