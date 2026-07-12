import type { AppLang } from "@/lib/languages";

/** Stable ID for one resident across sessions (localStorage or care-home ID). */
export type ResidentId = string;

export type ResidentProfile = {
  residentId: ResidentId;
  displayName?: string;
  family: string[];
  pets: string[];
  hometown?: string;
  hobbies: string[];
  favoriteMusic: string[];
  profession?: string;
  preferences: string[];
  emotionalTopics: string[];
  upcomingVisits: string[];
  routines: string[];
  gentleTopics: string[];
  communicationPreferences: string[];
  spiritualPreferences: string[];
  updatedAt?: string;
};

export type EpisodicMemory = {
  id: string;
  residentId: ResidentId;
  summary: string;
  occurredAt: string;
  tags: string[];
  emotionalTone?: "warm" | "sad" | "anxious" | "joyful" | "neutral" | "lonely";
  importance: number;
  sourceTurn?: string;
};

export type SessionMemory = {
  residentId: ResidentId;
  sessionId?: string;
  activeTopic?: string;
  conversationSummary: string;
  emotionalTone?: string;
  recentTurns: Array<{ role: "user" | "assistant"; content: string }>;
  updatedAt: string;
};

export type MemoryRetrievalResult = {
  profile: ResidentProfile;
  episodes: EpisodicMemory[];
  session: SessionMemory | null;
  promptBlock: string;
};

export type IngestTurnInput = {
  residentId: ResidentId;
  sessionId?: string;
  userText: string;
  assistantReply?: string;
  lang: AppLang;
};

export function emptyProfile(residentId: ResidentId): ResidentProfile {
  return {
    residentId,
    family: [],
    pets: [],
    hobbies: [],
    favoriteMusic: [],
    preferences: [],
    emotionalTopics: [],
    upcomingVisits: [],
    routines: [],
    gentleTopics: [],
    communicationPreferences: [],
    spiritualPreferences: [],
  };
}
