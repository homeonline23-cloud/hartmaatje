/** Zachte regenboogboog — alleen achter het logo, scrollt mee met de header. */
export function LogoRainbowHalo() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-[38%] z-0 w-[19rem] max-w-[110vw] -translate-x-1/2 -translate-y-1/2 sm:w-[22rem]"
      viewBox="0 0 360 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logo-rainbow-fade" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#e8a0a8" stopOpacity="0" />
          <stop offset="15%" stopColor="#e8a0a8" stopOpacity="0.55" />
          <stop offset="30%" stopColor="#e8c890" stopOpacity="0.6" />
          <stop offset="45%" stopColor="#e8e8b0" stopOpacity="0.55" />
          <stop offset="58%" stopColor="#98d8b0" stopOpacity="0.58" />
          <stop offset="72%" stopColor="#88b8e0" stopOpacity="0.6" />
          <stop offset="86%" stopColor="#a898d8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#c898d0" stopOpacity="0" />
        </linearGradient>
        <filter id="logo-rainbow-blur" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <path
        d="M 20 170 Q 180 20 340 170"
        stroke="url(#logo-rainbow-fade)"
        strokeWidth="28"
        strokeLinecap="round"
        filter="url(#logo-rainbow-blur)"
        opacity="0.85"
      />
      <path
        d="M 40 160 Q 180 45 320 160"
        stroke="url(#logo-rainbow-fade)"
        strokeWidth="12"
        strokeLinecap="round"
        filter="url(#logo-rainbow-blur)"
        opacity="0.5"
      />
    </svg>
  );
}
