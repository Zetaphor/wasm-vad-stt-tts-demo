import { interpolateInferno } from "https://cdn.skypack.dev/d3-scale-chromatic@3"

const loading = setInterval(() => {
  const indicator = document.getElementById("indicator")
  const [message, ...dots] = indicator.innerHTML.split(".")
  indicator.innerHTML = message + ".".repeat((dots.length + 1) % 7)
}, 200)

async function sendAudioToGroq(audioBlob) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'en');

  const apiKey = document.getElementById('api_key').value;
  if (!apiKey) {
    alert('Please enter your Groq API key');
    return {
      transcription: 'No API key provided',
      transcription_time: 0,
      llm_response: 'No API key provided',
      llm_time: 0
    };
  }
  formData.append('api_key', apiKey);

  try {
    const response = await fetch('/transcribe', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending audio to Groq:', error);
    return {
      transcription: 'Error transcribing audio',
      transcription_time: 0,
      llm_response: 'Error processing with LLM',
      llm_time: 0
    };
  }
}

let misfireTimeout;

async function initializeVAD() {
  try {
    const myvad = await vad.MicVAD.new({
      positiveSpeechThreshold: 0.8,
      minSpeechFrames: 5,
      preSpeechPadFrames: 10,
      onFrameProcessed: (probs) => {
        const indicatorColor = interpolateInferno(probs.isSpeech / 2)
        document.body.style.setProperty("--indicator-color", indicatorColor)

        const statusIndicator = document.getElementById("status-indicator");
        if (probs.isSpeech > 0.5) {
          statusIndicator.className = "status-indicator status-capturing";
          clearTimeout(misfireTimeout);
          misfireTimeout = setTimeout(() => {
            statusIndicator.className = "status-indicator status-misfire";
            setTimeout(() => {
              statusIndicator.className = "status-indicator status-active";
            }, 1000);
          }, 1000);
        } else {
          if (statusIndicator.className !== "status-indicator status-misfire") {
            statusIndicator.className = "status-indicator status-active";
          }
        }
      },
      onSpeechEnd: async (arr) => {
        const wavBuffer = vad.utils.encodeWAV(arr)
        const base64 = vad.utils.arrayBufferToBase64(wavBuffer)
        const url = `data:audio/wav;base64,${base64}`
        const el = addAudio(url)
        const speechList = document.getElementById("playlist")
        speechList.prepend(el)

        // Send audio to Groq and display transcription
        const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        const transcription = await sendAudioToGroq(audioBlob);
        displayTranscription(transcription);
      },
    })
    window.myvad = myvad

    clearInterval(loading)
    window.toggleVAD = () => {
      console.log("ran toggle vad")
      const statusIndicator = document.getElementById("status-indicator");
      if (myvad.listening === false) {
        myvad.start()
        document.getElementById("toggle_vad_button").textContent = "STOP VAD"
        document.getElementById("indicator").textContent = "VAD is running"
        statusIndicator.className = "status-indicator status-active";
      } else {
        myvad.pause()
        document.getElementById("toggle_vad_button").textContent = "START VAD"
        document.getElementById("indicator").innerHTML = `VAD is <span style="color:red">stopped</span>`
        const indicatorColor = interpolateInferno(0)
        document.body.style.setProperty("--indicator-color", indicatorColor)
        statusIndicator.className = "status-indicator status-inactive";
      }
    }
    window.toggleVAD()
    document.getElementById("toggle_vad_button").disabled = false
  } catch (e) {
    console.error("Failed:", e)
    clearInterval(loading)
    document.getElementById("indicator").innerHTML = `<span style="color:red">VAD failed to load</span>`
  }
}

function addAudio(audioUrl) {
  const entry = document.createElement("li")
  const audio = document.createElement("audio")
  audio.controls = true
  audio.src = audioUrl
  entry.classList.add("newItem")
  entry.appendChild(audio)
  return entry
}

function displayTranscription(result) {
  const transcriptionDiv = document.getElementById("transcription");
  const transcriptionItem = document.createElement("div");

  const textElement = document.createElement("p");
  textElement.textContent = `Transcription: ${result.transcription}`;

  const timeElement = document.createElement("small");
  timeElement.textContent = `Transcription time: ${result.transcription_time.toFixed(2)} seconds`;
  timeElement.style.color = "gray";

  const llmResponseElement = document.createElement("p");
  llmResponseElement.textContent = `LLM Response: ${result.llm_response}`;
  llmResponseElement.style.fontStyle = "italic";

  const llmTimeElement = document.createElement("small");
  llmTimeElement.textContent = `LLM processing time: ${result.llm_time.toFixed(2)} seconds`;
  llmTimeElement.style.color = "gray";

  transcriptionItem.appendChild(textElement);
  transcriptionItem.appendChild(timeElement);
  transcriptionItem.appendChild(llmResponseElement);
  transcriptionItem.appendChild(llmTimeElement);

  transcriptionDiv.prepend(transcriptionItem);
}

document.addEventListener('DOMContentLoaded', initializeVAD);
