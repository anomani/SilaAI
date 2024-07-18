const dbUtils = require('./dbUtils');

async function createAppointment(appointmentType, acuityId, date, startTime, endTime, clientId, details, price) {
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Appointment (appointmentType, acuityId, date, startTime, endTime, clientId, details, price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    `;
    const values = [appointmentType, acuityId, date, startTime, endTime, clientId, details, price];
    try {
        const res = await db.query(sql, values);
        console.log('Appointment Created with ID:', res.rows[0].id);
        return res.rows[0].id;
    } catch (err) {
        console.error('Error creating appointment:', err.message);
        throw err;
    }
}

// async function main() {
//     await createAppointment('test', '2005-03-01', '12:00', '13:00', 3367, 'test');
// }
// main()

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
        SET appointmentType = $1, date = $2, startTime = $3, endTime = $4, clientId = $5, details = $6, price = $7
        WHERE id = $8
    `;
    const params = [updateData.appointmentType, updateData.date, updateData.startTime, updateData.endTime, updateData.clientId, updateData.details, updateData.price, appointmentId];
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

async function findAppointmentByClientAndTime(clientId, date, startTime) {
    const db = dbUtils.getDB();
    const sql = `
        SELECT * FROM Appointment
        WHERE clientId = $1 AND date = $2 AND startTime = $3
        LIMIT 1
    `;
    const values = [clientId, date, startTime];
    try {
        const res = await db.query(sql, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error finding appointment:', err.message);
        throw err;
    }
}

async function findAndUpdateAppointmentByAcuityId(acuityId, updateData) {
    const db = dbUtils.getDB();
    const sql = `
        UPDATE Appointment
        SET appointmentType = $1, date = $2, startTime = $3, endTime = $4, clientId = $5, details = $6, price = $7
        WHERE acuityId = $8
        RETURNING *
    `;
    const params = [
        updateData.appointmentType,
        updateData.date,
        updateData.startTime,
        updateData.endTime,
        updateData.clientId,
        updateData.details,
        updateData.price,
        acuityId
    ];
    try {
        const res = await db.query(sql, params);
        if (res.rows.length === 0) {
            console.log(`No appointment found with Acuity ID: ${acuityId}`);
            return null;
        }
        console.log(`Appointment Updated: Acuity ID ${acuityId}`);
        return res.rows[0];
    } catch (err) {
        console.error('Error updating appointment by Acuity ID:', err.message);
        throw err;
    }
}

async function getUpcomingAppointments(clientId, limit = 5) {
    const db = dbUtils.getDB();
    const currentDate = new Date().toISOString().split('T')[0];
    const query = `
        SELECT * FROM Appointment
        WHERE clientid = $1 AND date >= $2
    ORDER BY date ASC, starttime ASC
    LIMIT $3
    `;
  const res = await db.query(query, [clientId, currentDate, limit]);
  return res.rows;
}

module.exports = {
    createAppointment,
    getAppointmentById,
    updateAppointment,
    deleteAppointment,
    getAppointmentsByDay,
    getAllAppointmentsByClientId,
    findAppointmentByClientAndTime,
    findAndUpdateAppointmentByAcuityId,
    getUpcomingAppointments
};