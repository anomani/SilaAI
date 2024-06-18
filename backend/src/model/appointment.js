const dbUtils = require('./dbUtils');

async function createAppointment(appointmentType, date, startTime, endTime, clientId, details) {
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Appointment (appointmentType, date, startTime, endTime, clientId, details)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    return new Promise((resolve, reject) => {
        db.run(sql, [appointmentType, date, startTime, endTime, clientId, details], function(err) {
            if (err) {
                console.error('Error creating appointment:', err.message);
                reject(err);
            } else {
                console.log('Appointment Created with ID:', this.lastID);
                resolve(this.lastID);
            }
        });
    });
}

async function getAppointmentById(appointmentId) {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Appointment WHERE id = ?';
    return new Promise((resolve, reject) => {
        db.get(sql, [appointmentId], (err, row) => {
            if (err) {
                console.error('Error fetching appointment:', err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

async function updateAppointment(appointmentId, updateData) {
    const db = dbUtils.getDB();
    const sql = `
        UPDATE Appointment
        SET appointmentType = ?, date = ?, startTime = ?, endTime = ?, clientId = ?, details = ?
        WHERE id = ?
    `;
    const params = [updateData.appointmentType, updateData.date, updateData.startTime, updateData.endTime, updateData.clientId, updateData.details, appointmentId];
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error('Error updating appointment:', err.message);
                reject(err);
            } else {
                console.log(`Appointment Updated: ${this.changes} changes made`);
                resolve(this.changes);
            }
        });
    });
}

async function deleteAppointment(appointmentId) {
    const db = dbUtils.getDB();
    const sql = 'DELETE FROM Appointment WHERE id = ?';
    return new Promise((resolve, reject) => {
        db.run(sql, [appointmentId], function(err) {
            if (err) {
                console.error('Error deleting appointment:', err.message);
                reject(err);
            } else {
                console.log('Appointment Deleted');
                resolve(this.changes);
            }
        });
    });
}

async function getAppointmentsByDay(date) {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Appointment WHERE date = ?';
    return new Promise((resolve, reject) => {
        db.all(sql, [date], (err, rows) => {
            if (err) {
                console.error('Error fetching appointments by day:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function getAllAppointmentsByClientId(clientId) {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Appointment WHERE clientId = ?';
    return new Promise((resolve, reject) => {
        db.all(sql, [clientId], (err, rows) => {
            if (err) {
                console.error('Error fetching appointments by client ID:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

module.exports = {
    createAppointment,
    getAppointmentById,
    updateAppointment,
    deleteAppointment,
    getAppointmentsByDay,
    getAllAppointmentsByClientId
};
