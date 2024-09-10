const fs = require('fs');
const fsPromises = require('fs').promises; // Make sure to use the promise-based version of fs
const OpenAI = require('openai');
const dotenv = require('dotenv');
dotenv.config({ path: '../env' });

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

/**
 * Transcribes an audio file using OpenAI's Whisper model.
 * @param {string} filePath - The path to the audio file.
 * @returns {Promise<string>} The transcribed text.
 */
async function transcribeAudio(filePath) {
    try {
        const audioFile = fs.createReadStream(filePath);
        const transcription = await client.audio.transcriptions.create({
            model: "whisper-1",
            file: audioFile,
        });
        console.log('Transcription successful:', transcription.text);
        return transcription.text;
    } catch (error) {
        console.error('Error transcribing audio:', error);
        if (error.response) {
            console.error('Error response:', error.response.data);
        }
        throw error; // Throw the original error to preserve the stack trace
    }
}

/**
 * Handles the audio file upload and transcription process.
 * @param {Express.Multer.File} file - The uploaded audio file.
 * @returns {Promise<string>} The transcribed text.
 */
async function handleAudioTranscription(file) {
  if (!file) {
    throw new Error('No audio file uploaded');
  }

  try {
    const transcription = await transcribeAudio(file.path);
    
    
    // Delete the file after transcription
    await fsPromises.unlink(file.path);
    

    return transcription;
  } catch (error) {
    console.error('Error in handleAudioTranscription:', error);
    
    // Attempt to delete the file even if transcription fails
    try {
      await fsPromises.unlink(file.path);
    } catch (deleteError) {
      console.error('Error deleting temporary file:', deleteError);
    }
    
    throw error;
  }
}

module.exports = {
  transcribeAudio,
  handleAudioTranscription,
};
