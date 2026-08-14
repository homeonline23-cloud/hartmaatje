import {
  APP_LANGS,
  DEFAULT_APP_LANG,
  LOCALES,
  type AppLang,
} from "@/i18n/config";
import type { CompanionId } from "@/lib/companions";
import {
  getStoryCaptions,
  getWelcomeCaptions,
  type CaptionCue,
} from "@/lib/videoCaptions";

/** All launch languages ship dubbed welcome + story video. */
const ALL_AUDIO_LANGS: readonly AppLang[] = APP_LANGS;

/** Languages that have a welcome video file on disk. */
const WELCOME_AUDIO_LANGS: Record<CompanionId, readonly AppLang[]> = {
  fenna: ALL_AUDIO_LANGS,
  maarten: ALL_AUDIO_LANGS,
  peter: ALL_AUDIO_LANGS,
  colette: ALL_AUDIO_LANGS,
};

const STORY_AUDIO_LANGS: readonly AppLang[] = ALL_AUDIO_LANGS;

/** Cache-bust when language packs are refreshed. */
const MEDIA_VERSION = "v17";

export type LangMedia = {
  /** Video file actually played */
  videoSrc: string;
  /** Language of the spoken audio in that file */
  audioLang: AppLang;
  /** Language of captions / on-screen text */
  textLang: AppLang;
  captions: CaptionCue[];
  /** True when spoken audio falls back to the default language */
  audioFallback: boolean;
  audioLangLabel: string;
  textLangLabel: string;
};

function welcomeDubPath(companionId: CompanionId, lang: AppLang): string {
  return `/avatars/${companionId}/welcome.${lang}.mp4?${MEDIA_VERSION}`;
}

function storyDubPath(lang: AppLang): string {
  return `/videos/hartmaatje-verhaal.${lang}.mp4?${MEDIA_VERSION}`;
}

function introDubPath(lang: AppLang): string {
  return `/videos/hartmaatje-intro.${lang}.mp4?${MEDIA_VERSION}`;
}

function aloneDubPath(lang: AppLang): string {
  return `/videos/alleen-en-eenzaam.${lang}.mp4?${MEDIA_VERSION}`;
}

function businessGrowthDubPath(lang: AppLang): string {
  return `/videos/business-growth.${lang}.mp4?${MEDIA_VERSION}`;
}

function privacyPolicyDubPath(lang: AppLang): string {
  return `/videos/privacy-policy.${lang}.mp4?${MEDIA_VERSION}`;
}

function introductionVideoDubPath(lang: AppLang): string {
  return `/videos/hartmaatje-introduction.${lang}.mp4?${MEDIA_VERSION}`;
}

/**
 * Per-story generated video (Verhalen Kamer). One muted, voiceless clip per
 * story+language — reused across all companions, since the companion's own
 * narration mp3 plays alongside it instead of any voice baked into the video.
 * Not every story has one yet; callers must confirm it exists (e.g. HEAD
 * check) before switching from the static portrait to this video.
 */
export function storyVideoPath(storyId: string, lang: AppLang): string {
  return `/videos/stories/${storyId}.${lang}.mp4?${MEDIA_VERSION}`;
}

function hasWelcomeAudio(companionId: CompanionId, lang: AppLang): boolean {
  return WELCOME_AUDIO_LANGS[companionId].includes(lang);
}

function hasStoryAudio(lang: AppLang): boolean {
  return STORY_AUDIO_LANGS.includes(lang);
}

function fallbackWelcome(companionId: CompanionId): string {
  return `/avatars/${companionId}/welcome.nl.mp4?${MEDIA_VERSION}`;
}

/** Resolve welcome clip + captions for the active UI language. */
export function resolveWelcomeMedia(
  companionId: CompanionId,
  lang: AppLang
): LangMedia {
  const textLang = lang;
  const captions = getWelcomeCaptions(companionId, textLang);

  if (hasWelcomeAudio(companionId, lang)) {
    return {
      videoSrc: welcomeDubPath(companionId, lang),
      audioLang: lang,
      textLang,
      captions,
      audioFallback: false,
      audioLangLabel: LOCALES[lang].nativeLabel,
      textLangLabel: LOCALES[textLang].nativeLabel,
    };
  }

  // Missing dub → Dutch video + captions in selected language
  return {
    videoSrc: fallbackWelcome(companionId),
    audioLang: DEFAULT_APP_LANG,
    textLang,
    captions,
    audioFallback: true,
    audioLangLabel: LOCALES[DEFAULT_APP_LANG].nativeLabel,
    textLangLabel: LOCALES[textLang].nativeLabel,
  };
}

/** Resolve story video + captions for the active UI language. */
export function resolveStoryMedia(lang: AppLang): LangMedia {
  const textLang = lang;
  const captions = getStoryCaptions(textLang);

  if (hasStoryAudio(lang)) {
    return {
      videoSrc: storyDubPath(lang),
      audioLang: lang,
      textLang,
      captions,
      audioFallback: false,
      audioLangLabel: LOCALES[lang].nativeLabel,
      textLangLabel: LOCALES[textLang].nativeLabel,
    };
  }

  return {
    videoSrc: storyDubPath(DEFAULT_APP_LANG),
    audioLang: DEFAULT_APP_LANG,
    textLang,
    captions,
    audioFallback: true,
    audioLangLabel: LOCALES[DEFAULT_APP_LANG].nativeLabel,
    textLangLabel: LOCALES[textLang].nativeLabel,
  };
}

/** Frontpage introduction video for the active UI language (no captions). */
export function resolveIntroMedia(lang: AppLang): {
  videoSrc: string;
  audioLang: AppLang;
} {
  return {
    videoSrc: introDubPath(lang),
    audioLang: lang,
  };
}

/** "Alleen en eenzaam" (loneliness) video for the active UI language — dubbed in all 5 languages. */
export function resolveAloneMedia(lang: AppLang): {
  videoSrc: string;
  audioLang: AppLang;
} {
  return {
    videoSrc: aloneDubPath(lang),
    audioLang: lang,
  };
}

/** Business Information & Future Growth video — dubbed in all 5 languages. */
export function resolveBusinessGrowthMedia(lang: AppLang): {
  videoSrc: string;
  audioLang: AppLang;
} {
  return {
    videoSrc: businessGrowthDubPath(lang),
    audioLang: lang,
  };
}

/** Privacy Policy video — dubbed in all 5 languages. */
export function resolvePrivacyPolicyMedia(lang: AppLang): {
  videoSrc: string;
  audioLang: AppLang;
} {
  return {
    videoSrc: privacyPolicyDubPath(lang),
    audioLang: lang,
  };
}

/** "Over HartMaatje" introduction video — dubbed in all 5 languages. */
export function resolveIntroductionVideoMedia(lang: AppLang): {
  videoSrc: string;
  audioLang: AppLang;
} {
  return {
    videoSrc: introductionVideoDubPath(lang),
    audioLang: lang,
  };
}
