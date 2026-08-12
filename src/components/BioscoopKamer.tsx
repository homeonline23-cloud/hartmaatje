"use client";

import { useCallback, useState } from "react";
import { CinemaWindow } from "@/components/CinemaWindow";
import { useI18n } from "@/i18n/LanguageProvider";
import {
  BIOSCOOP_CATEGORY_IDS,
  BIOSCOOP_FEATURE_SLOTS,
  getBioscoopEmbed,
  getBioscoopFeatureEmbed,
  getBioscoopImage,
  type BioscoopCategoryId,
} from "@/lib/bioscoopMedia";
import { checkInternet } from "@/lib/checkInternet";

type CustomVideo = { title: string; embedUrl: string };
type ActiveVideo =
  | { kind: "category"; id: BioscoopCategoryId }
  | { kind: "custom"; video: CustomVideo };

export function BioscoopKamer() {
  const { t, lang } = useI18n();
  const [categoryId, setCategoryId] = useState<BioscoopCategoryId | null>(
    null
  );
  const [customVideo, setCustomVideo] = useState<CustomVideo | null>(null);
  const [pickHint, setPickHint] = useState<string | null>(null);
  const [checkingNet, setCheckingNet] = useState(false);

  const activeVideo: ActiveVideo | null = categoryId
    ? { kind: "category", id: categoryId }
    : customVideo
      ? { kind: "custom", video: customVideo }
      : null;
  const cinemaOpen = activeVideo !== null;

  const closeCinemaOnly = useCallback(() => {
    setCategoryId(null);
    setCustomVideo(null);
  }, []);

  const openCategory = useCallback(
    async (id: BioscoopCategoryId) => {
      setCheckingNet(true);
      setPickHint(null);
      const online = await checkInternet();
      setCheckingNet(false);
      if (!online) {
        setPickHint(t.cinema.noInternet);
        return;
      }
      setCustomVideo(null);
      setCategoryId(id);
    },
    [t.cinema.noInternet]
  );

  const openFeatureSlot = useCallback(
    async (slot: (typeof BIOSCOOP_FEATURE_SLOTS)[number]) => {
      setCheckingNet(true);
      setPickHint(null);
      const online = await checkInternet();
      setCheckingNet(false);
      if (!online) {
        setPickHint(t.cinema.noInternet);
        return;
      }
      setCategoryId(null);
      setCustomVideo({
        title: t.cinema.featureSlots[slot.id],
        embedUrl: getBioscoopFeatureEmbed(slot, lang),
      });
    },
    [lang, t.cinema.featureSlots, t.cinema.noInternet]
  );

  return (
    <div className="space-y-2.5 pb-1">
      <section className="hm-card space-y-3 px-3 py-3.5 sm:px-4">
        <h3 className="border-y-2 border-[#3f6339] py-1.5 text-center font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-[#3f6339] sm:text-xl">
          {t.cinema.askAnywhereTitle}
        </h3>

        {pickHint ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-left text-xs leading-snug text-red-900 whitespace-pre-line"
          >
            {pickHint}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
          {BIOSCOOP_CATEGORY_IDS.map((id) => {
            const active = categoryId === id;
            const image = getBioscoopImage(id);
            return (
              <button
                key={id}
                type="button"
                disabled={checkingNet}
                onClick={() => void openCategory(id)}
                className={`relative min-h-[4.25rem] overflow-hidden rounded-xl text-left transition active:scale-[0.98] disabled:opacity-70 sm:min-h-[4.75rem] sm:rounded-2xl ${
                  active
                    ? "ring-4 ring-[#3f6339] ring-offset-2"
                    : "border-2 border-[#3f6339] shadow-sm"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/15" />
                <span
                  className={`relative z-10 flex h-full min-h-[4.25rem] items-end px-2.5 py-2 text-sm font-bold leading-snug text-white sm:min-h-[4.75rem] sm:px-3 sm:text-base ${
                    active ? "drop-shadow-md" : ""
                  }`}
                >
                  {t.cinema.categories[id]}
                </span>
              </button>
            );
          })}
        </div>

        {!cinemaOpen ? (
          <div className="space-y-2">
            <div className="space-y-1 px-1">
              <h4 className="border-y-2 border-[#3f6339] py-1.5 text-center font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-[#3f6339] sm:text-xl">
                {t.cinema.fitnessSectionTitle}
              </h4>
              <p className="whitespace-pre-line text-center text-base font-bold leading-snug text-[#3f6339] sm:text-lg">
                {t.cinema.fitnessSectionHint}
              </p>
            </div>
            <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-4 sm:gap-2.5">
            {BIOSCOOP_FEATURE_SLOTS.map((slot) => {
              const label = t.cinema.featureSlots[slot.id];
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={checkingNet}
                  onClick={() => void openFeatureSlot(slot)}
                  className="relative min-h-[4.25rem] overflow-hidden rounded-xl border-2 border-[#3f6339] text-left shadow-sm transition active:scale-[0.98] disabled:opacity-70 sm:min-h-[4.75rem] sm:rounded-2xl"
                  aria-label={label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slot.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/15" />
                  <span className="relative z-10 flex h-full min-h-[4.25rem] items-end px-2.5 py-2 text-sm font-bold leading-snug text-white sm:min-h-[4.75rem] sm:px-3 sm:text-base">
                    {label}
                  </span>
                </button>
              );
            })}
            </div>
          </div>
        ) : null}
      </section>

      {activeVideo ? (
        <CinemaWindow
          title={
            activeVideo.kind === "category"
              ? t.cinema.categories[activeVideo.id]
              : activeVideo.video.title
          }
          waitingLabel={t.cinema.liveWaiting}
          liveHint={t.cinema.liveHint}
          closeLabel={t.cinema.closeWindow}
          onClose={closeCinemaOnly}
          exampleImageSrc={
            activeVideo.kind === "category"
              ? getBioscoopImage(activeVideo.id)
              : undefined
          }
          exampleImageAlt={
            activeVideo.kind === "category"
              ? t.cinema.categories[activeVideo.id]
              : activeVideo.video.title
          }
          embedUrl={
            activeVideo.kind === "category"
              ? getBioscoopEmbed(activeVideo.id, lang)
              : activeVideo.video.embedUrl
          }
        />
      ) : null}
    </div>
  );
}
