const dbUtils = require('./dbUtils');

async function createAppointment(appointmentType, date, startTime, endTime, clientId, details) {
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Appointment (appointmentType, date, startTime, endTime, clientId, details)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
    `;
    const values = [appointmentType, date, startTime, endTime, clientId, details];
    try {
        const res = await db.query(sql, values);
        console.log('Appointment Created with ID:', res.rows[0].id);
        return res.rows[0].id;
    } catch (err) {
        console.error('Error creating appointment:', err.message);
        throw err;
    }
}

async function getAppointmentById(appointmentId) {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Appointment WHERE id = $1';
    const values = [appointmentId];
    try {
        const res = await db.query(sql, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error fetching appointment:', err.message);
        throw err;
    }
}

async function updateAppointment(appointmentId, updateData) {
    const db = dbUtils.getDB();
    const sql = `
        UPDATE Appointment
        SET appointmentType = $1, date = $2, startTime = $3, endTime = $4, clientId = $5, details = $6
        WHERE id = $7
    `;
    const params = [updateData.appointmentType, updateData.date, updateData.startTime, updateData.endTime, updateData.clientId, updateData.details, appointmentId];
    try {
        const res = await db.query(sql, params);
        console.log(`Appointment Updated: ${res.rowCount} changes made`);
        return res.rowCount;
    } catch (err) {
        console.error('Error updating appointment:', err.message);
        throw err;
    }
}

async function deleteAppointment(appointmentId) {
    const db = dbUtils.getDB();
    const sql = 'DELETE FROM Appointment WHERE id = $1';
    const values = [appointmentId];
    try {
        const res = await db.query(sql, values);
        console.log('Appointment Deleted');
        return res.rowCount;
    } catch (err) {
        console.error('Error deleting appointment:', err.message);
        throw err;
    }
}

async function getAppointmentsByDay(date) {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Appointment WHERE date = $1 ORDER BY startTime';
    const values = [date];
    try {
        const res = await db.query(sql, values);
        return res.rows;
    } catch (err) {
        console.error('Error fetching appointments by day:', err.message);
        throw err;
    }
}

async function getAllAppointmentsByClientId(clientId) {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Appointment WHERE clientId = $1 ORDER BY date DESC';
    const values = [clientId];
    try {
        const res = await db.query(sql, values);
        return res.rows;
    } catch (err) {
        console.error('Error fetching appointments by client ID:', err.message);
        throw err;
    }
}

module.exports = {
    createAppointment,
    getAppointmentById,
    updateAppointment,
    deleteAppointment,
    getAppointmentsByDay,
    getAllAppointmentsByClientId
};
