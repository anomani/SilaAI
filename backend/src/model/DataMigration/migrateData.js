const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const dotenv = require('dotenv');
const { createClient } = require('../clients');

dotenv.config({path : '../../../.env'});

const csvFilePaths = {
    client: path.join(__dirname, 'client.csv'),
    // ... other paths if needed
};

const readCSV = (filePath, insertFunction) => {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                rows.push(row); 
            })
            .on('end', async () => {
                console.log(`${filePath} file successfully processed`);
                try {
                    for (const row of rows) {
                        if (row.daysSinceLastAppointment === '') {
                            row.daysSinceLastAppointment = 0;
                        }
                        await insertFunction(row);
                    }
                    resolve();
                } catch (err) {
                    reject(err);
                }
            })
            .on('error', (err) => {
                reject(err);
            });
    });
};

const insertClient = async (clientData) => {
    console.log(clientData);
    try {
        const firstName = clientData['First Name'];
        const lastName = clientData['Last Name'];
        const phoneNumber = clientData['Phone'];
        const email = clientData['Email'];
        const notes = clientData['Notes'];
        const daysSinceLastAppointment = parseInt(clientData['Days Since Last Appointment']) || 0;

        const clientId = await createClient(
            firstName,
            lastName,
            phoneNumber,
            email,
            notes,
            67,
            daysSinceLastAppointment
        );
        console.log(`Successfully inserted client with id: ${clientId}`);
    } catch (error) {
        console.error(`Error inserting client:`, error.message);
        throw error;
    }
};

async function migrateData() {
    try {
        await readCSV(csvFilePaths.client, insertClient);
        // ... other migrations if needed
        console.log('Data migration completed');
    } catch (err) {
        console.error('Error during data migration', err.message);
    }
}

migrateData();
