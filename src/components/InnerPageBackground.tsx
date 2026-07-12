import { hartmaatjeGreenOverlayClass } from "@/lib/hartmaatjeTheme";

/** Regenboog-strand — alle pagina's behalve de voorpagina-boekkaft. */
export function InnerPageBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-[#1a4a6e]"
    >
      <img
        src="/site-background.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />
      <div className={`absolute inset-0 ${hartmaatjeGreenOverlayClass}`} />
    </div>
  );
}
