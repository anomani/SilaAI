const { getAllClients } = require('../model/clients');
const dbUtils = require('../model/dbUtils');


async function getClients(req, res) {
    try {
        await dbUtils.connect();
        const clients = await getAllClients();
        await dbUtils.closeMongoDBConnection();
        res.status(200).json(clients);
    } catch (error) {
        res.status(500).send(`Error fetching clients: ${error.message}`);
    }
}


module.exports = { getClients };