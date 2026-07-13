type HartmaatjeBrandTitleProps = {
  variant?: "cover" | "header";
  className?: string;
};

const gradientClass =
  "bg-gradient-to-r from-[#7a1f2c] via-[#9a5518] via-50% to-[#153d66] bg-clip-text text-transparent";

/** Merknaam met regenboog-gradient — fijne witte rand rond de letters. */
export function HartmaatjeBrandTitle({
  variant = "header",
  className = "",
}: HartmaatjeBrandTitleProps) {
  const isCover = variant === "cover";
  const sizeClass = isCover
    ? "text-[1.65rem] sm:text-[1.9rem]"
    : "text-xl sm:text-2xl";

  return (
    <span
      className={`relative inline-block font-bold tracking-[0.05em] ${sizeClass} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 ${sizeClass} font-bold tracking-[0.05em] text-transparent`}
        style={{ WebkitTextStroke: "0.85px rgba(255,255,255,0.78)" }}
      >
        Hartmaatje
      </span>
      <span
        className={`relative ${gradientClass} ${sizeClass} font-bold tracking-[0.05em]`}
        style={{
          filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.38))",
        }}
      >
        Hartmaatje
      </span>
    </span>
  );
}
