import { KokoroVoiceService } from "./kokoroVoiceService.js";
import type { VoiceService } from "./VoiceService.js";

/**
 * The single wiring point for Buddy's voice layer. Every other module must
 * import `voiceService` from here — never a concrete engine class directly —
 * so replacing Kokoro with a different TTS provider later only means changing
 * this one line.
 */
export const voiceService: VoiceService = new KokoroVoiceService();

export type { VoiceService, GeneratedSpeech } from "./VoiceService.js";
