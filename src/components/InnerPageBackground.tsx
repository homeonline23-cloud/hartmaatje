import { hartmaatjeGreenOverlayClass } from "@/lib/hartmaatjeTheme";

/** Zelfde regenboog-cover als de voorpagina — op alle andere pagina's. */
export function InnerPageBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-[#0a2a18]"
    >
      <img
        src="/hartmaatje-cover.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />
      <div className={`absolute inset-0 ${hartmaatjeGreenOverlayClass}`} />
    </div>
  );
}
