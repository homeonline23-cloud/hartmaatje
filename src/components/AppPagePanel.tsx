"use client";

import type { ReactNode } from "react";

/** Leesbaar paneel op donkere/regenboog-achtergrond. */
export function AppPagePanel({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-[#faf6f0]/96 shadow-xl backdrop-blur-md">
      <div className="border-b border-[#e8dfd0]/60 px-5 py-4 sm:px-6 sm:py-5">
        <h1 className="text-2xl font-bold text-[#2c2416] sm:text-3xl">{title}</h1>
        {intro ? (
          <p className="mt-2 text-lg leading-relaxed text-[#5c4a32] sm:text-xl">
            {intro}
          </p>
        ) : null}
      </div>
      <div className="space-y-5 p-5 sm:space-y-6 sm:p-6">{children}</div>
    </div>
  );
}
