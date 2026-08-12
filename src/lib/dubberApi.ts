/**
 * Dubber upstream.
 *
 * Production (Hetzner): FastAPI Docker at http://127.0.0.1:8096
 * Local Windows (no Docker): relay through https://hartmaatje.app/api/dubber
 *
 * Set DUBBER_API_URL to override.
 *   FastAPI:  http://127.0.0.1:8096
 *   Relay:    https://hartmaatje.app
 */

function base(): string {
  return (
    process.env.DUBBER_API_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:8096"
  );
}

/** Live Next.js relay (PC has no local dubber container). */
function isRelay(url: string): boolean {
  return (
    url.includes("hartmaatje.app") ||
    process.env.DUBBER_MODE === "relay" ||
    url.includes("/api/dubber")
  );
}

export function dubberApiBase(): string {
  return base();
}

export function dubberUrls() {
  const b = base();
  if (isRelay(b)) {
    const root = b.includes("/api/dubber") ? b : `${b}/api/dubber`;
    return {
      health: `${root}/health`,
      jobs: `${root}/jobs`,
      job: (id: string) => `${root}/jobs/${id}`,
      download: (id: string) => `${root}/jobs/${id}/download`,
      installStory: (id: string) => `${root}/jobs/${id}/install-story`,
      relay: true as const,
    };
  }
  return {
    health: `${b}/health`,
    jobs: `${b}/api/v1/jobs`,
    job: (id: string) => `${b}/api/v1/jobs/${id}`,
    download: (id: string) => `${b}/api/v1/jobs/${id}/download`,
    installStory: (id: string) => `${b}/api/v1/jobs/${id}/install-story`,
    relay: false as const,
  };
}
