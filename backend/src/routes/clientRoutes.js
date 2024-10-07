const express = require('express');
const router = express.Router();
const { getClients, addClient, searchClients, delClient, getSuggestedFollowUps, clientIDGet, updateTheClient, daysSinceLastAppointment, updateClientOutreachDateController, updateClientAutoRespondController, getClientAutoRespondController } = require('../controllers/clientsController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/clients', authenticateToken, getClients);
router.post('/clients', authenticateToken, addClient);
router.get('/clients/search', authenticateToken, searchClients);
router.delete('/clients/:id', authenticateToken, delClient);
router.get('/clients/suggested-followup/:days', authenticateToken, getSuggestedFollowUps);
router.get('/clients/:id', authenticateToken, clientIDGet);
router.put('/clients/:id', authenticateToken, updateTheClient);
router.get('/clients/days-since-last-appointment/:id', authenticateToken, daysSinceLastAppointment);
router.put('/clients/outreach-date/:id', authenticateToken, updateClientOutreachDateController);
router.put('/clients/auto-respond/:id', authenticateToken, updateClientAutoRespondController);
router.get('/clients/auto-respond/:id', authenticateToken, getClientAutoRespondController);

module.exports = router;