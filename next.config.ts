import type { NextConfig } from "next";

// Clerk production serves clerk-js from the instance's own domain
// (clerk.lgndrymarketing.app) and uses Cloudflare Turnstile for bot
// protection — both must be allowed or the auth widgets silently never mount.
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.lgndrymarketing.app https://*.clerk.dev https://*.clerk.accounts.dev https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://utfs.io",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "connect-src 'self' https://clerk.lgndrymarketing.app https://clerk-telemetry.com https://*.clerk.dev https://*.clerk.accounts.dev https://checkout.creem.io https://*.ably.io wss://*.ably.io https://services.leadconnectorhq.com https://uploadthing.com https://*.uploadthing.com https://*.ingest.uploadthing.com https://utfs.io",
  "frame-src 'self' https://clerk.lgndrymarketing.app https://*.clerk.dev https://*.clerk.accounts.dev https://challenges.cloudflare.com https://utfs.io",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "utfs.io" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
