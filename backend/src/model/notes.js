const dbUtils = require('./dbUtils');

async function addNote(clientId, content) {
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Notes (clientId, content)
        VALUES ($1, $2)
        RETURNING id, content, createdAt
    `;
    const values = [clientId, content];
    try {
        const res = await db.query(sql, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error adding note:', err.message);
        throw err;
    }
}

async function getNotesByClientId(clientId) {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Notes WHERE clientId = $1 ORDER BY createdAt DESC';
    const values = [clientId];
    try {
        const res = await db.query(sql, values);
        return res.rows;
    } catch (err) {
        console.error('Error fetching notes:', err.message);
        throw err;
    }
}

module.exports = {
    addNote,
    getNotesByClientId
};
