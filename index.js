import { initializeMoonshine, transcribeAudio, convertAudioToFloat32, getCurrentModel } from './moonshine-integration.js';
import { initializeLLM, getChatCompletion, createChatMessage, extractResponseText } from './llm-integration.js';
import { predict, PATH_MAP } from './piper-integration.js';

/**
 * UI Elements
 */
const UI = {
  // Status and Control
  statusIndicator: document.getElementById("status-indicator"),
  toggleButton: document.getElementById("toggle_vad_button"),
  textStatus: document.getElementById("text-status"),
  voiceStatus: document.getElementById("voice-status"),

  // Chat
  chatMessages: document.getElementById("chat-messages"),

  // Settings
  modelSelect: document.getElementById("moonshine-model"),
  voiceSelect: document.getElementById("voice-select"),
  llmEndpoint: document.getElementById("llm-endpoint"),
  llmModel: document.getElementById("llm-model"),
  llmApiKey: document.getElementById("llm-api-key"),
  toggleApiKey: document.getElementById("toggle-api-key"),
  llmTemperature: document.getElementById("llm-temperature"),
  temperatureValue: document.getElementById("temperature-value"),
  systemPrompt: document.getElementById("system-prompt")
};

let vadInstance = null;
let misfireTimeout;
let conversationHistory = [];

/**
 * Initialize voice select dropdown with available voices
 */
function initializeVoiceSelect() {
  // Clear existing options
  UI.voiceSelect.innerHTML = '';

  // Add voice options
  Object.keys(PATH_MAP).forEach((voiceId, index) => {
    const option = new Option(voiceId, voiceId);
    UI.voiceSelect.add(option);
    if (index === 0) {
      option.selected = true;
    }
  });
}

/**
 * Initialize all components
 */
async function initialize() {
  try {
    // Initialize voice select
    initializeVoiceSelect();

    // Initialize LLM
    initializeLLM({
      baseUrl: UI.llmEndpoint.value,
      model: UI.llmModel.value,
      temperature: parseFloat(UI.llmTemperature.value)
    });

    // Initialize Moonshine
    const initialModel = UI.modelSelect.value;
    await initializeMoonshine(initialModel);

    // Initialize VAD
    vadInstance = await vad.MicVAD.new({
      positiveSpeechThreshold: 0.8,
      minSpeechFrames: 5,
      preSpeechPadFrames: 10,
      onFrameProcessed: (probs) => updateStatusIndicator(probs.isSpeech),
      onSpeechEnd: handleSpeechEnd
    });

    setupEventListeners();
    UI.toggleButton.disabled = false;
    UI.voiceStatus.textContent = "Ready to start";
  } catch (error) {
    console.error("Initialization failed:", error);
    UI.voiceStatus.textContent = `Initialization failed: ${error.message}`;
  }
}

/**
 * Set up event listeners for UI controls
 */
function setupEventListeners() {
  // VAD toggle
  window.toggleVAD = () => {
    if (!vadInstance.listening) {
      vadInstance.start();
      UI.toggleButton.textContent = "STOP VAD";
      UI.voiceStatus.textContent = "Listening...";
      UI.statusIndicator.className = "status-indicator status-active";
      UI.textStatus.textContent = "Listening";
    } else {
      vadInstance.pause();
      UI.toggleButton.textContent = "START VAD";
      UI.voiceStatus.textContent = "Paused";
      UI.statusIndicator.className = "status-indicator status-inactive";
      UI.textStatus.textContent = "Stopped";
    }
  };

  // Settings changes
  UI.modelSelect.addEventListener('change', async () => {
    const newModel = UI.modelSelect.value;
    if (newModel === getCurrentModel()) return;

    UI.modelSelect.disabled = true;
    UI.toggleButton.disabled = true;
    const wasListening = vadInstance?.listening;
    if (wasListening) vadInstance.pause();

    try {
      UI.voiceStatus.textContent = `Loading ${newModel} model...`;
      await initializeMoonshine(newModel);
      UI.voiceStatus.textContent = `${newModel} model loaded`;
      if (wasListening) vadInstance.start();
    } catch (error) {
      console.error('Failed to switch model:', error);
      UI.voiceStatus.textContent = `Failed to load ${newModel} model`;
    } finally {
      UI.modelSelect.disabled = false;
      UI.toggleButton.disabled = false;
    }
  });

  // LLM settings
  UI.llmEndpoint.addEventListener('change', updateLLMConfig);
  UI.llmModel.addEventListener('change', updateLLMConfig);
  UI.llmApiKey.addEventListener('change', updateLLMConfig);
  UI.llmTemperature.addEventListener('input', () => {
    UI.temperatureValue.textContent = UI.llmTemperature.value;
    updateLLMConfig();
  });

  // API key visibility toggle
  UI.toggleApiKey.addEventListener('click', () => {
    const isPassword = UI.llmApiKey.type === 'password';
    UI.llmApiKey.type = isPassword ? 'text' : 'password';
    UI.toggleApiKey.textContent = isPassword ? '🔒' : '👁️';
  });
}

/**
 * Update LLM configuration when settings change
 */
function updateLLMConfig() {
  const config = {
    baseUrl: UI.llmEndpoint.value,
    model: UI.llmModel.value,
    temperature: parseFloat(UI.llmTemperature.value)
  };

  // Only add Authorization header if API key is provided
  if (UI.llmApiKey.value.trim()) {
    config.headers = {
      'Authorization': `Bearer ${UI.llmApiKey.value.trim()}`
    };
  }

  initializeLLM(config);
}

/**
 * Update the UI status indicator based on speech probability
 */
function updateStatusIndicator(speechProbability) {
  if (speechProbability > 0.8) {
    UI.statusIndicator.className = "status-indicator status-capturing";
    UI.textStatus.textContent = "Speech detected";
    UI.voiceStatus.textContent = "Speaking detected...";
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
  } else {
    if (UI.statusIndicator.className !== "status-indicator status-misfire") {
      UI.statusIndicator.className = "status-indicator status-active";
      UI.textStatus.textContent = "Listening";
    }
  }
}

/**
 * Add a message to the chat interface
 */
function addChatMessage(text, isUser = true, audioBlob = null, timingInfo = null) {
  const message = document.createElement('div');
  message.className = `message ${isUser ? 'user' : 'assistant'}`;

  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = text;

  const meta = document.createElement('div');
  meta.className = 'message-meta';

  if (timingInfo) {
    const timing = document.createElement('div');
    timing.className = 'timing-info';
    timing.textContent = timingInfo;
    meta.appendChild(timing);
  }

  if (audioBlob) {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = URL.createObjectURL(audioBlob);
    if (!isUser) {
      audio.autoplay = true;
    }
    meta.appendChild(audio);
  }

  message.appendChild(content);
  message.appendChild(meta);
  UI.chatMessages.appendChild(message);
  UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;

  return message;
}

/**
 * Handle speech end event from VAD
 */
async function handleSpeechEnd(audio) {
  try {
    UI.voiceStatus.textContent = "Processing speech...";

    // Convert audio to text
    const transcriptionStart = performance.now();
    const audioBlob = new Blob([vad.utils.encodeWAV(audio)], { type: 'audio/wav' });
    const floatArray = await convertAudioToFloat32(audioBlob);
    const transcription = await transcribeAudio(floatArray);
    const transcriptionTime = Math.round(performance.now() - transcriptionStart);

    // Add user message to chat
    addChatMessage(
      transcription.text,
      true,
      audioBlob,
      `Transcribed in ${transcriptionTime}ms using ${getCurrentModel()} model`
    );

    // Update conversation history
    conversationHistory.push(createChatMessage('user', transcription.text));

    // Get LLM response
    UI.voiceStatus.textContent = "Getting AI response...";
    const llmStart = performance.now();

    // Ensure proper message format for the API
    const messages = [
      createChatMessage('system', UI.systemPrompt.value),
      ...conversationHistory
    ];

    console.log('Sending messages to LLM:', messages); // Debug log

    try {
      const response = await getChatCompletion(messages);
      const responseText = extractResponseText(response);
      const llmTime = Math.round(performance.now() - llmStart);
      conversationHistory.push(createChatMessage('assistant', responseText));

      // Convert response to speech
      UI.voiceStatus.textContent = "Generating speech...";
      const ttsStart = performance.now();
      const speechBlob = await predict({
        text: responseText,
        voiceId: UI.voiceSelect.value
      });
      const ttsTime = Math.round(performance.now() - ttsStart);

      // Add assistant message to chat
      addChatMessage(
        responseText,
        false,
        speechBlob,
        `LLM response: ${llmTime}ms, TTS generation: ${ttsTime}ms using ${UI.voiceSelect.value} voice`
      );

      UI.voiceStatus.textContent = "Listening...";
    } catch (error) {
      console.error('LLM or TTS processing failed:', error);
      UI.voiceStatus.textContent = "Error: " + error.message;

      // Add error message to chat
      addChatMessage(
        "Sorry, I encountered an error while processing your request: " + error.message,
        false,
        null,
        "Error occurred during processing"
      );
    }
  } catch (error) {
    console.error('Processing failed:', error);
    UI.voiceStatus.textContent = "Error processing speech";
  }
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initialize);
