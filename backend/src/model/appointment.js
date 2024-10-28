const dbUtils = require('./dbUtils');

async function createAppointment(appointmentType, acuityId, date, startTime, endTime, clientId, details, price, paid, tipAmount, paymentMethod, addOns, userId) {
    console.log('[createAppointment] userId:', userId);
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Appointment (appointmentType, acuityId, date, startTime, endTime, clientId, details, price, paid, tipAmount, paymentMethod, addOns, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
    `;
    const values = [appointmentType, acuityId, date, startTime, endTime, clientId, details, price, paid, tipAmount, paymentMethod, addOns, userId];
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
//     await createAppointment('Adult Cut', 0, '2023-09-26', '12:45', '13:15', 3670, 'Adult Cut', 55);
// //     // await createAppointment('Adult Cut', 0, '2023-07-27', '14:00', '15:00', 3670, 'test', 55);

// //     // await createAppointment('Adult Cut', 0, '2022-07-27', '14:00', '15:00', 3670, 'test', 55);

// //     // await createAppointment('Adult Cut', 0, '2021-07-27', '14:00', '15:00', 3670, 'test', 55);
// //     // await createAppointment('Adult Cut', 0, '2020-07-27', '14:00', '15:00', 3670, 'test', 55);
// //     // await createAppointment('Adult Cut', 0, '2019-07-27', '14:00', '15:00', 3670, 'test', 55);

// //     // await createAppointment('Adult Cut', 0, '2018-07-27', '14:00', '15:00', 3670, 'test', 55);

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

async function getAppointmentsByDay(userId, date) {
    console.log('[getAppointmentsByDay] userId:', userId);
    const db = dbUtils.getDB();
    const sql = `
        SELECT * FROM Appointment 
        WHERE date = $1 AND user_id = $2
        ORDER BY startTime
    `;
    const values = [date, userId];
    try {
        const res = await db.query(sql, values);
        return res.rows;
    } catch (err) {
        console.error('Error fetching appointments by day:', err.message);
        throw err;
    }
}

async function getAllAppointmentsByClientId(clientId, userId) {
    console.log('[getAllAppointmentsByClientId] userId:', userId);
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Appointment WHERE clientId = $1 AND user_id = $2 ORDER BY date DESC';
    const values = [clientId, userId];
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

async function getUpcomingAppointments(clientId, limit = 5, userId) {
    console.log('[getUpcomingAppointments] userId:', userId);
    const db = dbUtils.getDB();
    const currentDate = new Date().toISOString().split('T')[0];
    console.log(currentDate)
    const query = `
        SELECT * FROM Appointment
        WHERE clientid = $1 AND date >= $2 AND user_id = $3
        ORDER BY date ASC, starttime ASC
        LIMIT $4
    `;
    const res = await db.query(query, [clientId, currentDate, userId, limit]);
    console.log(res.rows)
    return res.rows;
}

// async function main() {
//     await getUpcomingAppointments(3367,1);
// }

// main();


async function createBlockedTime(date, startTime, endTime, reason, userId) {
    console.log('[createBlockedTime] userId:', userId);
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Appointment (appointmentType, date, startTime, endTime, details, clientId, price, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    `;
    const values = ['BLOCKED_TIME', date, startTime, endTime, reason, null, 0, userId];
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

async function getUnpaidAppointmentsByDate(date, userId) {
    console.log('[getUnpaidAppointmentsByDate] userId:', userId);
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Appointment WHERE date = $1 AND paid = false AND user_id = $2';
    const values = [date, userId];
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

async function getAppointmentMetrics(userId) {
  const db = dbUtils.getDB();
  const metrics = {};
  try {
    console.log("Starting to fetch appointment metrics for userId:", userId);

    // Total number of appointments
    const totalAppointmentsQuery = 'SELECT COUNT(*) FROM Appointment WHERE user_id = $1';
    const totalAppointmentsResult = await db.query(totalAppointmentsQuery, [userId]);
    metrics.totalAppointments = parseInt(totalAppointmentsResult.rows[0].count);
    console.log("Total appointments:", metrics.totalAppointments);

    // Appointments per day (last 30 days)
    const appointmentsPerDayQuery = `
      SELECT date, COUNT(*) as count
      FROM Appointment
      WHERE user_id = $1 AND TO_DATE(date, 'YYYY-MM-DD') >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date
    `;
    const appointmentsPerDayResult = await db.query(appointmentsPerDayQuery, [userId]);
    metrics.appointmentsPerDay = appointmentsPerDayResult.rows;
    console.log("Appointments per day:", metrics.appointmentsPerDay);

    // Distribution of appointment types
    const appointmentTypeDistributionQuery = `
      SELECT appointmenttype, COUNT(*) as count
      FROM Appointment
      WHERE user_id = $1
      GROUP BY appointmenttype
      ORDER BY count DESC
    `;
    const appointmentTypeDistributionResult = await db.query(appointmentTypeDistributionQuery, [userId]);
    metrics.appointmentTypeDistribution = appointmentTypeDistributionResult.rows;
    console.log("Appointment type distribution:", metrics.appointmentTypeDistribution);

    // Number of unique clients
    const uniqueClientsQuery = 'SELECT COUNT(DISTINCT clientid) FROM Appointment WHERE user_id = $1';
    const uniqueClientsResult = await db.query(uniqueClientsQuery, [userId]);
    metrics.uniqueClients = parseInt(uniqueClientsResult.rows[0].count);
    console.log("Unique clients:", metrics.uniqueClients);

    // Average appointments per client
    metrics.avgAppointmentsPerClient = metrics.totalAppointments / metrics.uniqueClients;
    console.log("Average appointments per client:", metrics.avgAppointmentsPerClient);

    // Most frequent clients (top 5)
    const frequentClientsQuery = `
      SELECT clientid, COUNT(*) as appointment_count
      FROM Appointment
      WHERE user_id = $1
      GROUP BY clientid
      ORDER BY appointment_count DESC
      LIMIT 5
    `;
    const frequentClientsResult = await db.query(frequentClientsQuery, [userId]);
    metrics.mostFrequentClients = frequentClientsResult.rows;
    console.log("Most frequent clients:", metrics.mostFrequentClients);

    // Total revenue
    const totalRevenueQuery = 'SELECT SUM(price) as total_revenue FROM Appointment WHERE user_id = $1';
    const totalRevenueResult = await db.query(totalRevenueQuery, [userId]);
    metrics.totalRevenue = parseFloat(totalRevenueResult.rows[0].total_revenue) || 0;
    console.log("Total revenue:", metrics.totalRevenue);

    // Average appointment price
    metrics.avgAppointmentPrice = metrics.totalRevenue / metrics.totalAppointments;
    console.log("Average appointment price:", metrics.avgAppointmentPrice);

    // Payment method distribution
    const paymentMethodDistributionQuery = `
      SELECT paymentmethod, COUNT(*) as count
      FROM Appointment
      WHERE user_id = $1 AND paymentmethod IS NOT NULL
      GROUP BY paymentmethod
      ORDER BY count DESC
    `;
    const paymentMethodDistributionResult = await db.query(paymentMethodDistributionQuery, [userId]);
    metrics.paymentMethodDistribution = paymentMethodDistributionResult.rows;
    console.log("Payment method distribution:", metrics.paymentMethodDistribution);

    // Paid vs Unpaid appointments
    const paidVsUnpaidQuery = `
      SELECT paid, COUNT(*) as count
      FROM Appointment
      WHERE user_id = $1
      GROUP BY paid
    `;
    const paidVsUnpaidResult = await db.query(paidVsUnpaidQuery, [userId]);
    metrics.paidVsUnpaid = paidVsUnpaidResult.rows;
    console.log("Paid vs Unpaid appointments:", metrics.paidVsUnpaid);

    // Total tips
    const totalTipsQuery = 'SELECT SUM(tipamount) as total_tips FROM Appointment WHERE user_id = $1 AND tipamount IS NOT NULL';
    const totalTipsResult = await db.query(totalTipsQuery, [userId]);
    metrics.totalTips = parseFloat(totalTipsResult.rows[0].total_tips) || 0;
    console.log("Total tips:", metrics.totalTips);

    // Average tip amount
    const avgTipQuery = 'SELECT AVG(tipamount) as avg_tip FROM Appointment WHERE user_id = $1 AND tipamount IS NOT NULL';
    const avgTipResult = await db.query(avgTipQuery, [userId]);
    metrics.avgTipAmount = parseFloat(avgTipResult.rows[0].avg_tip) || 0;
    console.log("Average tip amount:", metrics.avgTipAmount);

    console.log("Finished fetching all metrics for userId:", userId);
    return metrics;
  } catch (err) {
    console.error('Error fetching appointment metrics:', err);
    throw err;
  }
}

async function getEndingAppointments(currentTime, userId) {
    const db = dbUtils.getDB();
    const currentDate = currentTime.toISOString().split('T')[0];
    const currentTimeString = currentTime.toTimeString().split(' ')[0].slice(0, 5);
    
    const query = `
        SELECT a.*, c.phonenumber, c.firstname, c.lastname
        FROM Appointment a
        JOIN Client c ON a.clientId = c.id
        WHERE a.date = $1 AND a.endTime = $2 AND a.user_id = $3
    `;
    
    const res = await db.query(query, [currentDate, currentTimeString, userId]);
    return res.rows;
}

async function createTestDataForWaitlist() {
    const startDate = '2024-11-01';
    const endDate = '2024-11-10';
    const clientId = 3670; // Using a sample client ID

    let currentDate = new Date(startDate);
    const lastDate = new Date(endDate);

    while (currentDate <= lastDate) {
        const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        console.log(dateString)
        await createAppointment(
            'All day',
            0,
            dateString,
            '09:00',
            '17:00',
            clientId,
            'Test all-day appointment',
            100
        );
        currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('Test data created successfully');
}


// createTestDataForWaitlist();

async function updateAppointmentDetails(appointmentId, updateData) {
    const db = dbUtils.getDB();
    const { date, startTime, endTime, appointmentType, price } = updateData;
    const sql = `
        UPDATE Appointment
        SET date = $1, startTime = $2, endTime = $3, appointmentType = $4, price = $5
        WHERE id = $6
        RETURNING *
    `;
    const values = [date, startTime, endTime, appointmentType, price, appointmentId];
    try {
          const res = await db.query(sql, values);
        if (res.rows.length === 0) {
            console.log(`No appointment found with ID: ${appointmentId}`);
            return null;
        }
        console.log(`Appointment Updated: ID ${appointmentId}`);
        return res.rows[0];
    } catch (err) {
        console.error('Error updating appointment details:', err.message);
        throw err;
    }
}

// Add this to the module.exports
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
    rescheduleAppointment,
    getAppointmentMetrics,
    getEndingAppointments,
    updateAppointmentDetails,
};
