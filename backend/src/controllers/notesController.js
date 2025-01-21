const { addNote, getNotesByClientId, updateNote, deleteNote } = require('../model/notes');

const createNote = async (req, res) => {
    try {
        const { clientId, content } = req.body;
        
        // Validate input
        if (!clientId || !content) {
            return res.status(400).json({ 
                error: 'Client ID and content are required',
                details: {
                    clientId: !clientId ? 'Client ID is required' : null,
                    content: !content ? 'Content is required' : null
                }
            });
        }

        // Trim content and check if it's empty
        const trimmedContent = content.trim();
        if (!trimmedContent) {
            return res.status(400).json({ 
                error: 'Note content cannot be empty' 
            });
        }

        const note = await addNote(clientId, trimmedContent);
        
        if (!note) {
            return res.status(500).json({ 
                error: 'Failed to create note' 
            });
        }

        res.status(201).json(note);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ 
            error: 'Error creating note',
            details: error.message 
        });
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

const updateClientNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const { content } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const updatedNote = await updateNote(noteId, content);
        res.status(200).json(updatedNote);
    } catch (error) {
        console.error('Error updating note:', error);
        if (error.message === 'Note not found') {
            res.status(404).json({ error: 'Note not found' });
        } else {
            res.status(500).json({ error: 'Error updating note' });
        }
    }
};

const deleteClientNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        await deleteNote(noteId);
        res.status(200).json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        if (error.message === 'Note not found') {
            res.status(404).json({ error: 'Note not found' });
        } else {
            res.status(500).json({ error: 'Error deleting note' });
        }
    }
};

module.exports = {
    createNote,
    getClientNotes,
    updateClientNote,
    deleteClientNote
};
