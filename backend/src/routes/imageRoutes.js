const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadClientMedia, getClientMediaController, deleteClientMediaController } = require('../controllers/clientMediaController');

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // limit file size to 50MB
  },
});

// Route for uploading client media (images and videos)
router.post('/upload/:clientId', upload.array('media', 5), uploadClientMedia);

// Route for getting client media
router.get('/:clientId', getClientMediaController);

// Route for deleting a client media item
router.delete('/:mediaId', deleteClientMediaController);

module.exports = router;