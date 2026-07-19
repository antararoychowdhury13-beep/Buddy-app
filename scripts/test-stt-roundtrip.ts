import "dotenv/config";
import { KokoroVoiceService } from "../src/voice/kokoroVoiceService.js";
import { transcribeAudio, REQUIRED_SAMPLE_RATE } from "../src/voice/speechToText.js";

/**
 * Proves the local speech-to-text pipeline actually works, without needing a
 * live human voice: synthesize a known sentence with Kokoro (already
 * verified working), transcribe it back with Whisper, and check the round
 * trip roughly matches. Run with: npm run test:stt
 */

function parseFloat32Wav(buffer: Buffer): { samples: Float32Array; sampleRate: number } {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a RIFF/WAVE file");
  }
  let offset = 12;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let formatCode = 0;
  let dataStart = -1;
  let dataLength = 0;

  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;

    if (chunkId === "fmt ") {
      formatCode = buffer.readUInt16LE(chunkDataStart);
      sampleRate = buffer.readUInt32LE(chunkDataStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkDataStart + 14);
    } else if (chunkId === "data") {
      dataStart = chunkDataStart;
      dataLength = chunkSize;
    }
    offset = chunkDataStart + chunkSize + (chunkSize % 2);
  }

  if (dataStart < 0) throw new Error("No data chunk found");
  if (formatCode !== 3 || bitsPerSample !== 32) {
    throw new Error(`Expected 32-bit IEEE float WAV, got format=${formatCode} bits=${bitsPerSample}`);
  }

  const sampleCount = dataLength / 4;
  const samples = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = buffer.readFloatLE(dataStart + i * 4);
  }
  return { samples, sampleRate };
}

function linearResample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIndex = i * ratio;
    const lo = Math.floor(srcIndex);
    const hi = Math.min(lo + 1, input.length - 1);
    const frac = srcIndex - lo;
    output[i] = input[lo] * (1 - frac) + input[hi] * frac;
  }
  return output;
}

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) failures++;
}

async function main() {
  const text = "Hello Buddy, what is on my calendar today";
  console.log(`Synthesizing: "${text}"`);

  const kokoro = new KokoroVoiceService();
  const { audio, mimeType } = await kokoro.generateSpeech(text);
  check("Kokoro produced audio/wav", mimeType === "audio/wav" && audio.length > 0);

  const { samples, sampleRate } = parseFloat32Wav(audio);
  console.log(`Parsed WAV: ${samples.length} samples @ ${sampleRate}Hz`);

  const resampled = linearResample(samples, sampleRate, REQUIRED_SAMPLE_RATE);
  console.log(`Resampled to ${resampled.length} samples @ ${REQUIRED_SAMPLE_RATE}Hz`);

  console.log("Transcribing with local Whisper (first run downloads the model)...");
  const transcript = await transcribeAudio(resampled);
  console.log(`Transcript: "${transcript}"`);

  const normalized = transcript.toLowerCase();
  check("mentions 'buddy'", normalized.includes("buddy"));
  check("mentions 'calendar'", normalized.includes("calendar"));

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
