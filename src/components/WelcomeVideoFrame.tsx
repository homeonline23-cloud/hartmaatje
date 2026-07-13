"use client";

import { useId, type ReactNode } from "react";
import {
  hartmaatjeGreenDepthClass,
  hartmaatjeGreenGradientClass,
} from "@/lib/hartmaatjeTheme";

const frameFill = `${hartmaatjeGreenGradientClass} ${hartmaatjeGreenDepthClass}`;

type WelcomeVideoFrameProps = {
  children: ReactNode;
  className?: string;
  /** Grootte van de concave hoek-insnijding (deel van beeld — groter = meer groen in de hoek). */
  scoopRadius?: number;
};

/**
 * Welkomstvideo met ingesneden hoeken: rechte videohoeken worden concave kwartbogen —
 * groen van het frame schijnt door. Maskeert hoek-watermerken en oogt bewust in balans.
 */
export function WelcomeVideoFrame({
  children,
  className = "",
  scoopRadius = 0.34,
}: WelcomeVideoFrameProps) {
  const maskId = `welcome-video-scoop-${useId().replace(/[^a-zA-Z0-9-_]/g, "")}`;
  const maskStyle = {
    WebkitMaskImage: `url(#${maskId})`,
    maskImage: `url(#${maskId})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
  } as const;

  return (
    <div className={`relative ${frameFill} ${className}`}>
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
      <div className="relative h-full w-full [&_video]:block [&_video]:h-full [&_video]:w-full" style={maskStyle}>
        {children}
      </div>
    </div>
  );
}
