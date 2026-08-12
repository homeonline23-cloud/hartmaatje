"use client";

import Image from "next/image";
import Link from "next/link";
import { companions, type CompanionId } from "@/lib/companions";
import { useI18n } from "@/i18n/LanguageProvider";

type Props = {
  onPick?: (id: CompanionId) => void;
};

export function CompanionPicker({ onPick }: Props) {
  const { t } = useI18n();

  return (
    <div className="hm-card overflow-hidden">
      <div className="border-b border-[#e8dfd0]/55 px-3 py-2 text-center">
        <h2 className="text-lg font-semibold leading-tight text-[#3f6339] sm:text-xl">
          {t.home.chooseCompanion}
        </h2>
        <p className="mt-0.5 text-xs font-semibold leading-snug text-[#3f6339] sm:text-sm">
          {t.home.tapPortrait}
        </p>
      </div>

      <div className="px-2.5 py-2.5 sm:px-3 sm:py-3">
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {companions.map((c) => {
            const blurb = t.companions[c.id].blurb;
            const crop = c.portraitCrop;
            const inner = (
              <>
                <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-full bg-[#e8dfd0] ring-2 ring-white shadow-sm sm:h-[4.5rem] sm:w-[4.5rem]">
                  <Image
                    src={c.portrait}
                    alt={c.name}
                    fill
                    unoptimized
                    className={`object-cover ${crop ? `${crop.scale} ${crop.position}` : ""}`}
                    sizes="72px"
                  />
                </div>
                <p className="mt-1.5 text-center text-base font-bold leading-tight text-[#3f6339] sm:text-lg">
                  {c.name}
                </p>
                <p className="mt-0.5 text-center text-xs leading-snug text-[#3f6339] sm:text-sm">
                  {blurb}
                </p>
              </>
            );

            if (onPick) {
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onPick(c.id)}
                  className="rounded-xl border border-[#e8dfd0] bg-white/70 px-2 py-2 transition hover:bg-white active:scale-[0.98] sm:rounded-2xl sm:px-2.5 sm:py-2.5"
                >
                  {inner}
                </button>
              );
            }

            return (
              <Link
                key={c.id}
                href={`/gesprek/${c.id}`}
                className="rounded-xl border border-[#e8dfd0] bg-white/70 px-2 py-2 transition hover:bg-white active:scale-[0.98] sm:rounded-2xl sm:px-2.5 sm:py-2.5"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
