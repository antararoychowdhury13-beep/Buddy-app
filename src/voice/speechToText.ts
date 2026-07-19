import { pipeline } from "@huggingface/transformers";

/**
 * Local, on-device speech-to-text via a quantized Whisper model — same
 * pattern as Kokoro for TTS: no external API, no network dependency at
 * inference time, no cost. Chosen specifically because Chrome's built-in
 * SpeechRecognition depends on reaching Google's speech servers, which can
 * fail unpredictably (blocked by network/extensions/browser); this doesn't
 * depend on any network call at all after the one-time model download.
 */
const MODEL_ID = "Xenova/whisper-tiny.en";
export const REQUIRED_SAMPLE_RATE = 16000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriberPromise: Promise<any> | null = null;

function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", MODEL_ID, { dtype: "q8" });
  }
  return transcriberPromise;
}

/** `samples` must already be mono Float32 PCM at REQUIRED_SAMPLE_RATE (16kHz). */
export async function transcribeAudio(samples: Float32Array): Promise<string> {
  const transcriber = await getTranscriber();
  // Whisper only reliably attends to ~30s per pass; without chunking, audio
  // longer than that silently gets truncated (or runs very slowly) instead
  // of properly transcribed end to end. chunk_length_s splits long audio
  // into overlapping windows (stride_length_s) and stitches the result.
  const output = await transcriber(samples, { chunk_length_s: 30, stride_length_s: 5 });
  const result = Array.isArray(output) ? output[0] : output;
  return (result?.text ?? "").trim();
}
