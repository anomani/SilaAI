const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const dbUtils = require('./dbUtils');
dotenv.config({ path: '../../.env' });


/*
## Appointments

- Appointment Id
- Type
- Client Id
- Date
- Start Time
- End Time
*/


async function createAppointment(appointmentType, date, startTime, endTime, clientId, details) {
    const db = await dbUtils.getDB()
    const appointmentCollection = db.collection('Appointment')
    const newAppointment = {
        appointmentType: appointmentType,
        clientId: clientId,
        date: date,
        startTime: startTime,
        endTime: endTime,
        details: details
    }
    const result = await appointmentCollection.insertOne(newAppointment);
    
    // Reset daysSinceLastAppointment for the client
    await db.collection('Client').updateOne(
        { _id: new ObjectId(clientId) },
        { $set: { daysSinceLastAppointment: 0 } }
    );
    
    await dbUtils.closeMongoDBConnection()
    return result;
}

async function getAppointmentById(appointmentId) {
    const db = await dbUtils.getDB();
    const appointmentCollection = db.collection('Appointment');
    const appointment = await appointmentCollection.findOne({ _id: new ObjectId(appointmentId) });
    await dbUtils.closeMongoDBConnection()
    return appointment;
}

async function updateAppointment(appointmentId, updateData) {
  const db = await dbUtils.getDB();
  const appointmentCollection = db.collection('Appointment');
  const result = await appointmentCollection.findOneAndUpdate(
    { _id: new ObjectId(appointmentId) },
    { $set: updateData },
    { returnOriginal: false }
  );
  await dbUtils.closeMongoDBConnection()
  return result.value;
}

async function deleteAppointment(appointmentId) {
  const db = await dbUtils.getDB();
  const appointmentCollection = db.collection('Appointment');
  const result = await appointmentCollection.findOneAndDelete({ _id: new ObjectId(appointmentId) });
  await dbUtils.closeMongoDBConnection()
  return result.value;
}

async function getAppointmentsByDay(date) {
    const db = await dbUtils.getDB();
    const appointmentCollection = db.collection('Appointment');
    const appointments = await appointmentCollection.find({ date }).toArray();
    await dbUtils.closeMongoDBConnection()
    return appointments;
}

async function getAllAppointmentsByClientId(clientId) {
    const db = await dbUtils.getDB();
    const appointmentCollection = db.collection('Appointment');
    const appointments = await appointmentCollection.find({ clientId: clientId }).toArray();
    await dbUtils.closeMongoDBConnection();
    return appointments;
}




module.exports = {
  createAppointment,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  getAppointmentsByDay,
  getAllAppointmentsByClientId
};


