import type { NextRequest } from "next/server";
import { getPublicOrder } from "@/lib/orders";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const order = await getPublicOrder(id, token);
  if (!order) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(order, { headers: { "Cache-Control": "no-store" } });
}
