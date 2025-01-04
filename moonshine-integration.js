/**
 * @module moonshine-integration
 * @description Integration module for the Moonshine speech recognition system.
 * Provides functionality for initializing the model, transcribing audio,
 * and converting audio formats for processing.
 */

import Moonshine from './moonshine/moonshine-web.js';

let moonshineInstance = null;
let isInitialized = false;
let currentModel = 'tiny';

/**
 * Initialize the Moonshine transcription system
 * @param {string} modelName - The name of the model to initialize ('tiny' or 'base')
 * @returns {Promise} Resolves when Moonshine is ready
 */
export async function initializeMoonshine(modelName = 'tiny') {
  try {
    // If we're switching models, we need to reinitialize
    if (isInitialized && currentModel !== modelName) {
      isInitialized = false;
      moonshineInstance = null;
    }

    if (isInitialized) return;

    currentModel = modelName;
    moonshineInstance = new Moonshine(modelName);
    await moonshineInstance.loadModel();
    isInitialized = true;
    console.log(`Moonshine initialized successfully with ${modelName} model`);
  } catch (error) {
    console.error('Failed to initialize Moonshine:', error);
    throw error;
  }
}

/**
 * Get the current model name
 * @returns {string} The current model name
 */
export function getCurrentModel() {
  return currentModel;
}

/**
 * Transcribe audio data using Moonshine
 * @param {Float32Array} audioData - Raw audio data to transcribe
 * @returns {Promise<{text: string, duration: number}>} The transcription result and duration in milliseconds
 */
export async function transcribeAudio(audioData) {
  if (!isInitialized || !moonshineInstance) {
    throw new Error('Moonshine not initialized');
  }

  try {
    const startTime = performance.now();
    const transcription = await moonshineInstance.generate(audioData);
    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      text: transcription,
      duration: Math.round(duration)
    };
  } catch (error) {
    console.error('Transcription failed:', error);
    throw error;
  }
}

/**
 * Convert audio blob to Float32Array for Moonshine processing
 * @param {Blob} audioBlob - The audio blob to convert
 * @returns {Promise<Float32Array>} The converted audio data
 * @description Creates an AudioContext with a 16kHz sample rate (required by Moonshine),
 * decodes the audio blob, and returns a Float32Array of the audio data.
 * Audio longer than 30 seconds will be truncated.
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