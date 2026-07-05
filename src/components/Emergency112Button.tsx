export function Emergency112Button() {
  return (
    <div
      className="fixed bottom-5 right-5 z-50 h-[7.75rem] w-[7.75rem]"
      aria-hidden={false}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 120 120"
        aria-hidden="true"
      >
        <defs>
          <path
            id="emergency-ring-text"
            d="M 60,60 m -46,0 a 46,46 0 1,1 92,0 a 46,46 0 1,1 -92,0"
          />
        </defs>
        <text
          fill="#ffffff"
          fontSize="10.75"
          fontWeight="700"
          letterSpacing="0.08em"
          className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
        >
          <textPath
            href="#emergency-ring-text"
            startOffset="50%"
            textAnchor="middle"
          >
            Press for Emergency Only
          </textPath>
        </text>
      </svg>
      <a
        href="tel:112"
        aria-label='Press for Emergency Only — bel 112'
        className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 text-xl font-bold text-white shadow-[0_0_0_3px_#fff,0_0_0_5px_#dc2626,0_0_18px_rgba(220,38,38,0.55)] transition hover:scale-105 hover:bg-red-700 active:scale-95"
      >
        112
      </a>
    </div>
  );
}
