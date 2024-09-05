const dbUtils = require('./dbUtils');

async function addClientMedia(clientId, mediaUrl, mediaType, thumbnailUrl) {
  const db = dbUtils.getDB();
  const sql = `
    INSERT INTO client_media (client_id, media_url, media_type, thumbnail_url)
    VALUES ($1, $2, $3, $4)
    RETURNING id, media_url, media_type, thumbnail_url, created_at
  `;
  const values = [clientId, mediaUrl, mediaType, thumbnailUrl];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error adding client media:', err.message);
    throw err;
  }
}

async function getClientMedia(clientId) {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM client_media WHERE client_id = $1 ORDER BY created_at DESC';
  const values = [clientId];
  try {
    const res = await db.query(sql, values);
    return res.rows;
  } catch (err) {
    console.error('Error fetching client media:', err.message);
    throw err;
  }
}

async function deleteClientMedia(mediaId) {
  const db = dbUtils.getDB();
  const sql = 'DELETE FROM client_media WHERE id = $1 RETURNING *';
  const values = [mediaId];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error deleting client media:', err.message);
    throw err;
  }
}

module.exports = {
  addClientMedia,
  getClientMedia,
  deleteClientMedia
};