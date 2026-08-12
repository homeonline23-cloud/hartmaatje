import type { AppLang } from "@/i18n/config";
import type { Story } from "@/lib/stories";
import storyLocales from "./storyLocales.json";

export type StoryText = {
  title: string;
  teaser: string;
  body: string;
};

export function getStoryText(story: Story, lang: AppLang): StoryText {
  const pack = (
    storyLocales as Record<string, Partial<Record<AppLang, StoryText>>>
  )[story.id];
  const localized = pack?.[lang] ?? pack?.en;
  const body = (localized?.body || "").trim() || story.body;
  const title = (localized?.title || "").trim() || story.title;
  const teaser = (localized?.teaser || "").trim() || story.teaser;
  return { title, teaser, body };
}
