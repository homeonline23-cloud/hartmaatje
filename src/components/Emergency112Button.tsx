"use client";

import { useLanguage } from "@/context/LanguageContext";

export function Emergency112Button() {
  const { app } = useLanguage();
  const copy = app.emergency;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex w-[10.5rem] flex-col items-center overflow-visible"
      aria-hidden={false}
    >
      <a
        href="tel:112"
        aria-label={copy.ariaLabel}
        className="relative z-10 flex h-16 w-16 touch-manipulation items-center justify-center rounded-full bg-red-600 text-2xl font-bold text-white shadow-[0_0_0_3px_#fff,0_0_0_5px_#dc2626,0_0_18px_rgba(220,38,38,0.55)] transition active:scale-95"
      >
        112
      </a>
      <svg
        className="pointer-events-none -mt-2 h-[3.25rem] w-full overflow-visible"
        viewBox="-6 0 212 62"
        aria-hidden="true"
      >
        <defs>
          <path id="emergency-arc" d="M 18,10 Q 100,62 182,10" />
        </defs>
        <text
          fill="#ffffff"
          fontSize="15"
          fontWeight="700"
          letterSpacing="0.05em"
          stroke="#000000"
          strokeWidth="3"
          paintOrder="stroke fill"
        >
          <textPath href="#emergency-arc" startOffset="50%" textAnchor="middle">
            {copy.arcText}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
