from flask import Flask, request, jsonify, send_from_directory
from groq import Groq
import os
import time

app = Flask(__name__, static_url_path='')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/styles.css')
def serve_css():
    return send_from_directory('.', 'styles.css')

@app.route('/script.js')
def serve_js():
    return send_from_directory('.', 'script.js', mimetype='application/javascript')

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    model = request.form.get('model', 'whisper-large-v3-turbo')
    language = request.form.get('language', 'en')
    api_key = request.form.get('api_key')

    if not api_key:
        return jsonify({'error': 'No API key provided'}), 400

    # Initialize the Groq client with the provided API key
    client = Groq(api_key=api_key)

    try:
        # Measure transcription time
        start_time = time.time()

        # Create a transcription of the audio file
        transcription = client.audio.transcriptions.create(
            file=('audio.wav', file.read()),
            model=model,
            language=language,
            response_format="json",
            temperature=0.0
        )

        end_time = time.time()
        transcription_time = end_time - start_time

        return jsonify({
            'text': transcription.text,
            'transcription_time': transcription_time
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, ssl_context=('server.crt', 'server.key'), host='0.0.0.0', port=5000)
