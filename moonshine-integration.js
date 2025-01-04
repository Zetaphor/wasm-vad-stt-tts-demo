import Moonshine from './moonshine/moonshine-web.js';

let moonshineInstance = null;
let isInitialized = false;

/**
 * Initialize the Moonshine transcription system
 * @returns {Promise} Resolves when Moonshine is ready
 */
export async function initializeMoonshine() {
  if (isInitialized) return;

  try {
    moonshineInstance = new Moonshine('tiny'); // Using the tiny model by default
    await moonshineInstance.loadModel();
    isInitialized = true;
    console.log('Moonshine initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Moonshine:', error);
    throw error;
  }
}

/**
 * Transcribe audio data using Moonshine
 * @param {Float32Array} audioData - Raw audio data to transcribe
 * @returns {Promise<string>} The transcription result
 */
export async function transcribeAudio(audioData) {
  if (!isInitialized || !moonshineInstance) {
    throw new Error('Moonshine not initialized');
  }

  try {
    const transcription = await moonshineInstance.generate(audioData);
    return transcription;
  } catch (error) {
    console.error('Transcription failed:', error);
    throw error;
  }
}

/**
 * Convert audio blob to Float32Array for Moonshine processing
 * @param {Blob} audioBlob - The audio blob to convert
 * @returns {Promise<Float32Array>} The converted audio data
 */
export async function convertAudioToFloat32(audioBlob) {
  const audioCTX = new AudioContext({ sampleRate: 16000 });
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioCTX.decodeAudioData(arrayBuffer);

  let floatArray = new Float32Array(audioBuffer.length);
  audioBuffer.copyFromChannel(floatArray, 0);

  // Limit to 30 seconds if longer
  if (floatArray.length > (16000 * 30)) {
    floatArray = floatArray.subarray(0, 16000 * 30);
    console.warn('Audio longer than 30 seconds, truncating to first 30 seconds');
  }

  return floatArray;
}