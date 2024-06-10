const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const readCSV = (filePath, minDaysSinceLast) => {
    return new Promise((resolve, reject) => {
        const clients = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                const daysSinceLast = parseInt(row['Days Since Last Appointment'], 10);
                if (daysSinceLast >= minDaysSinceLast) {
                    clients.push(row);
                }
            })
            .on('end', () => {
                resolve(clients);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
};

module.exports = {
    readCSV
};
