/** Site-wide bottom mark — every page (lifted above OS taskbar). */
export function SiteFooter() {
  return (
    <footer
      className="relative z-10 mb-10 px-4 pb-2 pt-2 text-center text-xs font-normal tracking-wide text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] sm:mb-12 sm:text-sm"
      aria-label="HartMaatje"
    >
      @Hartmaatje 2026
    </footer>
  );
}
