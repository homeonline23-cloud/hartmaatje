"use client";

import { type ReactNode } from "react";

const frameFill = "hm-dark-frame";

type WelcomeVideoFrameProps = {
  children: ReactNode;
  className?: string;
  /** Stable id fragment so SSR/client mask urls match (avoids hydration mismatch). */
  maskKey?: string;
  /** Concave corner scoop — hides Gemini/Google corner marks only. */
  scoopRadius?: number;
};

/**
 * Media frame with green scooped corners (Gemini marks only).
 * Media fills the frame (object-cover) — no black/green letterbox bars.
 */
export function WelcomeVideoFrame({
  children,
  className = "",
  maskKey = "welcome",
  scoopRadius = 0.26,
}: WelcomeVideoFrameProps) {
  const maskId = `welcome-video-scoop-${maskKey.replace(/[^a-zA-Z0-9-_]/g, "")}`;
  const maskStyle = {
    WebkitMaskImage: `url(#${maskId})`,
    maskImage: `url(#${maskId})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
  } as const;

  return (
    <div className={`relative overflow-hidden rounded-2xl ${frameFill} ${className}`}>
      <svg aria-hidden className="absolute size-0 overflow-hidden" width="0" height="0">
        <defs>
          <mask
            id={maskId}
            maskUnits="objectBoundingBox"
            maskContentUnits="objectBoundingBox"
          >
            <rect width="1" height="1" fill="white" />
            <circle cx="0" cy="0" r={scoopRadius} fill="black" />
            <circle cx="1" cy="0" r={scoopRadius} fill="black" />
            <circle cx="0" cy="1" r={scoopRadius} fill="black" />
            <circle cx="1" cy="1" r={scoopRadius} fill="black" />
          </mask>
        </defs>
      </svg>
      <div
        className="relative h-full w-full [&_video]:block [&_video]:h-full [&_video]:w-full [&_video]:object-cover [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
        style={maskStyle}
      >
        {children}
      </div>
    </div>
  );
}
