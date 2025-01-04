# WASM based offline Voice-Enabled Chatbot (AKA ChatGPT at home)

An offline-first voice-enabled chatbot that provides a complete voice interface for interacting with AI language models. This project combines multiple technologies to enable voice input, text processing, and voice output - all running locally in your browser (except for the LLM).

This project is intended to act as a testbed and launching pad for voice-enabled applications.

## Features

- 🎤 **Voice Activity Detection (VAD)** - Automatically detects when you're speaking
- 🗣️ **Speech-to-Text (STT)** - Converts your voice to text using Moonshine
- 💭 **Language Model Integration** - Compatible with any OpenAI-style API endpoint
- 🔊 **Text-to-Speech (TTS)** - Converts AI responses to natural-sounding speech using Piper
- 🌐 **Offline-First** - All voice processing runs entirely in your browser
- ⚡ **Real-Time Processing** - Fast response times with minimal latency

## Getting Started

### Prerequisites

- A modern web browser
- An OpenAI-compatible API endpoint (local or remote)

### Installation

1. Clone this repository:
```bash
git clone [repository-url]
cd [repository-name]
```

2. Serve the files using a local web server. For example, using Python:
```bash
python -m http.server 8080
```

3. Add the Moonshine models to the `models` folder.
Since I can't upload large files to Github, you will need to manually download the Moonshine models from [their HuggingFace repo](https://huggingface.co/UsefulSensors/moonshine/tree/main/ort) (the ort versions) and add them to the `moonshine/models` folder.

4. Open your browser and navigate to `http://localhost:8080`

## Configuration

### LLM Settings
- **API Endpoint**: Set your OpenAI-compatible API endpoint
- **Model Name**: Specify the model to use
- **API Key**: Enter your API key if required
- **Temperature**: Adjust response randomness (0.0 - 1.0)
- **System Prompt**: Customize the AI's behavior

### Speech Recognition
- Choose between Moonshine Tiny or Base models for different accuracy levels

### Text-to-Speech
- Multiple voice options available through Piper. More voices can be found here: https://rhasspy.github.io/piper-samples/
- Completely offline voice synthesis

## Technology Stack

This project is built using several open-source technologies:

- **VAD**: [vad-web](https://github.com/ricky0123/vad) - Voice activity detection
- **STT**: [Moonshine](https://github.com/usefulsensors/moonshine) - Speech-to-text processing
- **TTS**: [Piper](https://github.com/rhasspy/piper) - Text-to-speech synthesis and voices
  - Uses a modified version of [vits-web](https://github.com/diffusionstudio/vits-web) for inference

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [vad-web](https://github.com/ricky0123/vad) for voice activity detection
- [Moonshine](https://github.com/usefulsensors/moonshine) for speech recognition
- [Piper](https://github.com/rhasspy/piper) for text-to-speech
- [vits-web](https://github.com/diffusionstudio/vits-web) and [guest271314](https://github.com/guest271314/vits-web/tree/patch-1/docs) for TTS inference
