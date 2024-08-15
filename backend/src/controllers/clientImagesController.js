const { Storage } = require('@google-cloud/storage');
const path = require('path');
const { addClientImage, getClientImages } = require('../model/clientImages');

const storage = new Storage({
  keyFilename: path.join(__dirname, '../../keys/uzi-app-55428-6ab92ae91fbf.json'),
  projectId: 'uzi-app-55428',
});

const bucket = storage.bucket('uzi-bucket-images');

async function uploadClientImages(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('No files uploaded.');
    }

    const clientId = req.params.clientId;
    const uploadedImages = [];

    for (const file of req.files) {
      const fileName = `client-${clientId}-${Date.now()}${path.extname(file.originalname)}`;
      const blob = bucket.file(fileName);
      const blobStream = blob.createWriteStream();

      await new Promise((resolve, reject) => {
        blobStream.on('error', reject);
        blobStream.on('finish', async () => {
          await blob.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          
          const savedImage = await addClientImage(clientId, publicUrl);
          uploadedImages.push(savedImage);
          resolve();
        });
        blobStream.end(file.buffer);
      });
    }

    res.status(200).json({ message: 'Images uploaded successfully', images: uploadedImages });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
}

async function getClientImagesController(req, res) {
  try {
    const clientId = req.params.clientId;
    const images = await getClientImages(clientId);
    res.status(200).json(images);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
}

module.exports = {
  uploadClientImages,
  getClientImagesController
};