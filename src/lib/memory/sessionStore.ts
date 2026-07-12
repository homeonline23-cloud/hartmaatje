import type { SessionMemory } from "@/lib/memory/types";

const sessions = new Map<string, SessionMemory>();

function key(residentId: string, sessionId?: string): string {
  return `${residentId}::${sessionId ?? "default"}`;
}

export function getSession(residentId: string, sessionId?: string): SessionMemory {
  const k = key(residentId, sessionId);
  const existing = sessions.get(k);
  if (existing) return existing;

  const fresh: SessionMemory = {
    residentId,
    sessionId,
    conversationSummary: "",
    recentTurns: [],
    updatedAt: new Date().toISOString(),
  };
  sessions.set(k, fresh);
  return fresh;
}

export function updateSession(
  residentId: string,
  sessionId: string | undefined,
  patch: Partial<SessionMemory>,
): SessionMemory {
  const current = getSession(residentId, sessionId);
  const next: SessionMemory = {
    ...current,
    ...patch,
    recentTurns: patch.recentTurns ?? current.recentTurns,
    updatedAt: new Date().toISOString(),
  };
  sessions.set(key(residentId, sessionId), next);
  return next;
}

export function clearSession(residentId: string, sessionId?: string): void {
  sessions.delete(key(residentId, sessionId));
}

export function clearAllSessionsForResident(residentId: string): void {
  for (const k of sessions.keys()) {
    if (k.startsWith(`${residentId}::`)) sessions.delete(k);
  }
}
