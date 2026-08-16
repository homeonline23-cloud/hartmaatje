import Image from "next/image";
import { hartmaatjeGreenOverlayClass } from "@/lib/hartmaatjeTheme";

/** Zelfde regenboog-cover als de voorpagina — op alle andere pagina's. */
export function InnerPageBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-[#0a2a18]"
    >
      <Image
        src="/hartmaatje-cover.png"
        alt=""
        fill
        className="object-cover object-center"
        draggable={false}
        priority
      />
      <div className={`absolute inset-0 ${hartmaatjeGreenOverlayClass}`} />
    </div>
  );
}
