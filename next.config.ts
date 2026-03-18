import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Faster dev experience
  reactStrictMode: false, // Prevents double-renders in dev
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Pre-warm common pages
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },
};

export default nextConfig;
