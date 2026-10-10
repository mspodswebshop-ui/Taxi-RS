import type { Metadata } from "next";

import { findSiteBySlug } from "@/lib/sites";

import { renderSite, siteMetadata } from "../../../render";

type Props = { params: Promise<{ slug: string; page?: string[] }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  return siteMetadata(await findSiteBySlug(slug), page);
}

export default async function SitePage({ params }: Props) {
  const { slug, page } = await params;
  return renderSite(await findSiteBySlug(slug), page, `/s/${slug}`);
}
