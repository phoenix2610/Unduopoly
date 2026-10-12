import type { NextConfig } from "next";
import os from "node:os";

const lanHosts = Object.values(os.networkInterfaces())
  .flatMap((addrs) => addrs ?? [])
  .filter((a) => a.family === "IPv4" && !a.internal)
  .map((a) => a.address);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: lanHosts,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
