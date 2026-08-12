import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: [
    "localhost",
    "localhost:3000",
    "localhost:3010",
    "127.0.0.1",
    "127.0.0.1:3000",
    "127.0.0.1:3010",
    "192.168.2.1",
    "192.168.2.1:3000",
    "192.168.2.1:3010",
    "http://192.168.2.1:3000",
    "http://192.168.2.1:3010",
    "http://localhost:3000",
    "http://localhost:3010",
  ],
};

export default nextConfig;
