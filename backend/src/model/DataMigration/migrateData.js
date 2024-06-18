const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('../clients');

const csvFilePath = path.join(__dirname, 'list (1).csv');

async function migrateData() {
    const clients = [];

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
            clients.push(row);
        })
        .on('end', async () => {
            console.log('CSV file successfully processed');
            for (const client of clients) {
                try {
                    await createClient(
                        client['First Name'],
                        client['Last Name'],
                        client['Phone'],
                        client['Email'],
                        client['Days Since Last Appointment'],
                        client['Notes']
                    );
                    console.log(`Client ${client['First Name']} ${client['Last Name']} added successfully`);
                } catch (error) {
                    console.error(`Error adding client ${client['First Name']} ${client['Last Name']}:`, error.message);
                }
            }
            console.log('Data migration completed');
        });
}

migrateData();
