const fs = require('fs');
const OpenAI = require('openai');
const dotenv = require('dotenv');
dotenv.config({ path: '../env' });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

/**
 * Transcribes an audio file using OpenAI's Whisper model.
 * @param {string} filePath - The path to the audio file.
 * @returns {Promise<string>} The transcribed text.
 */
async function transcribeAudio(filePath) {
  try {
    const transcript = await openai.createTranscription(
      fs.createReadStream(filePath),
      "whisper-1"
    );
    return transcript.data.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio');
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
    
    // Delete the temporary file after transcription
    fs.unlinkSync(file.path);

    return transcription;
  } catch (error) {
    // Ensure the temporary file is deleted even if transcription fails
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  }
}

module.exports = {
  transcribeAudio,
  handleAudioTranscription,
};
