"use client";

import { WelcomeVideoFrame } from "@/components/WelcomeVideoFrame";
import { AppPagePanel } from "@/components/AppPagePanel";
import { useLanguage } from "@/context/LanguageContext";

const STORY_VIDEO_SRC = "/videos/hartmaatje-verhaal.mp4";

export default function VideoPage() {
  const { copy } = useLanguage();

  return (
    <AppPagePanel title={copy.videoPageTitle} intro={copy.videoPageIntro}>
      <WelcomeVideoFrame className="overflow-hidden rounded-2xl">
        <video
          src={STORY_VIDEO_SRC}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-black object-contain"
        >
          <track kind="captions" />
        </video>
      </WelcomeVideoFrame>
    </AppPagePanel>
  );
}
