let vadInstance;
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusDiv = document.getElementById('status');
const secureContextWarning = document.getElementById('secureContextWarning');

// Check if we're in a secure context
if (!window.isSecureContext) {
  secureContextWarning.style.display = 'block';
  startButton.disabled = true;
}

startButton.addEventListener('click', startVAD);
stopButton.addEventListener('click', stopVAD);

async function startVAD() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia is not supported in this browser');
    }

    vadInstance = await window.vad.MicVAD.new({
      onSpeechStart: () => {
        console.log('Speech started');
        statusDiv.textContent = 'Speech detected';
      },
      onSpeechEnd: (audio) => {
        console.log('Speech ended');
        statusDiv.textContent = 'Speech ended';
        // You can do something with the audio here, like sending it to a server
      },
      onVADMisfire: () => {
        console.log('VAD misfire');
        statusDiv.textContent = 'VAD misfire';
      }
    });

    await vadInstance.start();
    startButton.disabled = true;
    stopButton.disabled = false;
    statusDiv.textContent = 'VAD running';
  } catch (error) {
    console.error('Error starting VAD:', error);
    statusDiv.textContent = 'Error starting VAD: ' + error.message;
  }
}

function stopVAD() {
  if (vadInstance) {
    vadInstance.stop();
    vadInstance = null;
    startButton.disabled = false;
    stopButton.disabled = true;
    statusDiv.textContent = 'VAD stopped';
  }
}
