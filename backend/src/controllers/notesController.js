const { addNote, getNotesByClientId } = require('../model/notes');

const createNote = async (req, res) => {
    try {
        const { clientId, content } = req.body;
        if (!clientId || !content) {
            return res.status(400).json({ error: 'Client ID and content are required' });
        }
        const note = await addNote(clientId, content);
        res.status(201).json(note);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Error creating note' });
    }
};

const getClientNotes = async (req, res) => {
    try {
        const { clientId } = req.params;
        if (!clientId) {
            return res.status(400).json({ error: 'Client ID is required' });
        }
        const notes = await getNotesByClientId(clientId);
        res.status(200).json(notes);
    } catch (error) {
        console.error('Error fetching client notes:', error);
        res.status(500).json({ error: 'Error fetching client notes' });
    }
};

module.exports = {
    createNote,
    getClientNotes
};
