"use client";

import { useEffect, useState } from "react";

import type { VoiceIdentityId } from "@/lib/voice/types";

type LiveAvatarConfig = Record<VoiceIdentityId, boolean>;

export function useLiveAvatarConfig(): LiveAvatarConfig | null {
  const [config, setConfig] = useState<LiveAvatarConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/liveavatar/config")
      .then((res) => res.json())
      .then((data: { characters?: LiveAvatarConfig }) => {
        if (!cancelled && data.characters) {
          setConfig(data.characters);
        }
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}

export function isLiveAvatarEnabledFor(
  config: LiveAvatarConfig | null,
  characterId: VoiceIdentityId | null,
): boolean {
  return Boolean(characterId && config?.[characterId]);
}
