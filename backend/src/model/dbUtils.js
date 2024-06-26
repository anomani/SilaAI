const { Client } = require('pg');
const dotenv = require('dotenv')
dotenv.config({path : '../../.env'})
let client;

function connect() {
    client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
    });

    client.connect(err => {
        if (err) {
            console.error('Connection error', err.stack);
        } else {
            console.log('Connected to PostgreSQL database');
        }
    });
}

function getDB() {
    if (!client) {
        connect();
    }
    return client;
}

function closeDB() {
    if (client) {
        client.end(err => {
            if (err) {
                console.error('Error closing the PostgreSQL database:', err.message);
            } else {
                console.log('PostgreSQL database connection closed.');
            }
        });
    }
}


module.exports = {
    connect,
    getDB,
    closeDB
};
