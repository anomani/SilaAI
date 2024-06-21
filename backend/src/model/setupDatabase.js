const sqlite3 = require('sqlite3').verbose();

// Connect to SQLite database (or create if it does not exist)
const db = new sqlite3.Database('./app.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Create tables for Clients, Appointments, and Messages
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS Client (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstName TEXT,
            lastName TEXT,
            phoneNumber TEXT,
            email TEXT,
            notes TEXT,
            daysSinceLastAppointment INTEGER
        );
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS Appointment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clientId INTEGER,
            date TEXT,
            startTime TEXT,
            endTime TEXT,
            appointmentType TEXT,
            details TEXT,
            FOREIGN KEY(clientId) REFERENCES Client(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fromText TEXT,
            toText TEXT,
            body TEXT,
            date TEXT,
            clientId INTEGER,
            FOREIGN KEY(clientId) REFERENCES Client(id)
        );
    `, () => {
        console.log('Tables created successfully');
        db.close();
    });
});
