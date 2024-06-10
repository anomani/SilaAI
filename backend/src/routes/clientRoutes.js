const express = require('express');
const router = express.Router();
const { getClients, addClient, searchClients, delClient, getSuggestedFollowUps, clientIDGet } = require('../controllers/clientsController');

router.get('/clients', getClients);
router.post('/clients', addClient);
router.get('/clients/search', searchClients);
router.delete('/clients/:id', delClient); // Added this route
router.get('/clients/suggested-followup/:days', getSuggestedFollowUps);
router.get('/clients/:id', clientIDGet);

module.exports = router;

