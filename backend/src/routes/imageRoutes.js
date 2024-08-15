const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadClientImages, getClientImagesController, deleteClientImageController } = require('../controllers/clientImagesController');

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // limit file size to 5MB
  },
});

// Route for uploading client images
router.post('/upload/:clientId', upload.array('images', 5), uploadClientImages);

// Route for getting client images
router.get('/:clientId', getClientImagesController);

// Route for deleting a client image
router.delete('/:imageId', deleteClientImageController);

module.exports = router;