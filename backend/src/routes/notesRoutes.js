const express = require('express');
const router = express.Router();
const { createNote, getClientNotes, updateClientNote, deleteClientNote } = require('../controllers/notesController');

// Route to create a new note
router.post('/', createNote);

// Route to get all notes for a specific client
router.get('/:clientId', getClientNotes);

// New routes for updating and deleting notes
router.put('/:noteId', updateClientNote);
router.delete('/:noteId', deleteClientNote);

module.exports = router;