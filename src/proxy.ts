import { NextResponse, type NextRequest } from "next/server";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  if (host === ROOT || host === `www.${ROOT}` || !host.endsWith(`.${ROOT}`)) return;

  const sub = host.slice(0, -(ROOT.length + 1));
  if (!/^[a-z0-9-]+$/.test(sub)) return;

  const { pathname, search } = request.nextUrl;
  if (sub === "app" && pathname === "/") return NextResponse.redirect(new URL("/dhaba42", request.url));

  const target = sub === "app" ? `/dash${pathname}` : `/s/${sub}${pathname}`;
  const headers = new Headers(request.headers);
  headers.set("x-base", "");
  const url = request.nextUrl.clone();
  url.pathname = target.replace(/\/$/, "") || "/";
  url.search = search;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-z0-9]+$).*)"],
};
