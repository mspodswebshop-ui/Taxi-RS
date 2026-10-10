import { NextResponse, type NextRequest } from "next/server";

/**
 * Eigen domeinen van klanten.
 *
 * Staat PLATFORM_HOSTS ingesteld (bv. "weblity.be,www.weblity.be"), dan wordt
 * elk ander adres behandeld als het domein van een klant: bakkerij.be/contact
 * toont dan intern /d/bakkerij.be/contact. Zonder PLATFORM_HOSTS doet dit niets.
 */
export function middleware(req: NextRequest) {
  const platform = (process.env.PLATFORM_HOSTS ?? "")
    .split(",")
    .map(h => h.trim().toLowerCase())
    .filter(Boolean);
  if (!platform.length) return NextResponse.next();

  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (!host || platform.includes(host)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/d/${encodeURIComponent(host)}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Niet voor bestanden van Next zelf en niet voor de API.
  matcher: ["/((?!_next/|api/|favicon.ico|icon.svg).*)"],
};
