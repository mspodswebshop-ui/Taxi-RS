/**
 * Toont de publieke website van een klant. Gedeeld door /s/[slug] (op het
 * platform) en /d/[host] (op een eigen domein).
 */

import type { Site } from "@prisma/client";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { siteContent } from "@/lib/sites";
import { PAGES, type PagePath } from "@/templates";
import BakkerijSite from "@/templates/bakkerij/site";

export function resolvePage(segments: string[] | undefined): PagePath | null {
  if (!segments || segments.length === 0) return "";
  if (segments.length > 1) return null;
  const hit = PAGES.find(p => p.path === segments[0]);
  return hit ? hit.path : null;
}

export function renderSite(site: Site | null, segments: string[] | undefined, base: string) {
  const page = resolvePage(segments);
  if (!site || site.status === "offline" || page === null) notFound();

  const content = siteContent(site);
  // Pagina's die de klant heeft uitgezet, bestaan niet.
  if (page === "bestellen" && !content.ordering.enabled) notFound();
  if (page === "reviews" && !(content.showReviews && content.reviews.length)) notFound();

  return <BakkerijSite content={content} page={page} base={base} slug={site.slug} concept={site.status === "concept"} />;
}

export function siteMetadata(site: Site | null, segments: string[] | undefined): Metadata {
  if (!site || site.status === "offline") return { title: "Niet gevonden" };
  const content = siteContent(site);
  const page = resolvePage(segments);
  const label = PAGES.find(p => p.path === page)?.label;
  const name = content.business.name;
  return {
    title: { absolute: page && label ? `${label} · ${name}` : `${name}${content.business.city ? ` · ${content.business.city}` : ""}` },
    description: content.business.tagline || content.hero.intro,
    // Een concept hoort niet in Google.
    robots: site.status === "concept" ? { index: false, follow: false } : undefined,
  };
}
