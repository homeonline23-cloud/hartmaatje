/**
 * Lightweight online check before Bioscoop initializes live streams.
 * Prefers navigator.onLine, then a tiny no-cors fetch to a public endpoint.
 */
export async function checkInternet(timeoutMs = 3500): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // no-cors: opaque response still means the network path worked
    await fetch("https://www.youtube-nocookie.com/generate_204", {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch {
    try {
      await fetch("https://www.google.com/generate_204", {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
      return true;
    } catch {
      return false;
    }
  } finally {
    clearTimeout(timer);
  }
}
