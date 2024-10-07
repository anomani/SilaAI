const dbUtils = require('./dbUtils');

async function createWaitlistRequest(clientId, requestType, startDate, endDate, startTime, endTime, appointmentType, user_id) {
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO WaitlistRequest (clientId, requestType, startDate, endDate, startTime, endTime, appointmentType, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    `;
    const values = [clientId, requestType, startDate, endDate, startTime, endTime, appointmentType, user_id];
    try {
        const res = await db.query(sql, values);
        return res.rows[0].id;
    } catch (err) {
        console.error('Error creating waitlist request:', err.message);
        throw err;
    }
}

async function getActiveWaitlistRequests(user_id) {
    const db = dbUtils.getDB();
    const sql = `
        SELECT * FROM WaitlistRequest
        WHERE notified = FALSE AND user_id = $1
    `;
    try {
        const res = await db.query(sql, [user_id]);
        return res.rows;
    } catch (err) {
        console.error('Error fetching active waitlist requests:', err.message);
        throw err;
    }
}

async function markWaitlistRequestAsNotified(id) {
    const db = dbUtils.getDB();
    const sql = `
        UPDATE WaitlistRequest
        SET notified = TRUE
        WHERE id = $1
    `;
    try {
        await db.query(sql, [id]);
    } catch (err) {
        console.error('Error marking waitlist request as notified:', err.message);
        throw err;
    }
}

module.exports = {
    createWaitlistRequest,
    getActiveWaitlistRequests,
    markWaitlistRequestAsNotified
};