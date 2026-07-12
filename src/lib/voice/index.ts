export type {
  VoiceGender,
  VoiceIdentity,
  VoiceIdentityId,
  VoiceLanguageVariant,
  VoiceLocale,
  VoicePlaybackRequest,
  VoiceProfile,
  VoiceProfileId,
  VoiceSpeedOption,
  VoiceUserSettings,
} from "@/lib/voice/types";

export {
  DEFAULT_VOICE_IDENTITY_ID,
  getActiveVoiceIdentities,
  getVoiceIdentity,
  HARTMAATJE_VOICE_REGISTRY,
  VOICE_ETHICS_STATEMENT,
} from "@/lib/voice/registry";

export {
  getAppVoiceLocale,
  resolveActiveVariant,
  variantKey,
} from "@/lib/voice/resolve";

export { normalizeVoiceIdentityId } from "@/lib/voice/legacy";

export {
  DEFAULT_VOICE_PROFILE_ID,
  getVoiceProfile,
  normalizeVoiceProfileId,
  VOICE_PROFILES,
} from "@/lib/voice/profiles";

export {
  clampVoiceSpeed,
  DEFAULT_VOICE_SPEED,
  nearestVoiceSpeedStep,
  VOICE_SPEED_OPTIONS,
  voiceSpeedLabel,
  MIN_VOICE_SPEED,
  MAX_VOICE_SPEED,
} from "@/lib/voice/speed";

export {
  defaultVoiceSettings,
  loadLocalVoiceSettings,
  resolveVoiceSettings,
  saveLocalVoiceSettings,
} from "@/lib/voice/preferences";

export {
  getLastSpokenText,
  previewHartMaatjeVoice,
  rememberLastAssistantReply,
  repeatLastSpoken,
  speakHartMaatje,
  speakHartMaatjeAndWait,
  stopHartMaatjeSpeech,
} from "@/lib/voice/playback";
