import type { NextConfig } from "next";

const youtubeFrameSrc = [
  "https://www.youtube-nocookie.com",
  "https://youtube-nocookie.com",
  "https://*.youtube-nocookie.com",
  "https://www.youtube.com",
  "https://youtube.com",
].join(" ");

const youtubeMediaSrc = [
  "'self'",
  "blob:",
  "https://www.youtube-nocookie.com",
  "https://youtube-nocookie.com",
  "https://*.youtube-nocookie.com",
  "https://www.youtube.com",
  "https://*.googlevideo.com",
].join(" ");

/* Local self-hosted API/STT (apps/api :8000, services/stt :9000) — plain HTTP,
 * different port = different origin from the page itself, so 'self' alone
 * doesn't cover it and it needs explicit allowances here. */
const localApiSrc = [
  "http://127.0.0.1:8000",
  "http://localhost:8000",
  "http://127.0.0.1:9000",
  "http://localhost:9000",
].join(" ");

const csp = [
  "default-src 'self'",
  `frame-src 'self' ${youtubeFrameSrc}`,
  `media-src ${youtubeMediaSrc}`,
  "img-src 'self' data: blob: https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' https: wss: ws: ${localApiSrc}`,
  "font-src 'self' data:",
].join("; ");

const nextConfig: NextConfig = {
  /* Allow 127.0.0.1 in addition to localhost for Next.js 16+ dev assets/HMR */
  allowedDevOrigins: ["127.0.0.1"],
  /* Fase 1: web-first tablet/laptop — mic + secure YouTube embeds for Bioscoop */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "microphone=(self), camera=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
