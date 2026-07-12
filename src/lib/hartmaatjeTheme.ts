/**
 * HartMaatje donkergroen — Deep Forest → Pine Teal, met diepte-effect.
 * Eén kleur overal: knoppen, badges, video-achtergrond, portretvlak.
 */
export const HM_GREEN_FROM = "#05381F";
export const HM_GREEN_TO = "#1B493C";

export const hartmaatjeGreenGradientClass =
  "bg-gradient-to-br from-[#05381F] to-[#1B493C]";

/** Diepte in de kleur — licht bovenin, zachte schaduw binnenin. */
export const hartmaatjeGreenDepthClass =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-4px_14px_rgba(0,0,0,0.28),0_8px_22px_rgba(5,56,31,0.42)]";

export const hartmaatjeGreenSurfaceClass = `${hartmaatjeGreenGradientClass} ${hartmaatjeGreenDepthClass}`;

export const hartmaatjeGreenButtonClass = `${hartmaatjeGreenSurfaceClass} rounded-2xl font-bold text-white transition hover:brightness-[1.08] active:scale-[0.98] disabled:!from-[#b8a888] disabled:!to-[#b8a888] disabled:brightness-100 disabled:shadow-none`;

/** Zachte groene tint over achtergrondafbeeldingen. */
export const hartmaatjeGreenOverlayClass =
  "bg-gradient-to-b from-[#05381F]/22 via-transparent to-[#1B493C]/38";

/** Portret-ring — zelfde groen voor Maarten, Peter, Fenna, Colette. */
export const hartmaatjePortraitRingClass =
  "bg-gradient-to-br from-[#05381F] to-[#1B493C]";
