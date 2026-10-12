import { connection } from "next/server";
import { boardOrders } from "@/lib/orders";

export async function GET(_request: Request, ctx: RouteContext<"/api/r/[slug]/orders">) {
  await connection();
  const { slug } = await ctx.params;
  const orders = await boardOrders(slug);
  if (!orders) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ orders, now: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
