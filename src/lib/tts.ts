/**
 * HartMaatje stemlaag — centrale export.
 * @deprecated Gebruik `@/lib/voice` direct in nieuwe code.
 */
export {
  speakHartMaatje as speakDutch,
  stopHartMaatjeSpeech as stopSpeaking,
  previewHartMaatjeVoice,
  repeatLastSpoken,
  rememberLastAssistantReply,
  resolveVoiceSettings,
  type VoiceUserSettings,
  type VoiceIdentityId,
  type VoiceProfileId,
} from "@/lib/voice";
