import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Productfoto's gaan via server actions; standaard is dat 1 MB.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
