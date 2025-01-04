import './piper-ui.js';
import { initializeMoonshine, transcribeAudio, convertAudioToFloat32 } from './moonshine-integration.js';

/**
 * Configuration for the Voice Activity Detection
 */
const VAD_CONFIG = {
  positiveSpeechThreshold: 0.8,
  minSpeechFrames: 5,
  preSpeechPadFrames: 10
};

/**
 * UI Elements
 */
const UI = {
  indicator: document.getElementById("indicator"),
  statusIndicator: document.getElementById("status-indicator"),
  toggleButton: document.getElementById("toggle_vad_button"),
  playlist: document.getElementById("playlist"),
  textStatus: document.getElementById("text-status")
};

let vadInstance = null;
let misfireTimeout;

// Loading animation interval
const loading = setInterval(() => {
  const [message, ...dots] = UI.indicator.innerHTML.split(".");
  UI.indicator.innerHTML = message + ".".repeat((dots.length + 1) % 7);
}, 200);

function getIndicatorColor(probability) {
  if (probability > 0.8) return '#ff0000'; // Red for high probability
  if (probability > 0.5) return '#ffa500'; // Orange for medium probability
  return '#00ff00'; // Green for low probability
}

/**
 * Updates the UI status indicator based on speech probability
 * @param {number} speechProbability - Probability of speech detection (0-1)
 */
function updateStatusIndicator(speechProbability) {
  const indicatorColor = getIndicatorColor(speechProbability);
  document.body.style.setProperty("--indicator-color", indicatorColor);

  if (speechProbability > 0.8) {
    UI.statusIndicator.className = "status-indicator status-capturing";
    UI.textStatus.textContent = "Speech detected";
    clearTimeout(misfireTimeout);
    misfireTimeout = setTimeout(() => {
      UI.statusIndicator.className = "status-indicator status-misfire";
      UI.textStatus.textContent = "Possible misfire";
      setTimeout(() => {
        if (UI.statusIndicator.className !== "status-indicator status-misfire") {
          UI.statusIndicator.className = "status-indicator status-active";
          UI.textStatus.textContent = "Listening";
        }
      }, 1000);
    }, 1000);
  } else if (speechProbability > 0.5) {
    UI.statusIndicator.className = "status-indicator status-active";
    UI.textStatus.textContent = "Potential speech detected";
  } else {
    if (UI.statusIndicator.className !== "status-indicator status-misfire") {
      UI.statusIndicator.className = "status-indicator status-active";
      UI.textStatus.textContent = "Listening";
    }
  }
}

/**
 * Creates and adds an audio element with transcription to the playlist
 * @param {string} audioUrl - Base64 encoded WAV audio URL
 * @param {string} transcription - The transcribed text
 * @returns {HTMLElement} The created list item element
 */
function addAudioWithTranscription(audioUrl, transcription) {
  const entry = document.createElement("li");
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = audioUrl;

  const transcriptionDiv = document.createElement("div");
  transcriptionDiv.classList.add("transcription");
  transcriptionDiv.textContent = transcription || "Transcription pending...";

  entry.classList.add("newItem");
  entry.appendChild(audio);
  entry.appendChild(transcriptionDiv);
  return entry;
}

/**
 * Initializes the Voice Activity Detection system
 */
async function initializeVAD() {
  try {
    // Check for secure context and media devices support
    if (!window.isSecureContext) {
      throw new Error('Application must be run in a secure context (HTTPS or localhost)');
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia is not supported in this browser');
    }

    // Initialize Moonshine first
    await initializeMoonshine();

    vadInstance = await vad.MicVAD.new({
      ...VAD_CONFIG,
      onFrameProcessed: (probs) => updateStatusIndicator(probs.isSpeech),
      onSpeechEnd: async (audio) => {
        const wavBuffer = vad.utils.encodeWAV(audio);
        const base64 = vad.utils.arrayBufferToBase64(wavBuffer);
        const url = `data:audio/wav;base64,${base64}`;

        // Create a blob from the audio data for transcription
        const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        const el = addAudioWithTranscription(url, null);
        UI.playlist.prepend(el);

        try {
          // Convert and transcribe the audio
          const floatArray = await convertAudioToFloat32(audioBlob);
          const transcription = await transcribeAudio(floatArray);

          // Update the transcription in the UI
          const transcriptionDiv = el.querySelector('.transcription');
          transcriptionDiv.textContent = transcription;
        } catch (error) {
          console.error('Failed to transcribe audio:', error);
          const transcriptionDiv = el.querySelector('.transcription');
          transcriptionDiv.textContent = 'Transcription failed';
        }
      }
    });

    clearInterval(loading);
    setupVADToggle();
    window.toggleVAD(); // Start VAD automatically
  } catch (error) {
    console.error("Initialization failed:", error);
    clearInterval(loading);
    UI.indicator.innerHTML = `<span style="color:red">Initialization failed: ${error.message}</span>`;
  }
}

/**
 * Sets up the VAD toggle functionality
 */
function setupVADToggle() {
  window.toggleVAD = () => {
    if (!vadInstance.listening) {
      vadInstance.start();
      UI.toggleButton.textContent = "STOP VAD";
      UI.indicator.textContent = "VAD is running";
      UI.statusIndicator.className = "status-indicator status-active";
      UI.textStatus.textContent = "Listening";
    } else {
      vadInstance.pause();
      UI.toggleButton.textContent = "START VAD";
      UI.indicator.innerHTML = `VAD is <span style="color:red">stopped</span>`;
      document.body.style.setProperty("--indicator-color", getIndicatorColor(0));
      UI.statusIndicator.className = "status-indicator status-inactive";
      UI.textStatus.textContent = "Stopped";
    }
  };

  UI.toggleButton.disabled = false;
}

// Initialize VAD when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeVAD);
