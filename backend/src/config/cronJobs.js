const cron = require('node-cron');
const dbUtils = require('../model/dbUtils');
const { ObjectId } = require('mongodb');

cron.schedule('0 0 * * *', async () => {
    try {
        const db = await dbUtils.getDB();
        await dbUtils.connect();
        await db.collection('Client').updateMany(
            {},
            { $inc: { daysSinceLastAppointment: 1 } }
        );
        await dbUtils.closeMongoDBConnection();
        console.log('Updated daysSinceLastAppointment for all clients');
    } catch (error) {
        console.error('Error updating daysSinceLastAppointment:', error);
    }
});
