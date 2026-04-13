import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@taxibrat/shared"],
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/:path*`,
      },
    ];
  },
};

export default config;
