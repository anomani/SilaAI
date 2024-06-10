const fs = require('fs');
const path = require('path');
const { createClient } = require('../model/clients');
const dbUtils = require('../model/dbUtils');

async function migrateData() {
    const csvFilePath = path.join(__dirname, 'list.csv');
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    const lines = csvData.split('\n'); // Process all lines

    try {
        for (const line of lines) {
            if (line.trim() === '') continue; // Skip empty lines
            const [firstName, lastName, number, email, notes, daysSinceLastAppointment] = line.split(',').map(item => item.replace(/"/g, '').trim());

            try {
                await dbUtils.connect();
                await createClient(firstName, lastName, number, email, daysSinceLastAppointment, notes);
                console.log(`Successfully added client: ${firstName} ${lastName}`);
                await dbUtils.closeMongoDBConnection();
            } catch (error) {
                console.error(`Failed to add client: ${firstName} ${lastName}. Error: ${error.message}`);
            }
        }
    } catch (error) {
        console.error(`Failed to migrate data. Error: ${error.message}`);
    }
}



migrateData().catch(console.error);
