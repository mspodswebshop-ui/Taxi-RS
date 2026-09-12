import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Paylity draait uitsluitend in TEST MODE. Deze vlag is overal in de app
  // zichtbaar, zodat niemand denkt dat er echt geld verwerkt wordt.
  env: {
    NEXT_PUBLIC_PAYLITY_MODE: process.env.PAYLITY_MODE ?? "test",
  },
};

export default nextConfig;
