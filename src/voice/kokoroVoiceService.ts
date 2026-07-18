import { KokoroTTS } from "kokoro-js";
import type { GeneratedSpeech, VoiceService } from "./VoiceService.js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const VOICE = "af_heart"; // English only for v1
const DTYPE = "q8"; // quantized: good quality/speed balance on CPU

/**
 * Kokoro-82M implementation of VoiceService. Runs 100% locally (no external
 * API) via kokoro-js/onnxruntime. Model weights are downloaded from the
 * Hugging Face Hub on first use and cached under ./.cache (transformers.js
 * default) — every call after that is fully offline.
 */
export class KokoroVoiceService implements VoiceService {
  private ttsPromise: Promise<KokoroTTS> | null = null;

  private loadModel(): Promise<KokoroTTS> {
    if (!this.ttsPromise) {
      this.ttsPromise = KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: DTYPE,
        device: "cpu",
      });
    }
    return this.ttsPromise;
  }

  async generateSpeech(text: string): Promise<GeneratedSpeech> {
    const tts = await this.loadModel();
    const rawAudio = await tts.generate(text, { voice: VOICE });
    return {
      audio: Buffer.from(rawAudio.toWav()),
      mimeType: "audio/wav",
    };
  }
}
