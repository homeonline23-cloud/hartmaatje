type HartmaatjeBrandTitleProps = {
  variant?: "cover" | "header";
  className?: string;
};

/**
 * Merknaam zoals op de cover:
 * Hart = warm oranje → rood, m = wit, aatje = ijsblauw → zachtblauw.
 * Same size on frontpage and all other pages.
 */
const hartClass =
  "bg-gradient-to-r from-[#ffb07a] via-[#f07848] to-[#e0452f] bg-clip-text text-transparent";
const maatjeClass =
  "bg-gradient-to-r from-[#eaf6ff] via-[#a8d0f0] to-[#5b9fd4] bg-clip-text text-transparent";

const sizeClass = "text-3xl sm:text-4xl";

export function HartmaatjeBrandTitle({
  variant: _variant = "header",
  className = "",
}: HartmaatjeBrandTitleProps) {
  void _variant;

  return (
    <span
      className={`relative inline-block font-bold tracking-[0.05em] ${sizeClass} ${className}`}
      style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.55))" }}
      aria-label="Hartmaatje"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 ${sizeClass} font-bold tracking-[0.05em] text-transparent`}
        style={{ WebkitTextStroke: "0.9px rgba(20, 55, 90, 0.35)" }}
      >
        Hartmaatje
      </span>
      <span className="relative" aria-hidden="true">
        <span className={`${hartClass} ${sizeClass} font-bold tracking-[0.05em]`}>
          Hart
        </span>
        <span className={`${sizeClass} font-bold tracking-[0.05em] text-white`}>
          m
        </span>
        <span className={`${maatjeClass} ${sizeClass} font-bold tracking-[0.05em]`}>
          aatje
        </span>
      </span>
    </span>
  );
}
