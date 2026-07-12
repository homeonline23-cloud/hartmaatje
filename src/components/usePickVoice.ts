"use client";

import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { hasWelcomeVideo } from "@/lib/avatars";
import { getVoiceLocaleForLang } from "@/lib/languages";
import {
  loadLocalVoiceSettings,
  previewHartMaatjeVoice,
  resolveVoiceSettings,
  saveLocalVoiceSettings,
  type VoiceIdentityId,
} from "@/lib/voice";

export function usePickVoice(
  onVoiceChange?: (id: VoiceIdentityId) => void,
  disabled = false,
) {
  const { profile, updateProfileFields } = useAuth();
  const { lang } = useLanguage();

  return useCallback(
    async (id: VoiceIdentityId) => {
      if (disabled) return;

      const rate =
        (profile
          ? resolveVoiceSettings(profile)
          : loadLocalVoiceSettings()
        )?.playbackRate ?? 0.8;

      saveLocalVoiceSettings({ identityId: id, playbackRate: rate });

      onVoiceChange?.(id);

      if (profile) {
        try {
          await updateProfileFields({ tts_preset_id: id });
        } catch {
          /* video/stemkeuze werkt ook zonder cloud */
        }
      }

      if (!hasWelcomeVideo(id)) {
        previewHartMaatjeVoice(id, rate, getVoiceLocaleForLang(lang));
      }
    },
    [disabled, lang, onVoiceChange, profile, updateProfileFields],
  );
}
