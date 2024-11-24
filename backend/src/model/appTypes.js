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

async function getCompatibleAddOns(userId, appointmentTypeId) {
  const db = dbUtils.getDB();
  const sql = `
    SELECT 
      a.id, 
      a.name, 
      a.price, 
      a.duration
    FROM 
      AddOns a
    WHERE 
      a.user_id = $1 AND
      $2::integer = ANY(a.compatible_appointment_types)
  `;
  const values = [userId, appointmentTypeId];
  try {
    const res = await db.query(sql, values);
    return res.rows;
  } catch (err) {
    console.error('Error fetching compatible add-ons:', err.message);
    throw err;
  }
}

async function getAppointmentTypeByIdFromDB(userId, appointmentTypeId) {
  const db = dbUtils.getDB();
  const sql = 'SELECT * FROM AppointmentTypes WHERE user_id = $1 AND id = $2';
  const values = [userId, appointmentTypeId];
  try {
    const res = await db.query(sql, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error fetching appointment type by ID:', err.message);
    throw err;
  }
}

async function getAppointmentTypeDetails(userId, appointmentTypeId, addOnIds) {
  const db = dbUtils.getDB();
  const appointmentTypeSql = 'SELECT * FROM AppointmentTypes WHERE user_id = $1 AND id = $2';
  const addOnsSql = 'SELECT * FROM AddOns WHERE user_id = $1 AND id = ANY($2)';
  
  try {
    const appointmentTypeRes = await db.query(appointmentTypeSql, [userId, appointmentTypeId]);
    const appointmentType = appointmentTypeRes.rows[0];

    if (!appointmentType) {
      throw new Error('Appointment type not found');
    }

    let totalPrice = appointmentType.price;
    let addOns = [];

    if (addOnIds && addOnIds.length > 0) {
      const addOnsRes = await db.query(addOnsSql, [userId, addOnIds]);
      addOns = addOnsRes.rows;
      totalPrice += addOns.reduce((sum, addOn) => sum + addOn.price, 0);
    }

    return {
      appointmentType,
      addOns,
      totalPrice
    };
  } catch (err) {
    console.error('Error fetching appointment type details:', err.message);
    throw err;
  }
}

async function getAppointmentTypeAndAddOnNames(userId, appointmentTypeId, addOnIds) {
  const db = dbUtils.getDB();
  const appointmentTypeSql = 'SELECT name FROM AppointmentTypes WHERE user_id = $1 AND id = $2';
  const addOnsSql = 'SELECT name FROM AddOns WHERE user_id = $1 AND id = ANY($2)';
  
  try {
    const appointmentTypeRes = await db.query(appointmentTypeSql, [userId, appointmentTypeId]);
    const appointmentTypeName = appointmentTypeRes.rows[0]?.name;

    if (!appointmentTypeName) {
      throw new Error('Appointment type not found');
    }

    let addOnNames = [];
    if (addOnIds && addOnIds.length > 0) {
      const addOnsRes = await db.query(addOnsSql, [userId, addOnIds]);
      addOnNames = addOnsRes.rows.map(row => row.name);
    }

    return {
      appointmentTypeName,
      addOnNames
    };
  } catch (err) {
    console.error('Error fetching appointment type and add-on names:', err.message);
    throw err;
  }
}

async function updateAppointmentType(userId, appointmentTypeId, updates) {
  const db = dbUtils.getDB();
  const validFields = ['name', 'duration', 'price', 'availability'];
  const updateFields = Object.keys(updates).filter(key => validFields.includes(key));
  
  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  const setClause = updateFields.map((field, index) => {
    if (field === 'availability') {
      return `${field} = $${index + 2}::jsonb`;
    }
    return `${field} = $${index + 2}`;
  }).join(', ');

  const sql = `
    UPDATE AppointmentTypes 
    SET ${setClause}
    WHERE id = $1 AND user_id = $${updateFields.length + 2}
    RETURNING *
  `;

  const values = [
    appointmentTypeId,
    ...updateFields.map(field => updates[field]),
    userId
  ];

  try {
    const res = await db.query(sql, values);
    if (res.rows.length === 0) {
      throw new Error('Appointment type not found or unauthorized');
    }
    return res.rows[0];
  } catch (err) {
    console.error('Error updating appointment type:', err.message);
    throw err;
  }
}

module.exports = {
  getAppointmentTypes,
  getAddOns,
  storeAppointmentType,
  storeAddOn,
  deleteAppointmentType,
  deleteAddOn,
  getCompatibleAddOns,
  getAppointmentTypeByIdFromDB,
  getAppointmentTypeDetails,
  getAppointmentTypeAndAddOnNames,
  updateAppointmentType
};
