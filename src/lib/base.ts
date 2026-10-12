import "server-only";
import { headers } from "next/headers";

export async function basePath(fallback: string): Promise<string> {
  const value = (await headers()).get("x-base");
  return value === null ? fallback : value;
}
