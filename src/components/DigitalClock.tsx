"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import { useI18n } from "@/i18n/LanguageProvider";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/** Compact clock — same chrome as nav buttons when asWindow. */
export function DigitalClock({
  asWindow = false,
  size = "nav",
}: {
  asWindow?: boolean;
  size?: "nav" | "cover";
}) {
  const { t } = useI18n();
  // Always start empty on server + first client paint to avoid locale/time hydration mismatches.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [now, setNow] = useState(() =>
    typeof window !== "undefined" ? new Date() : new Date(0),
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const time = mounted
    ? `${pad(now.getHours())}:${pad(now.getMinutes())}`
    : "--:--";
  const dateLabel = mounted
    ? `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`
    : "";

  if (asWindow) {
    const tall =
      size === "cover"
        ? "!min-h-[3.5rem] !px-2 !py-2.5"
        : "!min-h-11 !px-1.5 !py-2";

    return (
      <div
        className={`hm-btn hm-btn-secondary !flex w-full min-w-0 !flex-wrap items-center justify-center gap-x-1.5 gap-y-0 text-center !text-xl font-bold ${tall}`}
        aria-label={t.clock.aria}
        suppressHydrationWarning
      >
        <span
          className="shrink-0 rounded-lg bg-white px-1.5 py-0.5 !text-xl font-bold tabular-nums tracking-wide text-[#3f6339] shadow-md"
          suppressHydrationWarning
        >
          {time}
        </span>
        {dateLabel ? (
          <span
            className="shrink-0 !text-xl font-bold tabular-nums tracking-wide text-white"
            suppressHydrationWarning
          >
            {dateLabel}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <p className="text-sm font-semibold text-white" suppressHydrationWarning>
      {time}
    </p>
  );
}
