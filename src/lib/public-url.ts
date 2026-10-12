import "server-only";
import os from "node:os";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
const LOCAL = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(ROOT);
const VERCEL_HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

export function lanAddress(): string | null {
  const candidates = Object.entries(os.networkInterfaces())
    .filter(([name]) => !/^(docker|br-|veth|virbr|tun|tailscale|lo)/.test(name))
    .flatMap(([, addrs]) => addrs ?? [])
    .filter((a) => a.family === "IPv4" && !a.internal)
    .map((a) => a.address);
  return candidates.find((ip) => ip.startsWith("192.168.")) ?? candidates.find((ip) => ip.startsWith("10.")) ?? candidates[0] ?? null;
}

export function storefrontUrl(slug: string, path = ""): string {
  if (!LOCAL) return `https://${slug}.${ROOT}${path}`;
  if (VERCEL_HOST) return `https://${VERCEL_HOST}/s/${slug}${path}`;
  const override = process.env.QR_BASE_URL?.replace(/\/$/, "");
  if (override) return `${override}/s/${slug}${path}`;
  const port = ROOT.split(":")[1] ?? "3000";
  const ip = lanAddress();
  return `http://${ip ?? "localhost"}:${port}/s/${slug}${path}`;
}

export const qrIsLocal = LOCAL && !VERCEL_HOST;
