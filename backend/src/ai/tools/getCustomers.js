/*
I want to get customers that have not visited in the past 60 days.
Show me all the 
*/

const { followUp, getAllClients } = require('../../model/clients');
const dbUtils = require('../../model/dbUtils');

/**
 * Retrieves a list of clients who have not visited in the specified number of days.
 *
 * @param {number} days - The number of days since the last visit to consider a client inactive.
 * @returns {Promise<Array>} A promise that resolves to an array of inactive clients.
 * @throws {Error} If the 'days' parameter is not a valid number.
 */

async function getInactiveClients(days) {
    dbUtils.connect();
    return await followUp(days);
}

async function getClients() {
    dbUtils.connect();
    return await getAllClients();
}

module.exports = { getInactiveClients, getClients };

