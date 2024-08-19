const dbUtils = require('./dbUtils');

async function createAppointment(appointmentType, acuityId, date, startTime, endTime, clientId, details, price, paid, tipAmount, paymentMethod, addOns) {
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Appointment (appointmentType, acuityId, date, startTime, endTime, clientId, details, price, paid, tipAmount, paymentMethod, addOns)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
    `;
    const values = [appointmentType, acuityId, date, startTime, endTime, clientId, details, price, paid, tipAmount, paymentMethod, addOns];
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
//     await createAppointment('Adult Cut', 0, '2024-08-03', '14:00', '14:30', 3504, 'Adult Cut', 55);
//     await createAppointment('Adult Cut', 0, '2023-07-27', '14:00', '15:00', 3504, 'test', 55);

//     await createAppointment('Adult Cut', 0, '2022-07-27', '14:00', '15:00', 3504, 'test', 55);

//     await createAppointment('Adult Cut', 0, '2021-07-27', '14:00', '15:00', 3504, 'test', 55);
//     await createAppointment('Adult Cut', 0, '2020-07-27', '14:00', '15:00', 3504, 'test', 55);
//     await createAppointment('Adult Cut', 0, '2019-07-27', '14:00', '15:00', 3504, 'test', 55);

//     await createAppointment('Adult Cut', 0, '2018-07-27', '14:00', '15:00', 3504, 'test', 55);

// }

// main();

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
    const sql = `
        SELECT * FROM Appointment 
        WHERE date = $1 
        ORDER BY startTime
    `;
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
    const params = [updateData.appointmentType, updateData.date, updateData.startTime, updateData.endTime, updateData.clientId, updateData.details, updateData.price, acuityId];
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
    console.log(currentDate)
    const query = `
        SELECT * FROM Appointment
        WHERE clientid = $1 AND date >= $2
    ORDER BY date ASC, starttime ASC
    LIMIT $3
    `;
  const res = await db.query(query, [clientId, currentDate, limit]);
  console.log(res.rows)
  return res.rows;
}

// async function main() {
//     await getUpcomingAppointments(3367,1);
// }

// main();


async function createBlockedTime(date, startTime, endTime, reason) {
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Appointment (appointmentType, date, startTime, endTime, details, clientId, price)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    `;
    const values = ['BLOCKED_TIME', date, startTime, endTime, reason, null, 0];
    try {
        const res = await db.query(sql, values);
        console.log('Blocked time created with ID:', res.rows[0].id);
        return res.rows[0].id;
    } catch (err) {
        console.error('Error creating blocked time:', err.message);
        throw err;
    }
}

async function getClientAppointmentsAroundCurrent(clientId, currentAppointmentId, limit = 2) {
    const db = dbUtils.getDB();
    const query = `
        WITH current_appointment AS (
            SELECT date, startTime FROM Appointment WHERE id = $1
        )
        SELECT * FROM (
            (SELECT * FROM Appointment 
             WHERE clientId = $2 AND (date < (SELECT date FROM current_appointment) 
                                      OR (date = (SELECT date FROM current_appointment) AND startTime < (SELECT startTime FROM current_appointment)))
             ORDER BY date DESC, startTime DESC
             LIMIT $3)
            UNION ALL
            (SELECT * FROM Appointment WHERE id = $1)
            UNION ALL
            (SELECT * FROM Appointment 
             WHERE clientId = $2 AND (date > (SELECT date FROM current_appointment) 
                                      OR (date = (SELECT date FROM current_appointment) AND startTime > (SELECT startTime FROM current_appointment)))
             ORDER BY date ASC, startTime ASC
             LIMIT $3)
        ) AS combined_appointments
        ORDER BY date ASC, startTime ASC;
    `;
    const values = [currentAppointmentId, clientId, limit];
    try {
        const res = await db.query(query, values);
        return res.rows;
    } catch (err) {
        console.error('Error fetching client appointments:', err.message);
        throw err;
    }
}

async function updateAppointmentPayment(appointmentId, paid, tipAmount, paymentMethod) {
    const db = dbUtils.getDB();
    const sql = `
        UPDATE Appointment
        SET paid = $1, tipAmount = $2, paymentMethod = $3
        WHERE id = $4
        RETURNING *
    `;
    const values = [paid, tipAmount, paymentMethod, appointmentId];
    try {
        const res = await db.query(sql, values);
        console.log('Appointment payment updated:', res.rows[0]);
        return res.rows[0];
    } catch (err) {
        console.error('Error updating appointment payment:', err.message);
        throw err;
    }
}

async function getUnpaidAppointmentsByDate(date) {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Appointment WHERE date = $1 AND paid = false';
    const values = [date];
    try {
        const res = await db.query(sql, values);
        return res.rows;
    } catch (err) {
        console.error('Error fetching unpaid appointments:', err.message);
        throw err;
    }
}


async function rescheduleAppointment(appointmentId, newDate, newStartTime, newEndTime) {
    const db = dbUtils.getDB();
    const sql = `
        UPDATE Appointment
        SET date = $1, startTime = $2, endTime = $3
        WHERE id = $4
        RETURNING *
    `;
    const values = [newDate, newStartTime, newEndTime, appointmentId];
    try {
        const res = await db.query(sql, values);
        if (res.rows.length === 0) {
            console.log(`No appointment found with ID: ${appointmentId}`);
            return null;
        }
        console.log(`Appointment Rescheduled: ID ${appointmentId}`);
        return res.rows[0];
    } catch (err) {
        console.error('Error rescheduling appointment:', err.message);
        throw err;
    }
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
    getUpcomingAppointments,
    createBlockedTime,
    getClientAppointmentsAroundCurrent,
    updateAppointmentPayment,
    getUnpaidAppointmentsByDate,
    rescheduleAppointment
};