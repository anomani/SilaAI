const { Pool } = require('pg');

let pool;

function connect() {
    pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: 'postgres',
        port: 5432,
    });

    pool.on('connect', () => {
        console.log('Connected to the PostgreSQL database');
    });

    pool.on('error', (err) => {
        console.error('Error connecting to the PostgreSQL database:', err.message);
    });
}

function getDB() {
    if (!pool) {
        connect();
    }
    return pool;
}

function closeDB() {
    if (pool) {
        pool.end((err) => {
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
