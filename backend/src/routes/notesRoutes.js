const express = require('express');
const router = express.Router();
const { createNote, getClientNotes } = require('../controllers/notesController');

// Route to create a new note
router.post('/', createNote);

// Route to get all notes for a specific client
router.get('/:clientId', getClientNotes);

module.exports = router;