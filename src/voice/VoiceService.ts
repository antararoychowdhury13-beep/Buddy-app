/**
 * The only contract the rest of Buddy is allowed to depend on for speech.
 * No caller should import a concrete engine (e.g. KokoroVoiceService) directly —
 * always go through `voiceService` from `src/voice/index.ts` so the engine
 * can be swapped later without touching anything upstream.
 */
export interface GeneratedSpeech {
  audio: Buffer;
  mimeType: string;
}

export interface VoiceService {
  generateSpeech(text: string): Promise<GeneratedSpeech>;
}
