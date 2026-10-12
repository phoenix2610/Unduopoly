import type { NextRequest } from "next/server";
import { slotsFor } from "@/lib/orders";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/r/[slug]/slots">) {
  const { slug } = await ctx.params;
  const asked = request.nextUrl.searchParams.get("kind");
  const kind = asked === "dine_in" || asked === "booking" ? asked : "pickup";
  const party = Math.min(12, Math.max(1, Number(request.nextUrl.searchParams.get("party")) || 2));
  const result = await slotsFor(slug, kind, party);
  if (!result) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
