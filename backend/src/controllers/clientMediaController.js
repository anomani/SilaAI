const { Storage } = require('@google-cloud/storage');
const path = require('path');
const { addClientMedia, getClientMedia, deleteClientMedia } = require('../model/clientMedia');
const mime = require('mime-types');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const storage = new Storage({
  keyFilename: path.join(__dirname, '../keys/uzi-imaging-project-33fdba88c16b.json'),
  projectId: 'uzi-imaging-project',
});

const bucket = storage.bucket('image-buckets-uzi');

async function generateThumbnail(file) {
  return new Promise((resolve, reject) => {
    const thumbnailFileName = `thumbnail-${Date.now()}.jpg`;
    const thumbnailFilePath = `/tmp/${thumbnailFileName}`;

    ffmpeg(file.buffer)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: thumbnailFileName,
        folder: '/tmp',
        size: '320x240'
      })
      .on('end', async () => {
        try {
          await bucket.upload(thumbnailFilePath, {
            destination: thumbnailFileName,
            metadata: {
              contentType: 'image/jpeg'
            }
          });
          const thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${thumbnailFileName}`;
          resolve(thumbnailUrl);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

async function uploadClientMedia(req, res) {
  console.log('uploadClientMedia', req.files);
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('No files uploaded.');
    }

    const clientId = req.params.clientId;
    const uploadedMedia = [];

    for (const file of req.files) {
      const fileExtension = mime.extension(file.mimetype) || path.extname(file.originalname);
      const fileName = `client-${clientId}-${Date.now()}.${fileExtension}`;
      const blob = bucket.file(fileName);
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype
        }
      });

      await new Promise((resolve, reject) => {
        blobStream.on('error', reject);
        blobStream.on('finish', async () => {
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          
          const mediaType = file.mimetype.startsWith('video/') ? 'video' : 
                            file.mimetype.startsWith('image/') ? 'image' : 'unknown';
          
          let thumbnailUrl = null;
          if (mediaType === 'video') {
            thumbnailUrl = await generateThumbnail(file);
          }
          
          const savedMedia = await addClientMedia(clientId, publicUrl, mediaType, thumbnailUrl);
          uploadedMedia.push(savedMedia);
          resolve();
        });
        blobStream.end(file.buffer);
      });
    }

    res.status(200).json({ message: 'Media uploaded successfully', media: uploadedMedia });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
}

async function getClientMediaController(req, res) {
  try {
    const clientId = req.params.clientId;
    const media = await getClientMedia(clientId);
    res.status(200).json(media);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
}

async function deleteClientMediaController(req, res) {
  try {
    const mediaId = req.params.mediaId;
    const media = await deleteClientMedia(mediaId);
    
    if (media) {
      // Delete the media from Google Cloud Storage
      const fileName = path.basename(media.media_url);
      await bucket.file(fileName).delete();
      
      // Delete the thumbnail if it exists
      if (media.thumbnail_url) {
        const thumbnailFileName = path.basename(media.thumbnail_url);
        await bucket.file(thumbnailFileName).delete();
      }
      
      res.status(200).json({ message: 'Media deleted successfully' });
    } else {
      res.status(404).json({ message: 'Media not found' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
}

module.exports = {
  uploadClientMedia,
  getClientMediaController,
  deleteClientMediaController
};