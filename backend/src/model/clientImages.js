const dbUtils = require('./dbUtils');

async function addClientImage(clientId, imageUrl) {
  const db = dbUtils.getDB();
  const sql = `
    INSERT INTO client_images (client_id, image_url)
    VALUES ($1, $2)
    RETURNING id, image_url, created_at
  `;
  const values = [clientId, imageUrl];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error adding client image:', err.message);
    throw err;
  }
}

async function getClientImages(clientId) {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM client_images WHERE client_id = $1 ORDER BY created_at DESC';
  const values = [clientId];
  try {
    const res = await db.query(sql, values);
    return res.rows;
  } catch (err) {
    console.error('Error fetching client images:', err.message);
    throw err;
  }
}

module.exports = {
  addClientImage,
  getClientImages
};