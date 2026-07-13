"use client";

import type { ReactNode } from "react";

/** Leesbaar paneel op donkere/regenboog-achtergrond. */
export function AppPagePanel({
  title,
  intro,
  centerTitle = false,
  children,
}: {
  title: string;
  intro?: string;
  centerTitle?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-[#faf6f0]/96 shadow-xl backdrop-blur-md">
      <div
        className={`px-5 py-4 sm:px-6 sm:py-5 ${
          children ? "border-b border-[#e8dfd0]/60" : "pb-10 sm:pb-12"
        }`}
      >
        <h1
          className={`text-3xl font-bold text-[#2c2416] sm:text-4xl ${
            centerTitle ? "text-center" : ""
          }`}
        >
          {title}
        </h1>
        {centerTitle ? (
          <div
            className="mx-auto mt-3 h-0.5 w-14 rounded-full bg-[#4a6741]/55"
            aria-hidden="true"
          />
        ) : null}
        {intro ? (
          <p className="mt-2 text-xl leading-relaxed text-[#5c4a32] sm:text-2xl">
            {intro}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="space-y-5 p-5 sm:space-y-6 sm:p-6">{children}</div>
      ) : null}
    </div>
  );
}
