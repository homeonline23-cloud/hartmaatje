"use client";

import { AppShell } from "@/components/AppShell";
import { StoryVideoPlayer } from "@/components/StoryVideoPlayer";
import { useI18n } from "@/i18n/LanguageProvider";
import { resolveBusinessGrowthMedia } from "@/lib/mediaByLang";
import { getPricingContent } from "@/lib/pricingContent";

export default function PrijzenPage() {
  const { t, lang } = useI18n();
  const p = getPricingContent(lang);
  const businessMedia = resolveBusinessGrowthMedia(lang);

  return (
    <AppShell>
      <article className="pb-20 sm:pb-24">
        <section className="hm-card space-y-4 px-4 pt-3.5 pb-10 sm:px-5 sm:pt-4 sm:pb-12">
          <header className="text-center">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-tight text-[#3f6339] sm:text-2xl">
              {p.title}
            </h2>
          </header>

          <div className="mx-auto w-full max-w-lg">
            <StoryVideoPlayer
              src={businessMedia.videoSrc}
              poster="/images/business-growth-hero.png"
              ariaLabel={p.title}
              playLabel={t.media.storyPlay}
            />
          </div>
        </section>
      </article>
    </AppShell>
  );
}
