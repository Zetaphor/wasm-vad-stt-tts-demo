import { PATH_MAP, predict } from './tts.js';

const UI = {
  audio: document.getElementById('tts-audio'),
  select: document.getElementById('voice-select'),
  textarea: document.getElementById('tts-text'),
  button: document.getElementById('generate-speech'),
  status: document.getElementById('tts-status')
};

let blobURL;

function setStatus(message, type = '') {
  UI.status.textContent = message;
  UI.status.className = type;
}

// Initialize voice select options
function initializeVoiceSelect() {
  const entries = Object.entries(PATH_MAP);

  // Add voice options
  entries.forEach(([key], index) => {
    UI.select.add(new Option(key, key, index === 0, index === 0));
  });

  // Trigger initial speech generation
  generateSpeech();
}

async function generateSpeech() {
  const value = UI.select.value.trim();
  if (!value) {
    setStatus('Please select a voice first', 'error');
    return;
  }

  try {
    UI.button.disabled = true;
    UI.select.disabled = true;
    setStatus('Generating speech...', 'loading');

    const startTime = performance.now();
    const wav = await predict({
      text: UI.textarea.value.trim() || 'Text to speech in the browser is amazing!',
      voiceId: value,
    });
    const duration = ((performance.now() - startTime) / 1000).toFixed(1);

    if (blobURL?.length) {
      URL.revokeObjectURL(blobURL);
    }
    blobURL = URL.createObjectURL(wav);
    UI.audio.src = blobURL;

    setStatus(`Speech generated in ${duration}s`, 'success');
  } catch (error) {
    console.error('Speech generation failed:', error);
    setStatus('Failed to generate speech. Please try again.', 'error');
  } finally {
    UI.button.disabled = false;
    UI.select.disabled = false;
  }
}

// Initialize TTS UI
document.addEventListener('DOMContentLoaded', () => {
  initializeVoiceSelect();
  UI.button.addEventListener('click', generateSpeech);
  UI.select.addEventListener('change', generateSpeech);
});