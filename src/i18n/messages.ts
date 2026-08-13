import type { AppLang } from "@/i18n/config";
import type { CompanionId } from "@/lib/companions";

export type Messages = {
  meta: {
    title: string;
    description: string;
  };
  brand: {
    tagline: string;
  };
  cover: {
    welcomeLine1: string;
    welcomeLine2: string;
    startChat: string;
    coverAlt: string;
    introAria: string;
    introPlay: string;
  };
  lang: {
    pickerLabel: string;
    pickerTitle: string;
    current: (name: string) => string;
  };
  nav: {
    home: string;
    about: string;
    companions: string;
    pricing: string;
    memory: string;
    settings: string;
    languages: string;
    listenToStories: string;
    dubber: string;
    mainNav: string;
  };
  dubber: {
    title: string;
    subtitle: string;
    online: string;
    offline: string;
    pickVideo: string;
    sourceLang: string;
    targetLang: string;
    targetLangsHint: string;
    selectAllTargets: string;
    pickCompanion: string;
    autoVoice: string;
    start: string;
    working: string;
    download: string;
    hint: string;
    needFile: string;
    needDifferentLang: string;
    startFailed: string;
    statusQueued: string;
    statusRunning: string;
    statusDone: string;
    statusError: string;
    saveStoryTitle: string;
    saveStoryPick: string;
    saveStoryBtn: string;
    saveStoryWorking: string;
    saveStoryOk: string;
    saveStoryFail: string;
  };
  frontDesk: {
    aria: string;
    label: string;
    connecting: string;
    roomLabel: string;
    settingsTitle: string;
    settingsLabel: string;
    settingsDescription: string;
    settingsPlaceholder: string;
    settingsRoomLabel: string;
    settingsSave: string;
    settingsSaved: string;
    settingsEnterHint: string;
  };
  clock: {
    aria: string;
  };
  home: {
    chooseCompanion: string;
    tapPortrait: string;
    welcome: string;
    chooseFits: string;
  };
  companions: Record<
    CompanionId,
    {
      blurb: string;
    }
  >;
  conversation: {
    withName: (name: string) => string;
    intro: (name: string) => string;
    welcomeVideoHint: string;
    welcomeVideoContinue: string;
    backToCompanions: string;
    transcript: string;
    transcriptEmpty: string;
    spokenPending: string;
    live: string;
    intent: (label: string) => string;
    answer: string;
    map: string;
    mic: string;
    stopSpeaking: string;
    holdToTalk: string;
    releaseToSend: string;
    processingVoice: string;
    keepTalking: string;
    didNotCatch: string;
    startVoiceChat: string;
    welcomeGreeting: (name: string) => string;
    closeChat: string;
    chatClosed: string;
    sayCloseHint: string;
    openingMic: string;
    typingOptional: string;
    interrupt: string;
    typeLabel: string;
    typePlaceholder: (name: string) => string;
    sendAsSpeech: string;
    debugEvents: (n: number) => string;
    sessionShort: (id: string) => string;
  };
  status: {
    starting: string;
    startingSession: string;
    connecting: string;
    ready: string;
    listening: string;
    retrieving: string;
    idle: string;
    recording: string;
    transcribing: string;
    thinking: string;
    speaking: string;
    interrupted: string;
    errorRecoverable: string;
    reconnecting: string;
    connectionError: string;
    error: string;
    fsm: Record<string, string>;
  };
  errors: {
    noServer: string;
    sessionFailed: string;
    generic: string;
    micDenied: string;
    micBlockedHelp: string;
  };
  about: {
    title: string;
    body: string;
    introductionTitle: string;
    aloneTitle: string;
  };
  stories: {
    subtitle: string;
    pickStory: string;
    pickCompanion: string;
    readAloud: string;
    stop: string;
    reading: string;
    needBoth: string;
    preparingVoice: string;
    voiceUnavailable: string;
    storyList: string;
    comingSoon: string;
  };
  pricing: {
    title: string;
    body: string;
    tryTitle: string;
    tryBody: string;
    monthlyTitle: string;
    monthlyBody: string;
  };
  memory: {
    title: string;
    body: string;
    empty: string;
  };
  cinema: {
    pickCompanion: string;
    askTitle: string;
    choiceHint: string;
    emptyHint: string;
    closeWindow: string;
    talkHint: (name: string) => string;
    askAnywhereTitle: string;
    askAnywhereBody: (name: string) => string;
    fitnessSectionTitle: string;
    fitnessSectionHint: string;
    liveWaiting: string;
    liveHint: string;
    noInternet: string;
    micHint: string;
    micListening: string;
    micNoMatch: string;
    micUnsupported: string;
    micSearching: string;
    micSearchFailed: string;
    categories: {
      nature: string;
      landscapes: string;
      beaches: string;
      forests: string;
      mountains: string;
      villages: string;
      animals: string;
      gardens: string;
    };
    featureSlots: {
      stoelWorkout: string;
      fitnessOefeningen: string;
      seniorDanceFitness: string;
      taichiWorkout: string;
    };
  };
  settings: {
    title: string;
    body: string;
    volume: string;
    mic: string;
    language: string;
    backToSettings: string;
    dubberTitle: string;
    dubberLink: string;
  };
  media: {
    captionsOn: string;
    audioFallback: (audioLang: string, textLang: string) => string;
    storyCaption: string;
    storyPlay: string;
    welcomeAria: (name: string) => string;
  };
};

const nl: Messages = {
  meta: {
    title: "HartMaatje",
    description:
      "HartMaatje is uw warme maatje in huis  -  warm praten, luisteren en dagelijks contact.",
  },
  brand: {
    tagline: "Uw warme maatje in huis.",
  },
  cover: {
    welcomeLine1: "Een warm maatje voor rust,",
    welcomeLine2: "gezelschap en oprechte aandacht.",
    startChat: "Start Gesprek.",
    coverAlt: "HartMaatje  -  regenboog aan zee",
    introAria: "HartMaatje introductievideo",
    introPlay: "Speel introductievideo",
  },
  lang: {
    pickerLabel: "Taal",
    pickerTitle: "Kies uw taal",
    current: (name) => `Huidige taal: ${name}`,
  },
  nav: {
    home: "Home",
    about: "Over",
    companions: "Kies uw maatje",
    pricing: "Zaken & Groei",
    memory: "Movie/Fitness\nOefening Kamer",
    settings: "Instellingen",
    languages: "Talen",
    listenToStories: "Verhalen kamer",
    dubber: "Video dubben",
    mainNav: "Hoofdnavigatie",
  },
  dubber: {
    title: "Video nasynchroniseren",
    subtitle:
      "Upload een video, kies de taal en uw maatje. HartMaatje maakt de nasynchronisatie.",
    online: "Dubber is klaar voor gebruik.",
    offline: "Dubber-dienst is niet bereikbaar. Probeer later opnieuw.",
    pickVideo: "Kies uw video",
    sourceLang: "Taal in de video",
    targetLang: "Nieuwe talen (meerdere mogelijk)",
    targetLangsHint: "Kies alle talen die u tegelijk wilt — zoals EN, DE, FR, ES.",
    selectAllTargets: "Alle talen",
    pickCompanion: "Stem van welk maatje?",
    autoVoice: "Automatisch",
    start: "Start dubbing",
    working: "Bezig met dubbing… even geduld",
    download: "Download de nieuwe video",
    hint: "Dit kan enkele minuten tot langer duren. Laat dit scherm open.",
    needFile: "Kies eerst een videobestand.",
    needDifferentLang: "Kies twee verschillende talen.",
    startFailed: "Dubbing kon niet starten.",
    statusQueued: "In de wachtrij…",
    statusRunning: "Bezig…",
    statusDone: "Klaar!",
    statusError: "Er ging iets mis.",
    saveStoryTitle: "Gebruik deze stem in Verhalen kamer",
    saveStoryPick: "Kies het verhaal",
    saveStoryBtn: "Opslaan voor Verhalen",
    saveStoryWorking: "Opslaan…",
    saveStoryOk: "Opgeslagen. Open Verhalen kamer en kies dit maatje.",
    saveStoryFail: "Opslaan voor Verhalen mislukt.",
  },
  frontDesk: {
    aria: "Bel de balie",
    label: "Bel Balie",
    connecting: "Verbinding maken met de balie...",
    roomLabel: "Kamer",
    settingsTitle: "Bel Balie instellen",
    settingsLabel: "Telefoonnummer Bel Balie",
    settingsDescription:
      "Voer het telefoonnummer in voor de rode knop. Zodra een gebruiker drukt, wordt er direct verbinding gemaakt. Gebruik het internationale formaat.",
    settingsPlaceholder: "+62 811 XXXX XXXX",
    settingsRoomLabel: "Kamernummer (optioneel)",
    settingsSave: "Opslaan",
    settingsSaved: "Opgeslagen!",
    settingsEnterHint: "Druk op Enter om te bewaren",
  },
  clock: {
    aria: "Klok",
  },
  home: {
    chooseCompanion: "Kies uw maatje",
    tapPortrait: "Tik op een portret om te beginnen.",
    welcome: "Welkom. U mag rustig praten.",
    chooseFits: "Uw rustige maatje aan huis  -  kies wie bij u past.",
  },
  companions: {
    fenna: { blurb: "Zacht, licht en bemoedigend." },
    maarten: { blurb: "Rustig, stabiel en vertrouwd." },
    peter: { blurb: "Warm, nuchter en menselijk." },
    colette: { blurb: "Kalm, liefdevol en waardig." },
  },
  conversation: {
    withName: (name) => `Gesprek met ${name}`,
    intro: (name) => `Ik ben ${name}`,
    welcomeVideoHint: "Even kijken  -  uw maatje stelt zich voor.",
    welcomeVideoContinue: "Doorgaan naar gesprek",
    backToCompanions: "Terug naar maatjes",
    transcript: "Transcript",
    transcriptEmpty: "Wat u zegt, verschijnt hier...",
    spokenPending: "[Gesproken bericht…]",
    live: "live...",
    intent: (label) => `Intent: ${label}`,
    answer: "Antwoord",
    map: "Kaart",
    mic: "Microfoon",
    stopSpeaking: "Stop spreken",
    holdToTalk: "Houd in om te praten",
    releaseToSend: "Laat los om te versturen",
    processingVoice: "Even luisteren en antwoorden...",
    keepTalking: "Microfoon aan, praat gerust",
    didNotCatch: "Ik verstond u niet goed. Probeer het nog eens rustig.",
    startVoiceChat: "Start gesprek",
    welcomeGreeting: (name) =>
      `Hallo, ik ben ${name}. Fijn dat u er bent. Hoe gaat het met u?`,
    closeChat: "Sluit gesprek",
    chatClosed: "Gesprek gesloten",
    sayCloseHint: "Zeg 'sluit gesprek' of tik op de knop hieronder.",
    openingMic: "Microfoon wordt geopend...",
    typingOptional: "Typen (alleen als het echt nodig is)",
    interrupt: "Onderbreken",
    typeLabel: "Of typ een zin",
    typePlaceholder: (name) => `Zeg iets tegen ${name}...`,
    sendAsSpeech: "Stuur als gesproken zin",
    debugEvents: (n) => `Debug events (${n})`,
    sessionShort: (id) => `sessie ${id}...`,
  },
  status: {
    starting: "Starten...",
    startingSession: "Sessie starten...",
    connecting: "Verbinden...",
    ready: "Klaar om te praten",
    listening: "U praat...",
    retrieving: "Kennis ophalen...",
    idle: "Inactief",
    recording: "Luisteren...",
    transcribing: "Uitwerken...",
    thinking: "Nadenken...",
    speaking: "Spreken...",
    interrupted: "Onderbroken",
    errorRecoverable: "Even geduld...",
    reconnecting: "Opnieuw verbinden...",
    connectionError: "Verbindingsfout",
    error: "Fout",
    fsm: {
      IDLE: "Inactief",
      READY: "Klaar",
      LISTENING: "Luisteren...",
      TRANSCRIBING: "Uitwerken...",
      THINKING: "Nadenken...",
      SPEAKING: "Spreken...",
      SPEAKING_INTERRUPTED: "Onderbroken",
      ERROR_RECOVERABLE: "Even geduld...",
      RECONNECTING: "Opnieuw verbinden...",
    },
  },
  errors: {
    noServer:
      "Geen verbinding met de server. Controleer uw internet en herlaad https://hartmaatje.app.",
    sessionFailed:
      "Kon geen stemgesprek starten. Herlaad de pagina en probeer opnieuw.",
    generic: "Er ging iets mis. Probeer opnieuw.",
    micDenied: "Microfoon geblokkeerd",
    micBlockedHelp:
      "Android (Samsung):\n1. Open HartMaatje in Chrome of Samsung Internet (niet WhatsApp/Facebook).\n2. Tik Toestaan als Android om de microfoon vraagt.\n3. Of: Instellingen → Apps → Chrome → Machtigingen → Microfoon → Toestaan.\n4. In de browser: slotje naast de adresbalk → Microfoon Toestaan → herlaad.\n\niPhone (Safari):\n1. Tik Toestaan als Safari vraagt.\n2. Of: Instellingen → Safari → Microfoon → Toestaan.\n3. Herlaad en tik opnieuw Aan.\n\nComputer (Chrome/Edge):\n1. Slotje links in de adresbalk → Microfoon → Toestaan.\n2. Herlaad de pagina.",
  },
  about: {
    title: "Over HartMaatje",
    body: "HartMaatje is een warme, persoonlijke voice-assistent voor ouderen.\nGeen kille chatbot  -  een rustig maatje om mee te praten, met herinneringen, reminders en eenvoudige ondersteuning.",
    introductionTitle: "Maak Kennis met Zoete Dromen",
    aloneTitle: "Alleen en Eenzaam!",
  },
  stories: {
    subtitle: "Kies een verhaal. Daarna kiest u een maatje dat het voorleest.",
    pickStory: "Kies een verhaal",
    pickCompanion: "Wie mag voorlezen?",
    readAloud: "Voorlezen",
    stop: "Stop",
    reading: "Voorlezen…",
    needBoth: "Kies eerst een verhaal en een maatje.",
    preparingVoice: "Stem van uw maatje laden…",
    voiceUnavailable: "De stem van dit maatje is nu niet beschikbaar. Probeer zo opnieuw — geen robotstem.",
    storyList: "Verhalenlijst",
    comingSoon: "Binnenkort beschikbaar",
  },
  pricing: {
    title: "Prijs",
    body: "Eenvoudige abonnementen komen hier. Eerst bouwen we de rustige ervaring  -  daarna heldere prijzen zonder kleine lettertjes.",
    tryTitle: "Kennismaken",
    tryBody: "Probeer HartMaatje rustig uit.",
    monthlyTitle: "Maandelijks",
    monthlyBody: "Vast maatje, herinneringen en support.",
  },
  memory: {
    title: "Geheugen",
    body: "Hier komen later herinneringen, namen en favoriete onderwerpen  -  zodat uw maatje u beter kent. Nu nog een lege plek in de layout.",
    empty: "Nog geen opgeslagen herinneringen.",
  },
  cinema: {
    pickCompanion: "Kies U Maatje!",
    askTitle: "Wat kan ik u vandaag laten zien?",
    choiceHint: "Tik een knop  -  of vraag gewoon hardop waar u naartoe wilt.",
    emptyHint: "Kies hierboven een plek, of vraag het aan uw maatje.",
    closeWindow: "Sluit venster",
    talkHint: (name) =>
      `${name} blijft bij u  -  u mag gewoon mepraten terwijl u kijkt.`,
    askAnywhereTitle: "Wat mag ik u vandaag laten zien?",
    askAnywhereBody: () => "",
    fitnessSectionTitle: "Gymnastiek - Fitness - Taichi Workout",
    fitnessSectionHint:
      "Video’s worden afgespeeld via YouTube. Beweeg op uw eigen\ntempo en stop bij pijn of duizeligheid.",
    liveWaiting: "Even wachten op live verbinding...",
    liveHint: "Hier komt straks het live beeld.",
    noInternet:
      "Geen internetverbinding. Controleer Wi‑Fi en probeer opnieuw.",
    micHint: "Spreek om iets anders te zien.",
    micListening: "Ik luister, zeg wat u wilt zien...",
    micNoMatch:
      "Dat ken ik nog niet. Probeer het nog eens, of kies hierboven een knop.",
    micUnsupported:
      "Spraakherkenning is niet beschikbaar. Kies hierboven een knop.",
    micSearching: "Even zoeken op YouTube...",
    micSearchFailed:
      "Ik kon niets passends vinden. Probeer het anders, of kies hierboven een knop.",
    categories: {
      nature: "Ontspannende muziektherapie",
      landscapes: "Diepzeedieren",
      beaches: "Wonderen van de Caraïbische eilanden",
      forests: "Vogels in de Amazone",
      mountains: "Greece",
      villages: "Brazile",
      animals: "Wildlife documentaire",
      gardens: "Italy Bloeiende Tuinen",
    },
    featureSlots: {
      stoelWorkout: "Stoel Workout",
      fitnessOefeningen: "Fitness Oefeningen",
      seniorDanceFitness: "Senior Dance Fitness 30min",
      taichiWorkout: "Taichi Workout",
    },
  },
  settings: {
    title: "Instellingen",
    body: "Volume, stem en taal komen hier. Grote knoppen, weinig keuzes  -  gemaakt voor rustig bedienen op tablet.",
    volume: "Stemvolume",
    mic: "Microfoon",
    language: "Taal",
    backToSettings: "Terug naar Instellingen",
    dubberTitle: "Video dubben",
    dubberLink: "Open video nasynchronisatie →",
  },
  media: {
    captionsOn: "Ondertiteling aan",
    audioFallback: (audioLang, textLang) =>
      `Stem: ${audioLang}  ·  tekst: ${textLang}`,
    storyCaption: "Peter vertelt hoe HartMaatje is ontstaan.",
    storyPlay: "Speel video af",
    welcomeAria: (name) => `${name} introductie`,
  },
};

const en: Messages = {
  meta: {
    title: "HartMaatje",
    description:
      "HartMaatje is your calm companion at home  -  warm conversation, listening, and daily contact.",
  },
  brand: {
    tagline: "Your warm companion at home.",
  },
  cover: {
    welcomeLine1: "A warm companion for calm,",
    welcomeLine2: "company, and genuine attention.",
    startChat: "Start conversation",
    coverAlt: "HartMaatje  -  rainbow by the sea",
    introAria: "HartMaatje introduction video",
    introPlay: "Play introduction video",
  },
  lang: {
    pickerLabel: "Language",
    pickerTitle: "Choose your language",
    current: (name) => `Current language: ${name}`,
  },
  nav: {
    home: "Home",
    about: "About",
    companions: "Choose your companion",
    pricing: "Business & Growth",
    memory: "Movie/Fitness\nExercise Room",
    settings: "Settings",
    languages: "Language",
    listenToStories: "Stories room",
    dubber: "Dub video",
    mainNav: "Main navigation",
  },
  dubber: {
    title: "Dub a video",
    subtitle:
      "Upload a video, choose the language and companion. HartMaatje creates the dub.",
    online: "Dubber is ready.",
    offline: "Dubber service is unavailable. Please try again later.",
    pickVideo: "Choose your video",
    sourceLang: "Language in the video",
    targetLang: "New languages (select several)",
    targetLangsHint: "Choose every language you want at once — e.g. EN, DE, FR, ES.",
    selectAllTargets: "All languages",
    pickCompanion: "Which companion's voice?",
    autoVoice: "Automatic",
    start: "Start dubbing",
    working: "Dubbing in progress… please wait",
    download: "Download the new video",
    hint: "This can take several minutes or longer. Keep this page open.",
    needFile: "Please choose a video file first.",
    needDifferentLang: "Please choose two different languages.",
    startFailed: "Could not start dubbing.",
    statusQueued: "Queued…",
    statusRunning: "Working…",
    statusDone: "Done!",
    statusError: "Something went wrong.",
    saveStoryTitle: "Use this voice in the Stories room",
    saveStoryPick: "Choose the story",
    saveStoryBtn: "Save for Stories",
    saveStoryWorking: "Saving…",
    saveStoryOk: "Saved. Open Stories and pick this companion.",
    saveStoryFail: "Could not save for Stories.",
  },
  frontDesk: {
    aria: "Call the front desk",
    label: "Call Desk",
    connecting: "Connecting to the front desk...",
    roomLabel: "Room",
    settingsTitle: "Set up Call Desk",
    settingsLabel: "Front desk phone number",
    settingsDescription:
      "Enter the phone number for the red button. As soon as a user presses it, a call is placed immediately. Use international format.",
    settingsPlaceholder: "+62 811 XXXX XXXX",
    settingsRoomLabel: "Room number (optional)",
    settingsSave: "Save",
    settingsSaved: "Saved!",
    settingsEnterHint: "Press Enter to save",
  },
  clock: {
    aria: "Clock",
  },
  home: {
    chooseCompanion: "Choose your companion",
    tapPortrait: "Tap a portrait to begin.",
    welcome: "Welcome. You may speak at your own pace.",
    chooseFits: "Your calm companion at home  -  choose who suits you.",
  },
  companions: {
    fenna: { blurb: "Soft, light, and encouraging." },
    maarten: { blurb: "Calm, steady, and trusted." },
    peter: { blurb: "Warm, down-to-earth, and human." },
    colette: { blurb: "Calm, caring, and dignified." },
  },
  conversation: {
    withName: (name) => `Conversation with ${name}`,
    intro: (name) => `I am ${name}`,
    welcomeVideoHint: "Watch  -  your companion introduces themselves.",
    welcomeVideoContinue: "Continue to conversation",
    backToCompanions: "Back to companions",
    transcript: "Transcript",
    transcriptEmpty: "What you say appears here...",
    spokenPending: "[Spoken message…]",
    live: "live...",
    intent: (label) => `Intent: ${label}`,
    answer: "Reply",
    map: "Map",
    mic: "Microphone",
    stopSpeaking: "Stop speaking",
    holdToTalk: "Hold to talk",
    releaseToSend: "Release to send",
    processingVoice: "Listening and answering...",
    keepTalking: "I'm listening",
    didNotCatch: "I did not catch that. Please try again calmly.",
    startVoiceChat: "Start conversation",
    welcomeGreeting: (name) =>
      `Hello, I am ${name}. Lovely that you are here. How are you?`,
    closeChat: "Close chat",
    chatClosed: "Chat closed",
    sayCloseHint: "Say 'close chat' or tap the button below.",
    openingMic: "Opening microphone...",
    typingOptional: "Typing (only if you really need it)",
    interrupt: "Interrupt",
    typeLabel: "Or type a sentence",
    typePlaceholder: (name) => `Say something to ${name}...`,
    sendAsSpeech: "Send as spoken sentence",
    debugEvents: (n) => `Debug events (${n})`,
    sessionShort: (id) => `session ${id}...`,
  },
  status: {
    starting: "Starting...",
    startingSession: "Starting session...",
    connecting: "Connecting...",
    ready: "Ready to talk",
    listening: "You're speaking...",
    retrieving: "Fetching knowledge...",
    idle: "Idle",
    recording: "Listening...",
    transcribing: "Working it out...",
    thinking: "Thinking...",
    speaking: "Speaking...",
    interrupted: "Interrupted",
    errorRecoverable: "One moment...",
    reconnecting: "Reconnecting...",
    connectionError: "Connection error",
    error: "Error",
    fsm: {
      IDLE: "Idle",
      READY: "Ready",
      LISTENING: "Listening...",
      TRANSCRIBING: "Working it out...",
      THINKING: "Thinking...",
      SPEAKING: "Speaking...",
      SPEAKING_INTERRUPTED: "Interrupted",
      ERROR_RECOVERABLE: "One moment...",
      RECONNECTING: "Reconnecting...",
    },
  },
  errors: {
    noServer:
      "No connection to the server. Check your internet and reload https://hartmaatje.app.",
    sessionFailed:
      "Could not start voice chat. Reload the page and try again.",
    generic: "Something went wrong. Please try again.",
    micDenied: "Microphone blocked",
    micBlockedHelp:
      "Android (Samsung):\n1. Open HartMaatje in Chrome or Samsung Internet (not WhatsApp/Facebook).\n2. Tap Allow when Android asks for the microphone.\n3. Or: Settings → Apps → Chrome → Permissions → Microphone → Allow.\n4. In the browser: lock icon → Microphone Allow → reload.\n\niPhone (Safari):\n1. Tap Allow when Safari asks.\n2. Or: Settings → Safari → Microphone → Allow.\n3. Reload and tap On again.\n\nComputer (Chrome/Edge):\n1. Lock icon in the address bar → Microphone → Allow.\n2. Reload the page.",
  },
  about: {
    title: "About HartMaatje",
    body: "HartMaatje is a warm, personal voice assistant for older adults.\nNot a cold chatbot  -  a calm companion to talk with, with memories, reminders, and simple support.",
    introductionTitle: "Meet Sweet Dreams",
    aloneTitle: "Alone and lonely!",
  },
  stories: {
    subtitle: "Pick a story. Then choose a companion to read it aloud.",
    pickStory: "Choose a story",
    pickCompanion: "Who should read?",
    readAloud: "Read aloud",
    stop: "Stop",
    reading: "Reading…",
    needBoth: "Please choose a story and a companion first.",
    preparingVoice: "Loading your companion voice…",
    voiceUnavailable: "This companion voice is unavailable right now. Try again shortly — no robot voice.",
    storyList: "Story list",
    comingSoon: "Coming soon",
  },
  pricing: {
    title: "Pricing",
    body: "Simple plans will appear here. First we build the calm experience  -  then clear prices without fine print.",
    tryTitle: "Get to know us",
    tryBody: "Try HartMaatje at your own pace.",
    monthlyTitle: "Monthly",
    monthlyBody: "A steady companion, reminders, and support.",
  },
  memory: {
    title: "Memory",
    body: "Later, memories, names, and favourite topics will live here  -  so your companion knows you better. For now this space is empty.",
    empty: "No saved memories yet.",
  },
  cinema: {
    pickCompanion: "Choose who watches and talks with you.",
    askTitle: "What can I show you today?",
    choiceHint: "Tap a button  -  or simply ask out loud where you want to go.",
    emptyHint: "Choose a place above, or ask your companion.",
    closeWindow: "Close window",
    talkHint: (name) =>
      `${name} stays with you  -  you may talk while you watch.`,
    askAnywhereTitle: "What may I show you today?",
    askAnywhereBody: () => "",
    fitnessSectionTitle: "Gymnastics - Fitness - Taichi Workout",
    fitnessSectionHint:
      "Videos play via YouTube. Move at your own\npace and stop if you feel pain or dizziness.",
    liveWaiting: "Waiting for the live connection...",
    liveHint: "Live pictures will appear here.",
    noInternet: "No internet connection. Check Wi‑Fi and try again.",
    micHint: "Speak to see something else!",
    micListening: "I'm listening, say what you'd like to see...",
    micNoMatch:
      "I don't know that one yet. Try again, or choose a button above.",
    micUnsupported: "Voice recognition isn't available. Choose a button above.",
    micSearching: "Searching YouTube...",
    micSearchFailed:
      "I couldn't find anything suitable. Try again, or choose a button above.",
    categories: {
      nature: "Relaxing Music Therapy",
      landscapes: "Deep Sea Ocean Creatures",
      beaches: "Wonders of the Caribbean",
      forests: "Amazon Jungle Birds",
      mountains: "Greece",
      villages: "Brazile",
      animals: "Wildlife Documentary",
      gardens: "Italy Bloeiende Tuinen",
    },
    featureSlots: {
      stoelWorkout: "Chair Workout",
      fitnessOefeningen: "Fitness Exercises",
      seniorDanceFitness: "Senior Dance Fitness 30min",
      taichiWorkout: "Taichi Workout",
    },
  },
  settings: {
    title: "Settings",
    body: "Volume, voice, and language will live here. Large buttons, few choices  -  made for calm use on a tablet.",
    volume: "Voice volume",
    mic: "Microphone",
    language: "Language",
    backToSettings: "Back to Settings",
    dubberTitle: "Dub video",
    dubberLink: "Open video dubbing →",
  },
  media: {
    captionsOn: "Captions on",
    audioFallback: (audioLang, textLang) =>
      `Voice: ${audioLang}  ·  text: ${textLang}`,
    storyCaption: "Peter tells how HartMaatje was created  -  the full story.",
    storyPlay: "Play video",
    welcomeAria: (name) => `${name} introduction`,
  },
};

const de: Messages = {
  meta: {
    title: "HartMaatje",
    description:
      "HartMaatje ist Ihr ruhiger Begleiter zu Hause  -  warmes Gespräch, Zuhören und täglicher Kontakt.",
  },
  brand: {
    tagline: "Ihr warmer Begleiter zu Hause.",
  },
  cover: {
    welcomeLine1: "Ein warmer Begleiter für Ruhe,",
    welcomeLine2: "Gesellschaft und echte Aufmerksamkeit.",
    startChat: "Gespräch starten.",
    coverAlt: "HartMaatje  -  Regenbogen am Meer",
    introAria: "HartMaatje Einführungsvideo",
    introPlay: "Einführungsvideo abspielen",
  },
  lang: {
    pickerLabel: "Sprache",
    pickerTitle: "Wählen Sie Ihre Sprache",
    current: (name) => `Aktuelle Sprache: ${name}`,
  },
  nav: {
    home: "Start",
    about: "Über uns",
    companions: "Begleiter wählen",
    pricing: "Geschäft & Wachstum",
    memory: "Film/Fitness\nÜbung Raum",
    settings: "Einstellungen",
    languages: "Sprache",
    listenToStories: "Geschichtenraum",
    dubber: "Video synchronisieren",
    mainNav: "Hauptnavigation",
  },
  dubber: {
    title: "Video nachsynchronisieren",
    subtitle:
      "Laden Sie ein Video hoch, wählen Sie Sprache und Begleiter. HartMaatje erstellt die Synchronisation.",
    online: "Dubber ist bereit.",
    offline: "Dubber-Dienst nicht erreichbar. Bitte später erneut versuchen.",
    pickVideo: "Video wählen",
    sourceLang: "Sprache im Video",
    targetLang: "Neue Sprachen (mehrere möglich)",
    targetLangsHint: "Wählen Sie alle Sprachen auf einmal — z. B. EN, DE, FR, ES.",
    selectAllTargets: "Alle Sprachen",
    pickCompanion: "Stimme welches Begleiters?",
    autoVoice: "Automatisch",
    start: "Synchronisation starten",
    working: "Synchronisation läuft… bitte warten",
    download: "Neues Video herunterladen",
    hint: "Das kann einige Minuten oder länger dauern. Lassen Sie diese Seite geöffnet.",
    needFile: "Bitte zuerst eine Videodatei wählen.",
    needDifferentLang: "Bitte zwei verschiedene Sprachen wählen.",
    startFailed: "Synchronisation konnte nicht starten.",
    statusQueued: "In der Warteschlange…",
    statusRunning: "In Arbeit…",
    statusDone: "Fertig!",
    statusError: "Etwas ist schiefgelaufen.",
    saveStoryTitle: "Diese Stimme im Geschichtenraum nutzen",
    saveStoryPick: "Geschichte wählen",
    saveStoryBtn: "Für Geschichten speichern",
    saveStoryWorking: "Speichern…",
    saveStoryOk: "Gespeichert. Öffnen Sie den Geschichtenraum.",
    saveStoryFail: "Speichern für Geschichten fehlgeschlagen.",
  },
  frontDesk: {
    aria: "Rezeption anrufen",
    label: "Rufe Rezeption",
    connecting: "Verbindung zur Rezeption wird hergestellt...",
    roomLabel: "Zimmer",
    settingsTitle: "Rezeption einrichten",
    settingsLabel: "Telefonnummer Rezeption",
    settingsDescription:
      "Geben Sie die Telefonnummer für die rote Taste ein. Sobald jemand drückt, wird sofort verbunden. Bitte internationales Format verwenden.",
    settingsPlaceholder: "+62 811 XXXX XXXX",
    settingsRoomLabel: "Zimmernummer (optional)",
    settingsSave: "Speichern",
    settingsSaved: "Gespeichert!",
    settingsEnterHint: "Drücken Sie Enter zum Speichern",
  },
  clock: {
    aria: "Uhr",
  },
  home: {
    chooseCompanion: "Wählen Sie Ihren Begleiter",
    tapPortrait: "Tippen Sie auf ein Porträt, um zu beginnen.",
    welcome: "Willkommen. Sie dürfen in Ruhe sprechen.",
    chooseFits: "Ihr ruhiger Begleiter zu Hause  -  wählen Sie, wer zu Ihnen passt.",
  },
  companions: {
    fenna: { blurb: "Sanft, leicht und ermutigend." },
    maarten: { blurb: "Ruhig, beständig und vertraut." },
    peter: { blurb: "Warm, bodenständig und menschlich." },
    colette: { blurb: "Ruhig, fürsorglich und würdevoll." },
  },
  conversation: {
    withName: (name) => `Gespräch mit ${name}`,
    intro: (name) => `Ich bin ${name}`,
    welcomeVideoHint: "Schauen Sie  -  Ihr Begleiter stellt sich vor.",
    welcomeVideoContinue: "Weiter zum Gespräch",
    backToCompanions: "Zurück zu den Begleitern",
    transcript: "Transkript",
    transcriptEmpty: "Was Sie sagen, erscheint hier...",
    spokenPending: "[Gesprochene Nachricht…]",
    live: "live...",
    intent: (label) => `Absicht: ${label}`,
    answer: "Antwort",
    map: "Karte",
    mic: "Mikrofon",
    stopSpeaking: "Sprechen beenden",
    holdToTalk: "Gedrückt halten zum Sprechen",
    releaseToSend: "Loslassen zum Senden",
    processingVoice: "Hört zu und antwortet...",
    keepTalking: "Ich höre zu",
    didNotCatch: "Ich habe Sie nicht gut verstanden. Versuchen Sie es ruhig noch einmal.",
    startVoiceChat: "Gespräch starten",
    welcomeGreeting: (name) =>
      `Hallo, ich bin ${name}. Schön, dass Sie da sind. Wie geht es Ihnen?`,
    closeChat: "Gespräch schließen",
    chatClosed: "Gespräch beendet",
    sayCloseHint: "Sagen Sie 'Gespräch beenden' oder tippen Sie unten.",
    openingMic: "Mikrofon wird geöffnet...",
    typingOptional: "Tippen (nur wenn nötig)",
    interrupt: "Unterbrechen",
    typeLabel: "Oder Satz tippen",
    typePlaceholder: (name) => `Sagen Sie etwas zu ${name}...`,
    sendAsSpeech: "Als gesprochener Satz senden",
    debugEvents: (n) => `Debug-Ereignisse (${n})`,
    sessionShort: (id) => `Sitzung ${id}...`,
  },
  status: {
    starting: "Startet...",
    startingSession: "Sitzung starten...",
    connecting: "Verbinden...",
    ready: "Bereit zum Sprechen",
    listening: "Hört zu...",
    retrieving: "Wissen abrufen...",
    idle: "Inaktiv",
    recording: "Hört zu...",
    transcribing: "Auswerten...",
    thinking: "Nachdenken...",
    speaking: "Sprechen...",
    interrupted: "Unterbrochen",
    errorRecoverable: "Einen Moment...",
    reconnecting: "Erneut verbinden...",
    connectionError: "Verbindungsfehler",
    error: "Fehler",
    fsm: {
      IDLE: "Inaktiv",
      READY: "Bereit",
      LISTENING: "Hört zu...",
      TRANSCRIBING: "Auswerten...",
      THINKING: "Nachdenken...",
      SPEAKING: "Sprechen...",
      SPEAKING_INTERRUPTED: "Unterbrochen",
      ERROR_RECOVERABLE: "Einen Moment...",
      RECONNECTING: "Erneut verbinden...",
    },
  },
  errors: {
    noServer:
      "Keine Verbindung zum Server. Prüfen Sie das Internet und laden Sie https://hartmaatje.app neu.",
    sessionFailed:
      "Sprachnachricht konnte nicht gestartet werden. Seite neu laden und erneut versuchen.",
    generic: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
    micDenied: "Mikrofon blockiert",
    micBlockedHelp:
      "1. Klicken Sie auf das Schloss in der Adressleiste.\n2. Setzen Sie Mikrofon für hartmaatje.app auf Zulassen.\n3. Seite neu laden und erneut auf das grüne Mikrofon tippen.",
  },
  about: {
    title: "Über HartMaatje",
    body: "HartMaatje ist ein warmer, persönlicher Sprachassistent für ältere Menschen.\nKein kalter Chatbot  -  ein ruhiger Begleiter zum Sprechen, mit Erinnerungen, Erinnerungshilfen und einfacher Unterstützung.",
    introductionTitle: "Lernen Sie Süße Träume kennen",
    aloneTitle: "Allein und einsam!",
  },
  stories: {
    subtitle: "Waehlen Sie eine Geschichte. Dann waehlen Sie einen Begleiter zum Vorlesen.",
    pickStory: "Geschichte waehlen",
    pickCompanion: "Wer soll vorlesen?",
    readAloud: "Vorlesen",
    stop: "Stopp",
    reading: "Vorlesen...",
    needBoth: "Bitte zuerst Geschichte und Begleiter waehlen.",
    preparingVoice: "Stimme wird geladen…",
    voiceUnavailable: "Diese Stimme ist gerade nicht verfuegbar. Bitte spaeter erneut versuchen.",
    storyList: "Geschichtenliste",
    comingSoon: "Demnaechst verfuegbar",
  },
  pricing: {
    title: "Preis",
    body: "Einfache Abos erscheinen hier. Zuerst bauen wir die ruhige Erfahrung  -  danach klare Preise ohne Kleingedrucktes.",
    tryTitle: "Kennenlernen",
    tryBody: "Probieren Sie HartMaatje in Ruhe aus.",
    monthlyTitle: "Monatlich",
    monthlyBody: "Fester Begleiter, Erinnerungen und Support.",
  },
  memory: {
    title: "Gedächtnis",
    body: "Später leben hier Erinnerungen, Namen und Lieblingsthemen  -  damit Ihr Begleiter Sie besser kennt. Dieser Bereich ist noch leer.",
    empty: "Noch keine gespeicherten Erinnerungen.",
  },
  cinema: {
    pickCompanion: "Wählen Sie, wer mit Ihnen schaut und spricht.",
    askTitle: "Was darf ich Ihnen heute zeigen?",
    choiceHint: "Tippen Sie eine Taste  -  oder fragen Sie einfach laut, wohin Sie möchten.",
    emptyHint: "Wählen Sie oben einen Ort, oder fragen Sie Ihren Begleiter.",
    closeWindow: "Fenster schließen",
    talkHint: (name) =>
      `${name} bleibt bei Ihnen  -  Sie dürfen ruhig mitreden beim Zuschauen.`,
    askAnywhereTitle: "Was darf ich Ihnen heute zeigen?",
    askAnywhereBody: () => "",
    fitnessSectionTitle: "Gymnastik - Fitness - Taichi Workout",
    fitnessSectionHint:
      "Videos werden über YouTube abgespielt. Bewegen Sie in Ihrem eigenen\nTempo und stoppen Sie bei Schmerz oder Schwindel.",
    liveWaiting: "Warten auf die Live-Verbindung...",
    liveHint: "Hier erscheint später das Live-Bild.",
    noInternet:
      "Keine Internetverbindung. Prüfen Sie das WLAN und versuchen Sie es erneut.",
    micHint: "Sprechen Sie, um etwas anderes zu sehen!",
    micListening: "Ich höre zu, sagen Sie, was Sie sehen möchten...",
    micNoMatch:
      "Das kenne ich noch nicht. Versuchen Sie es erneut, oder wählen Sie oben eine Taste.",
    micUnsupported:
      "Spracherkennung ist nicht verfügbar. Wählen Sie oben eine Taste.",
    micSearching: "Suche auf YouTube...",
    micSearchFailed:
      "Ich konnte nichts Passendes finden. Versuchen Sie es erneut, oder wählen Sie oben eine Taste.",
    categories: {
      nature: "Entspannende Musiktherapie",
      landscapes: "Tiefseetiere",
      beaches: "Wunder der Karibik",
      forests: "Vögel im Amazonas",
      mountains: "Greece",
      villages: "Brazile",
      animals: "Wildlife-Dokumentation",
      gardens: "Italy Bloeiende Tuinen",
    },
    featureSlots: {
      stoelWorkout: "Stuhl-Workout",
      fitnessOefeningen: "Fitness-Übungen",
      seniorDanceFitness: "Senior Dance Fitness 30min",
      taichiWorkout: "Taichi Workout",
    },
  },
  settings: {
    title: "Einstellungen",
    body: "Lautstärke, Stimme und Sprache kommen hierher. Große Tasten, wenige Wahlmöglichkeiten  -  für ruhige Bedienung am Tablet.",
    volume: "Stimmenlautstärke",
    mic: "Mikrofon",
    language: "Sprache",
    backToSettings: "Zurück zu Einstellungen",
    dubberTitle: "Video synchronisieren",
    dubberLink: "Videosynchronisation öffnen →",
  },
  media: {
    captionsOn: "Untertitel an",
    audioFallback: (audioLang, textLang) =>
      `Stimme: ${audioLang}  ·  Text: ${textLang}`,
    storyCaption: "Peter erzählt, wie HartMaatje entstanden ist  -  die ganze Geschichte.",
    storyPlay: "Video abspielen",
    welcomeAria: (name) => `${name} Vorstellung`,
  },
};

const fr: Messages = {
  meta: {
    title: "HartMaatje",
    description:
      "HartMaatje est votre compagnon calme à la maison  -  conversation chaleureuse, écoute et contact quotidien.",
  },
  brand: {
    tagline: "Votre compagnon chaleureux à la maison.",
  },
  cover: {
    welcomeLine1: "Un compagnon chaleureux pour le calme,",
    welcomeLine2: "la compagnie et une attention sincère.",
    startChat: "Commencer la conversation.",
    coverAlt: "HartMaatje  -  arc-en-ciel près de la mer",
    introAria: "Vidéo d'introduction HartMaatje",
    introPlay: "Lire la vidéo d'introduction",
  },
  lang: {
    pickerLabel: "Langue",
    pickerTitle: "Choisissez votre langue",
    current: (name) => `Langue actuelle : ${name}`,
  },
  nav: {
    home: "Accueil",
    about: "À propos",
    companions: "Choisir votre compagnon",
    pricing: "Entreprise & Croissance",
    memory: "Film/Fitness\nExercice Salle",
    settings: "Réglages",
    languages: "Langue",
    listenToStories: "Salle des histoires",
    dubber: "Doubler vidéo",
    mainNav: "Navigation principale",
  },
  dubber: {
    title: "Doubler une vidéo",
    subtitle:
      "Téléchargez une vidéo, choisissez la langue et le compagnon. HartMaatje crée le doublage.",
    online: "Le doubleur est prêt.",
    offline: "Service de doublage indisponible. Réessayez plus tard.",
    pickVideo: "Choisir votre vidéo",
    sourceLang: "Langue de la vidéo",
    targetLang: "Nouvelles langues (plusieurs possibles)",
    targetLangsHint: "Choisissez toutes les langues d'un coup — ex. EN, DE, FR, ES.",
    selectAllTargets: "Toutes les langues",
    pickCompanion: "Voix de quel compagnon ?",
    autoVoice: "Automatique",
    start: "Lancer le doublage",
    working: "Doublage en cours… veuillez patienter",
    download: "Télécharger la nouvelle vidéo",
    hint: "Cela peut prendre plusieurs minutes. Gardez cette page ouverte.",
    needFile: "Choisissez d'abord un fichier vidéo.",
    needDifferentLang: "Choisissez deux langues différentes.",
    startFailed: "Impossible de démarrer le doublage.",
    statusQueued: "En file d'attente…",
    statusRunning: "En cours…",
    statusDone: "Terminé !",
    statusError: "Une erreur s'est produite.",
    saveStoryTitle: "Utiliser cette voix dans la salle des histoires",
    saveStoryPick: "Choisir l'histoire",
    saveStoryBtn: "Enregistrer pour les histoires",
    saveStoryWorking: "Enregistrement…",
    saveStoryOk: "Enregistré. Ouvrez la salle des histoires.",
    saveStoryFail: "Échec de l'enregistrement pour les histoires.",
  },
  frontDesk: {
    aria: "Appeler le bureau",
    label: "Appeler Bureau",
    connecting: "Connexion au bureau en cours...",
    roomLabel: "Chambre",
    settingsTitle: "Configurer Appeler Bureau",
    settingsLabel: "Numéro de téléphone du bureau",
    settingsDescription:
      "Saisissez le numéro de téléphone pour le bouton rouge. Dès qu'un utilisateur appuie, l'appel est passé immédiatement. Utilisez le format international.",
    settingsPlaceholder: "+62 811 XXXX XXXX",
    settingsRoomLabel: "Numéro de chambre (facultatif)",
    settingsSave: "Enregistrer",
    settingsSaved: "Enregistré !",
    settingsEnterHint: "Appuyez sur Entrée pour enregistrer",
  },
  clock: {
    aria: "Horloge",
  },
  home: {
    chooseCompanion: "Choisissez votre compagnon",
    tapPortrait: "Touchez un portrait pour commencer.",
    welcome: "Bienvenue. Vous pouvez parler tranquillement.",
    chooseFits:
      "Votre compagnon calme à la maison  -  choisissez qui vous convient.",
  },
  companions: {
    fenna: { blurb: "Douce, légère et encourageante." },
    maarten: { blurb: "Calme, stable et de confiance." },
    peter: { blurb: "Chaleureux, terre-à-terre et humain." },
    colette: { blurb: "Calme, attentive et digne." },
  },
  conversation: {
    withName: (name) => `Conversation avec ${name}`,
    intro: (name) => `Je suis ${name}`,
    welcomeVideoHint: "Regardez  -  votre compagnon se présente.",
    welcomeVideoContinue: "Continuer vers la conversation",
    backToCompanions: "Retour aux compagnons",
    transcript: "Transcription",
    transcriptEmpty: "Ce que vous dites apparaît ici...",
    spokenPending: "[Message parlé…]",
    live: "en direct...",
    intent: (label) => `Intention : ${label}`,
    answer: "Réponse",
    map: "Carte",
    mic: "Microphone",
    stopSpeaking: "Arrêter de parler",
    holdToTalk: "Maintenir pour parler",
    releaseToSend: "Relâcher pour envoyer",
    processingVoice: "Écoute et réponse...",
    keepTalking: "J'écoute",
    didNotCatch: "Je n'ai pas bien compris. Réessayez calmement.",
    startVoiceChat: "Commencer la conversation",
    welcomeGreeting: (name) =>
      `Bonjour, je suis ${name}. Content que vous soyez là. Comment allez-vous ?`,
    closeChat: "Fermer la conversation",
    chatClosed: "Conversation fermée",
    sayCloseHint: "Dites « fermer la conversation » ou appuyez ci-dessous.",
    openingMic: "Ouverture du microphone...",
    typingOptional: "Écrire (seulement si nécessaire)",
    interrupt: "Interrompre",
    typeLabel: "Ou tapez une phrase",
    typePlaceholder: (name) => `Dites quelque chose à ${name}...`,
    sendAsSpeech: "Envoyer comme phrase parlée",
    debugEvents: (n) => `Événements de débogage (${n})`,
    sessionShort: (id) => `session ${id}...`,
  },
  status: {
    starting: "Démarrage...",
    startingSession: "Démarrage de la session...",
    connecting: "Connexion...",
    ready: "Prêt à parler",
    listening: "Écoute...",
    retrieving: "Récupération des connaissances...",
    idle: "Inactif",
    recording: "Écoute...",
    transcribing: "Traitement...",
    thinking: "Réflexion...",
    speaking: "Parole...",
    interrupted: "Interrompu",
    errorRecoverable: "Un instant...",
    reconnecting: "Reconnexion...",
    connectionError: "Erreur de connexion",
    error: "Erreur",
    fsm: {
      IDLE: "Inactif",
      READY: "Prêt",
      LISTENING: "Écoute...",
      TRANSCRIBING: "Traitement...",
      THINKING: "Réflexion...",
      SPEAKING: "Parole...",
      SPEAKING_INTERRUPTED: "Interrompu",
      ERROR_RECOVERABLE: "Un instant...",
      RECONNECTING: "Reconnexion...",
    },
  },
  errors: {
    noServer:
      "Pas de connexion au serveur. Vérifiez Internet et rechargez https://hartmaatje.app.",
    sessionFailed:
      "Impossible de démarrer le chat vocal. Rechargez la page et réessayez.",
    generic: "Une erreur s'est produite. Veuillez réessayer.",
    micDenied: "Microphone bloqué",
    micBlockedHelp:
      "1. Cliquez sur le cadenas dans la barre d'adresse.\n2. Autorisez le microphone pour hartmaatje.app.\n3. Rechargez et appuyez à nouveau sur le micro vert.",
  },
  about: {
    title: "À propos de HartMaatje",
    body: "HartMaatje est un assistant vocal chaleureux et personnel pour les personnes âgées.\nPas un chatbot froid  -  un compagnon calme pour parler, avec souvenirs, rappels et soutien simple.",
    introductionTitle: "Découvrez Doux Rêves",
    aloneTitle: "Seul et esseulé !",
  },
  stories: {
    subtitle: "Choisissez une histoire. Puis un compagnon pour la lire.",
    pickStory: "Choisir une histoire",
    pickCompanion: "Qui lit ?",
    readAloud: "Lire a voix haute",
    stop: "Stop",
    reading: "Lecture...",
    needBoth: "Choisissez d abord une histoire et un compagnon.",
    preparingVoice: "Chargement de la voix…",
    voiceUnavailable: "La voix du compagnon est indisponible. Réessayez bientôt.",
    storyList: "Liste des histoires",
    comingSoon: "Bientôt disponible",
  },
  pricing: {
    title: "Tarifs",
    body: "Des formules simples apparaîtront ici. D'abord l'expérience calme  -  ensuite des prix clairs, sans petits caractères.",
    tryTitle: "Faire connaissance",
    tryBody: "Essayez HartMaatje à votre rythme.",
    monthlyTitle: "Mensuel",
    monthlyBody: "Un compagnon régulier, des rappels et du soutien.",
  },
  memory: {
    title: "Mémoire",
    body: "Plus tard, souvenirs, noms et sujets préférés vivront ici  -  pour que votre compagnon vous connaisse mieux. Cet espace est encore vide.",
    empty: "Pas encore de souvenirs enregistrés.",
  },
  cinema: {
    pickCompanion: "Choisissez qui regarde et parle avec vous.",
    askTitle: "Que puis-je vous montrer aujourd'hui ?",
    choiceHint: "Appuyez sur un bouton  -  ou demandez simplement à voix haute où aller.",
    emptyHint: "Choisissez un lieu ci-dessus, ou demandez à votre compagnon.",
    closeWindow: "Fermer la fenêtre",
    talkHint: (name) =>
      `${name} reste avec vous  -  vous pouvez parler pendant que vous regardez.`,
    askAnywhereTitle: "Que puis-je vous montrer aujourd'hui ?",
    askAnywhereBody: () => "",
    fitnessSectionTitle: "Gymnastique - Fitness - Taichi Workout",
    fitnessSectionHint:
      "Les vidéos sont lues via YouTube. Bougez à votre rythme\net arrêtez en cas de douleur ou de vertige.",
    liveWaiting: "En attente de la connexion en direct...",
    liveHint: "L'image en direct apparaîtra ici.",
    noInternet:
      "Pas de connexion Internet. Vérifiez le Wi‑Fi et réessayez.",
    micHint: "Parlez pour voir autre chose !",
    micListening: "J'écoute, dites ce que vous voulez voir...",
    micNoMatch:
      "Je ne connais pas encore cela. Réessayez, ou choisissez un bouton ci-dessus.",
    micUnsupported:
      "La reconnaissance vocale n'est pas disponible. Choisissez un bouton ci-dessus.",
    micSearching: "Recherche sur YouTube...",
    micSearchFailed:
      "Je n'ai rien trouvé de convenable. Réessayez, ou choisissez un bouton ci-dessus.",
    categories: {
      nature: "Musicothérapie relaxante",
      landscapes: "Créatures des grands fonds",
      beaches: "Merveilles des CaraÃ¯bes",
      forests: "Oiseaux de l'Amazonie",
      mountains: "Greece",
      villages: "Brazile",
      animals: "Documentaire animalier",
      gardens: "Italy Bloeiende Tuinen",
    },
    featureSlots: {
      stoelWorkout: "Exercices sur chaise",
      fitnessOefeningen: "Exercices de fitness",
      seniorDanceFitness: "Senior Dance Fitness 30min",
      taichiWorkout: "Taichi Workout",
    },
  },
  settings: {
    title: "Réglages",
    body: "Volume, voix et langue arriveront ici. Gros boutons, peu de choix  -  pensé pour une utilisation calme sur tablette.",
    volume: "Volume de la voix",
    mic: "Microphone",
    language: "Langue",
    backToSettings: "Retour aux réglages",
    dubberTitle: "Doubler une vidéo",
    dubberLink: "Ouvrir le doublage vidéo →",
  },
  media: {
    captionsOn: "Sous-titres activés",
    audioFallback: (audioLang, textLang) =>
      `Voix : ${audioLang}  ·  texte : ${textLang}`,
    storyCaption: "Peter raconte comment HartMaatje est né  -  toute l'histoire.",
    storyPlay: "Lire la vidéo",
    welcomeAria: (name) => `Présentation de ${name}`,
  },
};

const es: Messages = {
  meta: {
    title: "HartMaatje",
    description:
      "HartMaatje es su compañero tranquilo en casa  -  conversación cálida, escucha y contacto diario.",
  },
  brand: {
    tagline: "Su compañero cálido en casa.",
  },
  cover: {
    welcomeLine1: "Un compañero cálido para la calma,",
    welcomeLine2: "la compañía y la atención sincera.",
    startChat: "Empezar conversación.",
    coverAlt: "HartMaatje  -  arcoíris junto al mar",
    introAria: "Vídeo de introducción de HartMaatje",
    introPlay: "Reproducir vídeo de introducción",
  },
  lang: {
    pickerLabel: "Idioma",
    pickerTitle: "Elija su idioma",
    current: (name) => `Idioma actual: ${name}`,
  },
  nav: {
    home: "Inicio",
    about: "Acerca de",
    companions: "Elija su compañero",
    pricing: "Negocio & Crecimiento",
    memory: "Película/Fitness\nEjercicio Sala",
    settings: "Ajustes",
    languages: "Idioma",
    listenToStories: "Sala de historias",
    dubber: "Doblar vídeo",
    mainNav: "Navegación principal",
  },
  dubber: {
    title: "Doblar un vídeo",
    subtitle:
      "Suba un vídeo, elija el idioma y el compañero. HartMaatje crea el doblaje.",
    online: "El doblador está listo.",
    offline: "Servicio de doblaje no disponible. Inténtelo más tarde.",
    pickVideo: "Elija su vídeo",
    sourceLang: "Idioma del vídeo",
    targetLang: "Idiomas nuevos (varios posibles)",
    targetLangsHint: "Elija todos los idiomas a la vez — p. ej. EN, DE, FR, ES.",
    selectAllTargets: "Todos los idiomas",
    pickCompanion: "¿Voz de qué compañero?",
    autoVoice: "Automático",
    start: "Empezar doblaje",
    working: "Doblaje en curso… espere por favor",
    download: "Descargar el nuevo vídeo",
    hint: "Puede tardar varios minutos o más. Mantenga esta página abierta.",
    needFile: "Elija primero un archivo de vídeo.",
    needDifferentLang: "Elija dos idiomas diferentes.",
    startFailed: "No se pudo iniciar el doblaje.",
    statusQueued: "En cola…",
    statusRunning: "Trabajando…",
    statusDone: "¡Listo!",
    statusError: "Algo salió mal.",
    saveStoryTitle: "Usar esta voz en la sala de historias",
    saveStoryPick: "Elija la historia",
    saveStoryBtn: "Guardar para historias",
    saveStoryWorking: "Guardando…",
    saveStoryOk: "Guardado. Abra la sala de historias.",
    saveStoryFail: "No se pudo guardar para historias.",
  },
  frontDesk: {
    aria: "Llamar a la recepción",
    label: "Llamar Recepción",
    connecting: "Conectando con la recepción...",
    roomLabel: "Habitación",
    settingsTitle: "Configurar Llamar Recepción",
    settingsLabel: "Número de teléfono de recepción",
    settingsDescription:
      "Introduce el número de teléfono para el botón rojo. En cuanto alguien lo pulse, se llamará de inmediato. Usa el formato internacional.",
    settingsPlaceholder: "+62 811 XXXX XXXX",
    settingsRoomLabel: "Número de habitación (opcional)",
    settingsSave: "Guardar",
    settingsSaved: "¡Guardado!",
    settingsEnterHint: "Pulsa Enter para guardar",
  },
  clock: {
    aria: "Reloj",
  },
  home: {
    chooseCompanion: "Elija su compañero",
    tapPortrait: "Toque un retrato para empezar.",
    welcome: "Bienvenido. Puede hablar con calma.",
    chooseFits:
      "Su compañero tranquilo en casa  -  elija quién le conviene.",
  },
  companions: {
    fenna: { blurb: "Suave, ligera y alentadora." },
    maarten: { blurb: "Tranquilo, estable y de confianza." },
    peter: { blurb: "Cálido, sencillo y humano." },
    colette: { blurb: "Serena, atenta y digna." },
  },
  conversation: {
    withName: (name) => `Conversación con ${name}`,
    intro: (name) => `Soy ${name}`,
    welcomeVideoHint: "Mire  -  su compañero se presenta.",
    welcomeVideoContinue: "Continuar a la conversación",
    backToCompanions: "Volver a los compañeros",
    transcript: "Transcripción",
    transcriptEmpty: "Lo que diga aparece aquí...",
    spokenPending: "[Mensaje hablado…]",
    live: "en vivo...",
    intent: (label) => `Intención: ${label}`,
    answer: "Respuesta",
    map: "Mapa",
    mic: "Micrófono",
    stopSpeaking: "Dejar de hablar",
    holdToTalk: "Mantenga para hablar",
    releaseToSend: "Suelte para enviar",
    processingVoice: "Escuchando y respondiendo...",
    keepTalking: "Escucho",
    didNotCatch: "No le entendí bien. Inténtelo otra vez con calma.",
    startVoiceChat: "Empezar conversación",
    welcomeGreeting: (name) =>
      `Hola, soy ${name}. Qué bien que esté aquí. ¿Cómo está?`,
    closeChat: "Cerrar chat",
    chatClosed: "Chat cerrado",
    sayCloseHint: "Diga 'cerrar chat' o pulse el botón de abajo.",
    openingMic: "Abriendo el micrófono...",
    typingOptional: "Escribir (solo si hace falta)",
    interrupt: "Interrumpir",
    typeLabel: "O escriba una frase",
    typePlaceholder: (name) => `Diga algo a ${name}...`,
    sendAsSpeech: "Enviar como frase hablada",
    debugEvents: (n) => `Eventos de depuración (${n})`,
    sessionShort: (id) => `sesión ${id}...`,
  },
  status: {
    starting: "Iniciando...",
    startingSession: "Iniciando sesión...",
    connecting: "Conectando...",
    ready: "Listo para hablar",
    listening: "Escuchando...",
    retrieving: "Obteniendo conocimiento...",
    idle: "Inactivo",
    recording: "Escuchando...",
    transcribing: "Procesando...",
    thinking: "Pensando...",
    speaking: "Hablando...",
    interrupted: "Interrumpido",
    errorRecoverable: "Un momento...",
    reconnecting: "Reconectando...",
    connectionError: "Error de conexión",
    error: "Error",
    fsm: {
      IDLE: "Inactivo",
      READY: "Listo",
      LISTENING: "Escuchando...",
      TRANSCRIBING: "Procesando...",
      THINKING: "Pensando...",
      SPEAKING: "Hablando...",
      SPEAKING_INTERRUPTED: "Interrumpido",
      ERROR_RECOVERABLE: "Un momento...",
      RECONNECTING: "Reconectando...",
    },
  },
  errors: {
    noServer:
      "Sin conexión con el servidor. Compruebe Internet y recargue https://hartmaatje.app.",
    sessionFailed:
      "No se pudo iniciar el chat de voz. Recargue la página e inténtelo de nuevo.",
    generic: "Algo salió mal. Inténtelo de nuevo.",
    micDenied: "Micrófono bloqueado",
    micBlockedHelp:
      "1. Pulse el candado en la barra de direcciones.\n2. Permita el micrófono para hartmaatje.app.\n3. Recargue y pulse otra vez el micrófono verde.",
  },
  about: {
    title: "Acerca de HartMaatje",
    body: "HartMaatje es un asistente de voz cálido y personal para personas mayores.\nNo un chatbot frío  -  un compañero tranquilo para hablar, con recuerdos, recordatorios y apoyo sencillo.",
    introductionTitle: "Conozca Dulces Sueños",
    aloneTitle: "¡Solo y solitario!",
  },
  stories: {
    subtitle: "Elija una historia. Luego un compañero para leerla.",
    pickStory: "Elegir una historia",
    pickCompanion: "¿Quién lee?",
    readAloud: "Leer en voz alta",
    stop: "Parar",
    reading: "Leyendo…",
    needBoth: "Elija primero una historia y un compañero.",
    preparingVoice: "Cargando la voz…",
    voiceUnavailable: "La voz del compañero no está disponible ahora. Inténtelo de nuevo.",
    storyList: "Lista de historias",
    comingSoon: "Próximamente",
  },
  pricing: {
    title: "Precio",
    body: "Aquí aparecerán planes sencillos. Primero construimos la experiencia tranquila  -  después precios claros, sin letra pequeña.",
    tryTitle: "Conocernos",
    tryBody: "Pruebe HartMaatje a su ritmo.",
    monthlyTitle: "Mensual",
    monthlyBody: "Un compañero fijo, recordatorios y apoyo.",
  },
  memory: {
    title: "Memoria",
    body: "Más adelante vivirán aquí recuerdos, nombres y temas favoritos  -  para que su compañero le conozca mejor. Este espacio aún está vacío.",
    empty: "Aún no hay recuerdos guardados.",
  },
  cinema: {
    pickCompanion: "Elija quién mira y habla con usted.",
    askTitle: "Â¿Qué puedo mostrarle hoy?",
    choiceHint: "Pulse un botón  -  o simplemente diga en voz alta adónde quiere ir.",
    emptyHint: "Elija un lugar arriba, o pregúntele a su compañero.",
    closeWindow: "Cerrar ventana",
    talkHint: (name) =>
      `${name} se queda con usted  -  puede hablar mientras mira.`,
    askAnywhereTitle: "¿Qué puedo mostrarle hoy?",
    askAnywhereBody: () => "",
    fitnessSectionTitle: "Gimnasia - Fitness - Taichi Workout",
    fitnessSectionHint:
      "Los vídeos se reproducen a través de YouTube. Muévase a su ritmo\ny deténgase si siente dolor o mareo.",
    liveWaiting: "Esperando la conexión en vivo...",
    liveHint: "Aquí aparecerá la imagen en vivo.",
    noInternet:
      "Sin conexión a Internet. Compruebe el Wi‑Fi e inténtelo de nuevo.",
    micHint: "¡Hable para ver otra cosa!",
    micListening: "Escucho, diga lo que le gustaría ver...",
    micNoMatch:
      "Todavía no conozco eso. Inténtelo de nuevo, o elija un botón arriba.",
    micUnsupported:
      "El reconocimiento de voz no está disponible. Elija un botón arriba.",
    micSearching: "Buscando en YouTube...",
    micSearchFailed:
      "No encontré nada adecuado. Inténtelo de nuevo, o elija un botón arriba.",
    categories: {
      nature: "Musicoterapia relajante",
      landscapes: "Criaturas del océano profundo",
      beaches: "Maravillas del Caribe",
      forests: "Aves de la Amazonia",
      mountains: "Greece",
      villages: "Brazile",
      animals: "Documental de vida silvestre",
      gardens: "Italy Bloeiende Tuinen",
    },
    featureSlots: {
      stoelWorkout: "Ejercicios en silla",
      fitnessOefeningen: "Ejercicios de fitness",
      seniorDanceFitness: "Senior Dance Fitness 30min",
      taichiWorkout: "Taichi Workout",
    },
  },
  settings: {
    title: "Ajustes",
    body: "Volumen, voz e idioma estarán aquí. Botones grandes, pocas opciones  -  pensado para un uso tranquilo en tableta.",
    volume: "Volumen de voz",
    mic: "Micrófono",
    language: "Idioma",
    backToSettings: "Volver a Ajustes",
    dubberTitle: "Doblar vídeo",
    dubberLink: "Abrir doblaje de vídeo →",
  },
  media: {
    captionsOn: "Subtítulos activados",
    audioFallback: (audioLang, textLang) =>
      `Voz: ${audioLang}  ·  texto: ${textLang}`,
    storyCaption: "Peter cuenta cómo nació HartMaatje  -  la historia completa.",
    storyPlay: "Reproducir vídeo",
    welcomeAria: (name) => `Presentación de ${name}`,
  },
};

export const MESSAGES: Record<AppLang, Messages> = { nl, en, de, fr, es };

export function getMessages(lang: AppLang): Messages {
  return MESSAGES[lang] ?? MESSAGES.nl;
}
