const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function connect() {
    const dbPath = path.join(__dirname, 'app.db'); // Adjust the path as necessary
    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
            console.error('Error connecting to the SQLite database:', err.message);
        } else {
            console.log('Connected to the SQLite database at', dbPath);
        }
    });
}

function getDB() {
    if (!db) {
        connect();
    }
    return db;
}

function closeDB() {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing the SQLite database:', err.message);
            } else {
                console.log('SQLite database connection closed.');
            }
        });
    }
}

async function main() {
  
}

main()
module.exports = {
    connect,
    getDB,
    closeDB
};
