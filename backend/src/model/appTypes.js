const dbUtils = require('./dbUtils');

async function getAppointmentTypes(userId) {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM AppointmentTypes WHERE user_id = $1';
  const values = [userId];
  try {
    const res = await db.query(sql, values);
    return res.rows;
  } catch (err) {
    console.error('Error fetching appointment types:', err.message);
    throw err;
  }
}

async function getAddOns(userId) {
  const db = dbUtils.getDB();
  const sql = `
    SELECT 
      a.id, 
      a.name, 
      a.price, 
      a.duration, 
      array_agg(at.name) AS compatible_appointment_types
    FROM 
      AddOns a
    LEFT JOIN 
      unnest(a.compatible_appointment_types) AS cat(id)
    ON 
      true
    LEFT JOIN 
      AppointmentTypes at
    ON 
      at.id = cat.id::integer AND at.user_id = a.user_id
    WHERE 
      a.user_id = $1
    GROUP BY 
      a.id, a.name, a.price, a.duration
  `;
  const values = [userId];
  try {
    const res = await db.query(sql, values);
    return res.rows;
  } catch (err) {
    console.error('Error fetching add-ons:', err.message);
    throw err;
  }
}

async function storeAppointmentType(userId, appointmentType) {
  const db = dbUtils.getDB();
  const sql = `
    INSERT INTO AppointmentTypes (id, name, price, duration, group_number, availability, user_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id, user_id) DO UPDATE SET 
    name = $2, price = $3, duration = $4, group_number = $5, availability = $6, 
    updated_at = CURRENT_TIMESTAMP
  `;
  const values = [
    appointmentType.id,
    appointmentType.name,
    appointmentType.price,
    appointmentType.duration,
    appointmentType.group_number,
    appointmentType.availability,
    userId
  ];
  try {
    await db.query(sql, values);
    console.log(`Appointment type stored for user ${userId}`);
  } catch (err) {
    console.error('Error storing appointment type:', err.message);
    throw err;
  }
}

async function storeAddOn(userId, addOn) {
  const db = dbUtils.getDB();
  const sql = `
    INSERT INTO AddOns (id, name, price, duration, compatible_appointment_types, user_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id, user_id) DO UPDATE SET 
    name = $2, price = $3, duration = $4, compatible_appointment_types = $5, 
    updated_at = CURRENT_TIMESTAMP
  `;
  const values = [
    addOn.id,
    addOn.name,
    addOn.price,
    addOn.duration,
    addOn.compatible_appointment_types,
    userId
  ];
  try {
    await db.query(sql, values);
    console.log(`Add-on stored for user ${userId}`);
  } catch (err) {
    console.error('Error storing add-on:', err.message);
    throw err;
  }
}

async function deleteAppointmentType(userId, appointmentTypeId) {
  const db = dbUtils.getDB();
  const sql = 'DELETE FROM AppointmentTypes WHERE id = $1 AND user_id = $2';
  const values = [appointmentTypeId, userId];
  try {
    const res = await db.query(sql, values);
    console.log(`Appointment type deleted for user ${userId}`);
    return res.rowCount > 0; // Returns true if a row was deleted, false otherwise
  } catch (err) {
    console.error('Error deleting appointment type:', err.message);
    throw err;
  }
}

async function deleteAddOn(userId, addOnId) {
  const db = dbUtils.getDB();
  const sql = 'DELETE FROM AddOns WHERE id = $1 AND user_id = $2';
  const values = [addOnId, userId];
  try {
    const res = await db.query(sql, values);
    console.log(`Add-on deleted for user ${userId}`);
    return res.rowCount > 0; // Returns true if a row was deleted, false otherwise
  } catch (err) {
    console.error('Error deleting add-on:', err.message);
    throw err;
  }
}

module.exports = {
  getAppointmentTypes,
  getAddOns,
  storeAppointmentType,
  storeAddOn,
  deleteAppointmentType,
  deleteAddOn
};