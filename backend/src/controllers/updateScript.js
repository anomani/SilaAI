const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });

async function updateDaysSinceLastAppointment() {
    const client = new MongoClient(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        const db = client.db('Uzi');
        const clientCollection = db.collection('Client');

        const cursor = clientCollection.find({});

        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            let daysSinceLastAppointment = parseInt(doc.daysSinceLastAppointment, 10);

            if (isNaN(daysSinceLastAppointment)) {
                daysSinceLastAppointment = 0;
            }

            await clientCollection.updateOne(
                { _id: doc._id },
                { $set: { daysSinceLastAppointment: daysSinceLastAppointment } }
            );
        }

        console.log('Update complete');
    } catch (error) {
        console.error('Error updating documents:', error);
    } finally {
        await client.close();
    }
}

updateDaysSinceLastAppointment();