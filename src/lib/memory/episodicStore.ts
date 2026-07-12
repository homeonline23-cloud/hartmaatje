import fs from "fs";
import path from "path";
import { memoryBaseDir, safeResidentFileName } from "@/lib/memory/paths";
import type { EpisodicMemory } from "@/lib/memory/types";

const cache = new Map<string, EpisodicMemory[]>();
const MAX_EPISODES = 80;

function episodesPath(residentId: string): string {
  return path.join(memoryBaseDir(), `${safeResidentFileName(residentId)}_episodes.json`);
}

export function loadEpisodes(residentId: string): EpisodicMemory[] {
  const key = safeResidentFileName(residentId);
  if (cache.has(key)) return cache.get(key)!;

  const file = episodesPath(residentId);
  if (!fs.existsSync(file)) {
    cache.set(key, []);
    return [];
  }

  try {
    const rows = JSON.parse(fs.readFileSync(file, "utf-8")) as EpisodicMemory[];
    const list = Array.isArray(rows) ? rows : [];
    cache.set(key, list);
    return list;
  } catch {
    cache.set(key, []);
    return [];
  }
}

export function saveEpisodes(residentId: string, episodes: EpisodicMemory[]): void {
  const dir = memoryBaseDir();
  fs.mkdirSync(dir, { recursive: true });
  const trimmed = episodes
    .sort((a, b) => b.importance - a.importance || b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, MAX_EPISODES);
  const key = safeResidentFileName(residentId);
  cache.set(key, trimmed);
  fs.writeFileSync(episodesPath(residentId), JSON.stringify(trimmed, null, 2), "utf-8");
}

export function appendEpisode(episode: EpisodicMemory): void {
  const list = loadEpisodes(episode.residentId);
  list.push(episode);
  saveEpisodes(episode.residentId, list);
}

export function deleteEpisodes(residentId: string): void {
  const key = safeResidentFileName(residentId);
  cache.delete(key);
  const file = episodesPath(residentId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}
