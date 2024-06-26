const dbUtils = require('../../model/dbUtils');

async function getInfo(query) {
    const db = dbUtils.getDB();
    try {
        const res = await db.query(query);
        return res.rows;
    } catch (err) {
        console.error('Error fetching client by phone number:', err.message);
        throw err;
    }
}



module.exports = { getInfo };