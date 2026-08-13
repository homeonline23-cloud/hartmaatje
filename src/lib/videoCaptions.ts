import type { AppLang } from "@/i18n/config";
import type { CompanionId } from "@/lib/companions";

export type CaptionCue = {
  start: number;
  end: number;
  text: string;
};

type LangCaptions = Record<AppLang, CaptionCue[]>;

const WELCOME_SCRIPTS: Record<
  CompanionId,
  Record<AppLang, [string, string, string]>
> = {
  fenna: {
    nl: [
      "Hallo, ik ben Fenna.",
      "Fijn dat u er bent.",
      "Ik luister graag naar u.",
    ],
    en: [
      "Hello, I am Fenna.",
      "Lovely that you are here.",
      "I am happy to listen to you.",
    ],
    de: [
      "Hallo, ich bin Fenna.",
      "Schön, dass Sie da sind.",
      "Ich höre Ihnen gerne zu.",
    ],
    fr: [
      "Bonjour, je suis Fenna.",
      "Content que vous soyez là.",
      "J’écoute volontiers ce que vous dites.",
    ],
    es: [
      "Hola, soy Fenna.",
      "Qué bien que esté aquí.",
      "Me alegra escucharle.",
    ],
  },
  maarten: {
    nl: [
      "Hallo, ik ben Maarten.",
      "Fijn dat u er bent.",
      "We praten rustig, in uw tempo.",
    ],
    en: [
      "Hello, I am Maarten.",
      "Lovely that you are here.",
      "We talk calmly, at your pace.",
    ],
    de: [
      "Hallo, ich bin Maarten.",
      "Schön, dass Sie da sind.",
      "Wir sprechen ruhig, in Ihrem Tempo.",
    ],
    fr: [
      "Bonjour, je suis Maarten.",
      "Content que vous soyez là.",
      "Nous parlons calmement, à votre rythme.",
    ],
    es: [
      "Hola, soy Maarten.",
      "Qué bien que esté aquí.",
      "Hablamos con calma, a su ritmo.",
    ],
  },
  peter: {
    nl: [
      "Hallo, ik ben Peter.",
      "Fijn dat u er bent.",
      "Vertel gerust wat u bezighoudt.",
    ],
    en: [
      "Hello, I am Peter.",
      "Lovely that you are here.",
      "Feel free to share what is on your mind.",
    ],
    de: [
      "Hallo, ich bin Peter.",
      "Schön, dass Sie da sind.",
      "Erzählen Sie ruhig, was Sie beschäftigt.",
    ],
    fr: [
      "Bonjour, je suis Peter.",
      "Content que vous soyez là.",
      "Parlez librement de ce qui vous préoccupe.",
    ],
    es: [
      "Hola, soy Peter.",
      "Qué bien que esté aquí.",
      "Cuente con calma lo que le preocupa.",
    ],
  },
  colette: {
    nl: [
      "Hallo, ik ben Colette.",
      "Fijn dat u er bent.",
      "Ik ben er voor een rustig gesprek.",
    ],
    en: [
      "Hello, I am Colette.",
      "Lovely that you are here.",
      "I am here for a calm conversation.",
    ],
    de: [
      "Hallo, ich bin Colette.",
      "Schön, dass Sie da sind.",
      "Ich bin für ein ruhiges Gespräch da.",
    ],
    fr: [
      "Bonjour, je suis Colette.",
      "Content que vous soyez là.",
      "Je suis là pour une conversation calme.",
    ],
    es: [
      "Hola, soy Colette.",
      "Qué bien que esté aquí.",
      "Estoy aquí para una conversación tranquila.",
    ],
  },
};

/** Welcome clips are ~10s — three even cue windows. */
export function getWelcomeCaptions(
  companionId: CompanionId,
  lang: AppLang
): CaptionCue[] {
  const lines = WELCOME_SCRIPTS[companionId][lang];
  return [
    { start: 0.2, end: 3.2, text: lines[0] },
    { start: 3.2, end: 6.4, text: lines[1] },
    { start: 6.4, end: 10.0, text: lines[2] },
  ];
}

const STORY_SCRIPTS: LangCaptions = {
  nl: [
    {
      start: 0,
      end: 10,
      text: "Hallo, ik ben Peter. Ik vertel hoe HartMaatje is ontstaan.",
    },
    {
      start: 10,
      end: 22,
      text: "Veel ouderen voelen zich soms alleen — en online is vaak te druk.",
    },
    {
      start: 22,
      end: 34,
      text: "HartMaatje moest warm, rustig en menselijk aanvoelen.",
    },
    {
      start: 34,
      end: 46,
      text: "Geen kille chatbot, maar een maatje om mee te praten.",
    },
    {
      start: 46,
      end: 58,
      text: "Met herinneringen, aandacht en eenvoudige knoppen.",
    },
    {
      start: 58,
      end: 72,
      text: "U kiest een stem die bij u past — Fenna, Maarten, Colette of mij.",
    },
    {
      start: 72,
      end: 88.6,
      text: "Zo blijft er altijd iemand om naar te luisteren. Welkom bij HartMaatje.",
    },
  ],
  en: [
    {
      start: 0,
      end: 10,
      text: "Hello, I am Peter. I’ll tell you how HartMaatje began.",
    },
    {
      start: 10,
      end: 22,
      text: "Many older people feel lonely at times — and online life is often too busy.",
    },
    {
      start: 22,
      end: 34,
      text: "HartMaatje had to feel warm, calm, and human.",
    },
    {
      start: 34,
      end: 46,
      text: "Not a cold chatbot, but a companion to talk with.",
    },
    {
      start: 46,
      end: 58,
      text: "With memories, attention, and simple buttons.",
    },
    {
      start: 58,
      end: 72,
      text: "You choose a voice that suits you — Fenna, Maarten, Colette, or me.",
    },
    {
      start: 72,
      end: 88.6,
      text: "So there is always someone to listen. Welcome to HartMaatje.",
    },
  ],
  de: [
    {
      start: 0,
      end: 10,
      text: "Hallo, ich bin Peter. Ich erzähle, wie HartMaatje entstanden ist.",
    },
    {
      start: 10,
      end: 22,
      text: "Viele ältere Menschen fühlen sich manchmal allein — und Online-Leben ist oft zu hektisch.",
    },
    {
      start: 22,
      end: 34,
      text: "HartMaatje sollte warm, ruhig und menschlich wirken.",
    },
    {
      start: 34,
      end: 46,
      text: "Kein kalter Chatbot, sondern ein Begleiter zum Sprechen.",
    },
    {
      start: 46,
      end: 58,
      text: "Mit Erinnerungen, Aufmerksamkeit und einfachen Tasten.",
    },
    {
      start: 58,
      end: 72,
      text: "Sie wählen eine Stimme, die zu Ihnen passt — Fenna, Maarten, Colette oder mich.",
    },
    {
      start: 72,
      end: 88.6,
      text: "So gibt es immer jemanden, der zuhört. Willkommen bei HartMaatje.",
    },
  ],
  fr: [
    {
      start: 0,
      end: 10,
      text: "Bonjour, je suis Peter. Je raconte comment HartMaatje est né.",
    },
    {
      start: 10,
      end: 22,
      text: "Beaucoup de personnes âgées se sentent parfois seules — et le numérique est souvent trop agité.",
    },
    {
      start: 22,
      end: 34,
      text: "HartMaatje devait être chaleureux, calme et humain.",
    },
    {
      start: 34,
      end: 46,
      text: "Pas un chatbot froid, mais un compagnon pour parler.",
    },
    {
      start: 46,
      end: 58,
      text: "Avec des souvenirs, de l’attention et des boutons simples.",
    },
    {
      start: 58,
      end: 72,
      text: "Vous choisissez une voix qui vous convient — Fenna, Maarten, Colette ou moi.",
    },
    {
      start: 72,
      end: 88.6,
      text: "Ainsi, il y a toujours quelqu’un pour écouter. Bienvenue chez HartMaatje.",
    },
  ],
  es: [
    {
      start: 0,
      end: 10,
      text: "Hola, soy Peter. Les cuento cómo nació HartMaatje.",
    },
    {
      start: 10,
      end: 22,
      text: "Muchas personas mayores se sienten solas a veces — y lo online suele ser demasiado agitado.",
    },
    {
      start: 22,
      end: 34,
      text: "HartMaatje tenía que sentirse cálido, tranquilo y humano.",
    },
    {
      start: 34,
      end: 46,
      text: "No un chatbot frío, sino un compañero con quien hablar.",
    },
    {
      start: 46,
      end: 58,
      text: "Con recuerdos, atención y botones sencillos.",
    },
    {
      start: 58,
      end: 72,
      text: "Usted elige una voz que le convenga — Fenna, Maarten, Colette o yo.",
    },
    {
      start: 72,
      end: 88.6,
      text: "Así siempre hay alguien que escucha. Bienvenido a HartMaatje.",
    },
  ],
};

export function getStoryCaptions(lang: AppLang): CaptionCue[] {
  return STORY_SCRIPTS[lang];
}

export function activeCaptionText(
  cues: CaptionCue[],
  currentTime: number
): string {
  for (const cue of cues) {
    if (currentTime >= cue.start && currentTime < cue.end) return cue.text;
  }
  return "";
}
