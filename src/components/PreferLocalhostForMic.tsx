"use client";

import { useEffect } from "react";

/**
 * Browsers treat `localhost` as a secure context for getUserMedia more
 * reliably than raw `127.0.0.1`. Redirect once so mic audio is not empty silence.
 */
export function PreferLocalhostForMic() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hostname !== "127.0.0.1") return;
    const next = window.location.href.replace(
      "://127.0.0.1",
      "://localhost"
    );
    console.log("[hm-mic] redirect 127.0.0.1 → localhost for secure mic", next);
    window.location.replace(next);
  }, []);
  return null;
}
