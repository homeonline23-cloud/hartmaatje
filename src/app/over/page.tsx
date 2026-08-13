"use client";

import { AppShell } from "@/components/AppShell";
import { StoryVideoPlayer } from "@/components/StoryVideoPlayer";
import { useI18n } from "@/i18n/LanguageProvider";
import { resolveAloneMedia, resolveIntroductionVideoMedia, resolveWelcomeMedia } from "@/lib/mediaByLang";

export default function OverPage() {
  const { t, lang } = useI18n();
  const aloneMedia = resolveAloneMedia(lang);
  const introductionMedia = resolveIntroductionVideoMedia(lang);
  const peterMedia = resolveWelcomeMedia("peter", lang);

  return (
    <AppShell>
      <section className="hm-card space-y-2 px-4 pb-6 pt-3 sm:pb-8">
        <h2 className="text-center font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight text-[#3f6339] sm:text-3xl">
          {t.about.title}
        </h2>

        <div className="mx-auto w-full max-w-lg space-y-8">
          <div>
            <h3 className="mb-2 text-center font-[family-name:var(--font-display)] text-xl font-semibold leading-tight text-[#3f6339] sm:text-2xl">
              {t.media.storyCaption}
            </h3>
            <StoryVideoPlayer
              src={peterMedia.videoSrc}
              coverImage="/images/over-video-poster.png"
              ariaLabel={t.media.storyCaption}
              playLabel={t.media.storyPlay}
            />
          </div>

          <div>
            <h3 className="mb-2 text-center font-[family-name:var(--font-display)] text-xl font-semibold leading-tight text-[#3f6339] sm:text-2xl">
              {t.about.introductionTitle}
            </h3>
            <StoryVideoPlayer
              src={introductionMedia.videoSrc}
              ariaLabel={t.about.introductionTitle}
              playLabel={t.media.storyPlay}
            />
          </div>

          <div>
            <h3 className="mb-2 text-center font-[family-name:var(--font-display)] text-xl font-semibold leading-tight text-[#3f6339] sm:text-2xl">
              {t.about.aloneTitle}
            </h3>
            <StoryVideoPlayer
              src={aloneMedia.videoSrc}
              coverImage="/images/alleen-en-eenzaam-poster.jpg"
              ariaLabel={t.about.aloneTitle}
              playLabel={t.media.storyPlay}
            />
          </div>
        </div>
      </section>
    </AppShell>
  );
}
