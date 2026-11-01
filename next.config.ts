import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // ffmpeg ships as a binary package and the stream resolver is CJS-heavy —
  // keep both out of the bundler and pull the binary into the traced output.
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "@distube/ytdl-core"],
  outputFileTracingIncludes: {
    "/api/clips/[id]/render": [
      "./node_modules/@ffmpeg-installer/**",
      "./node_modules/@distube/**",
      "./public/fonts/**",
    ],
    "/api/diag": ["./node_modules/@distube/**"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
