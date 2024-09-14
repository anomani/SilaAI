const OpenAI = require('openai');
const dotenv = require('dotenv');
const { File } = require('node:buffer');
dotenv.config({ path: '../env' });

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribes an audio buffer using OpenAI's Whisper model.
 * @param {Buffer} audioBuffer - The audio data as a Buffer.
 * @param {string} filename - The original filename of the audio file.
 * @param {string} mimeType - The MIME type of the audio file.
 * @returns {Promise<string>} The transcribed text.
 */
async function transcribeAudio(audioBuffer, filename, mimeType) {
    try {
        const file = new File([audioBuffer], filename, { type: mimeType });
        const transcription = await client.audio.transcriptions.create({
            file: file,
            model: "whisper-1",
        });
        console.log('Transcription successful:', transcription.text);
        return transcription.text;
    } catch (error) {
        console.error('Error transcribing audio:', error);
        if (error.response) {
            console.error('Error response:', error.response.data);
        }
        throw error;
    }
}

/**
 * Handles the audio buffer transcription process.
 * @param {Buffer} audioBuffer - The audio data as a Buffer.
 * @param {string} filename - The original filename of the audio file.
 * @param {string} mimeType - The MIME type of the audio file.
 * @returns {Promise<string>} The transcribed text.
 */
async function handleAudioTranscription(audioBuffer, filename, mimeType) {
    if (!audioBuffer) {
        throw new Error('No audio data provided');
    }

    try {
        const transcription = await transcribeAudio(audioBuffer, filename, mimeType);
        return transcription;
    } catch (error) {
        console.error('Error in handleAudioTranscription:', error);
        throw error;
    }
}

module.exports = {
    transcribeAudio,
    handleAudioTranscription,
};
