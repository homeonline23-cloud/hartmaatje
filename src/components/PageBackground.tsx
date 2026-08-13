/** Nature cover + green overlay — same look as existing Hartmaatje. */
export function PageBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-[#0a2a18]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hartmaatje-cover.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />
      <div className="hm-overlay absolute inset-0" />
    </div>
  );
}
