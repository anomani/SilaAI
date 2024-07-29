const express = require('express');
const router = express.Router();
const { getClients, addClient, searchClients, delClient, getSuggestedFollowUps, clientIDGet, updateTheClient, daysSinceLastAppointment, updateClientOutreachDateController, updateClientAutoRespondController, getClientAutoRespondController } = require('../controllers/clientsController');

router.get('/clients', getClients);
router.post('/clients', addClient);
router.get('/clients/search', searchClients);
router.delete('/clients/:id', delClient);
router.get('/clients/suggested-followup/:days', getSuggestedFollowUps);
router.get('/clients/:id', clientIDGet);
router.put('/clients/:id', updateTheClient);
router.get('/clients/days-since-last-appointment/:id', daysSinceLastAppointment);
router.put('/clients/outreach-date/:id', updateClientOutreachDateController);
router.put('/clients/auto-respond/:id', updateClientAutoRespondController);
router.get('/clients/auto-respond/:id', getClientAutoRespondController);

module.exports = router;