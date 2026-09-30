import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export makes the app deployable to Cloudflare Pages without a Node server.
  output: "export",
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "fys.tff.org", pathname: "/TFFUploadFolder/KulupLogolari/**" }],
  },
};

export default nextConfig;
