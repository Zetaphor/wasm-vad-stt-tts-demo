import { createPiperPhonemize } from "./piper/piper.js";
import * as ort from "./piper/onyx-runtimeweb.js";

const ONNX_BASE = "piper/";
const WASM_BASE = "piper/piper_phonemize";

const PATH_MAP = {
  "en_US-hfc_female-medium": "en_US-hfc_female-medium.onnx",
  "en_US-hfc_male-medium": "en_US-hfc_male-medium.onnx",
  "GLaDOS": "glados.onnx"
};

function pcm2wav(buffer, numChannels, sampleRate) {
  const bufferLength = buffer.length;
  const view = new DataView(new ArrayBuffer(bufferLength * numChannels * 2 + 44));
  view.setUint32(0, 0x46464952, true);
  view.setUint32(4, view.buffer.byteLength - 8, true);
  view.setUint32(8, 0x45564157, true);
  view.setUint32(12, 0x20746d66, true);
  view.setUint32(16, 0x10, true);
  view.setUint16(20, 0x0001, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, numChannels * 2 * sampleRate, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x61746164, true);
  view.setUint32(40, 2 * bufferLength, true);
  let p = 44;
  for (let i = 0; i < bufferLength; i++) {
    const v = buffer[i];
    if (v >= 1) view.setInt16(p, 0x7fff, true);
    else if (v <= -1) view.setInt16(p, -0x8000, true);
    else view.setInt16(p, (v * 0x8000) | 0, true);
    p += 2;
  }
  return view.buffer;
}

async function fetchBlob(url) {
  const request = await fetch(url);
  const type = request.headers.get("content-type") || 'application/octet-stream';
  return new Blob([await request.arrayBuffer()], { type });
}

async function createBlobUrl(url) {
  const blob = await fetchBlob(url);
  return {
    url: URL.createObjectURL(blob),
    blob,
  };
}

async function predict(config) {
  const path = PATH_MAP[config.voiceId];
  const input = JSON.stringify([{ text: config.text.trim() }]);

  const piperPhonemizeWasm = (await createBlobUrl(`${WASM_BASE}.wasm`)).url;
  const piperPhonemizeData = (await createBlobUrl(`${WASM_BASE}.data`)).url;

  ort.env.wasm.numThreads = navigator.hardwareConcurrency;
  ort.env.wasm.wasmPaths = ONNX_BASE;

  const modelConfigBlob = (await createBlobUrl(`${ONNX_BASE}/en_${config.voiceId.replace(/-/g, '_')}_${path}.json`)).blob;
  const modelConfig = JSON.parse(await modelConfigBlob.text());

  const phonemeIds = await new Promise(async (resolve) => {
    const module = await createPiperPhonemize({
      print: (data) => {
        resolve(JSON.parse(data).phoneme_ids);
      },
      printErr: (message) => {
        throw new Error(message);
      },
      locateFile: (url) => {
        if (url.endsWith(".wasm")) return piperPhonemizeWasm;
        if (url.endsWith(".data")) return piperPhonemizeData;
        return url;
      },
    });
    module.callMain([
      "-l",
      modelConfig.espeak.voice,
      "--input",
      input,
      "--espeak_data",
      "/espeak-ng-data",
    ]);
  });

  const sampleRate = modelConfig.audio.sample_rate;
  const noiseScale = modelConfig.inference.noise_scale;
  const lengthScale = modelConfig.inference.length_scale;
  const noiseW = modelConfig.inference.noise_w;

  const modelBlob = (await createBlobUrl(`${ONNX_BASE}/${path}`)).url;
  const session = await ort.InferenceSession.create(modelBlob);

  const feeds = {
    input: new ort.Tensor("int64", phonemeIds, [1, phonemeIds.length]),
    input_lengths: new ort.Tensor("int64", [phonemeIds.length]),
    scales: new ort.Tensor("float32", [noiseScale, lengthScale, noiseW]),
  };

  if (Object.keys(modelConfig.speaker_id_map).length) {
    Object.assign(feeds, {
      sid: new ort.Tensor("int64", [0]),
    });
  }

  const { output: { data: pcm } } = await session.run(feeds);

  return new Blob([pcm2wav(pcm, 1, sampleRate)], {
    type: "audio/x-wav",
  });
}

export { PATH_MAP, predict };