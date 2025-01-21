const dbUtils = require('./dbUtils');

async function addNote(clientId, content) {
    const db = dbUtils.getDB();
    const sql = `
        INSERT INTO Notes (clientId, content)
        VALUES ($1, $2)
        RETURNING id, clientId, content, createdAt
    `;
    const values = [clientId, content];
    
    try {
        const res = await db.query(sql, values);
        if (!res || !res.rows || res.rows.length === 0) {
            throw new Error('Failed to create note in database');
        }
        return res.rows[0];
    } catch (err) {
        console.error('Database error adding note:', err.message);
        throw new Error(`Failed to add note: ${err.message}`);
    }
}

async function getNotesByClientId(clientId) {
    const db = dbUtils.getDB();
    const sql = 'SELECT * FROM Notes WHERE clientId = $1 ORDER BY createdAt DESC';

    const values = [clientId];
    try {
        const res = await db.query(sql, values);
        console.log('Fetched notes:', res.rows);    
        return res.rows;
    } catch (err) {
        console.error('Error fetching notes:', err.message);
        throw err;
    }
}

async function updateNote(noteId, content) {
    const db = dbUtils.getDB();
    const sql = `
        UPDATE Notes 
        SET content = $1, updatedAt = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, content, createdAt, updatedAt
    `;
    const values = [content, noteId];
    try {
        const res = await db.query(sql, values);
        if (res.rows.length === 0) {
            throw new Error('Note not found');
        }
        return res.rows[0];
    } catch (err) {
        console.error('Error updating note:', err.message);
        throw err;
    }
}

async function deleteNote(noteId) {
    const db = dbUtils.getDB();
    const sql = 'DELETE FROM Notes WHERE id = $1 RETURNING id';
    const values = [noteId];
    try {
        const res = await db.query(sql, values);
        if (res.rows.length === 0) {
            throw new Error('Note not found');
        }
        return res.rows[0];
    } catch (err) {
        console.error('Error deleting note:', err.message);
        throw err;
    }
}

module.exports = {
    addNote,
    getNotesByClientId,
    updateNote,
    deleteNote
};
