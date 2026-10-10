import type { Metadata } from "next";

import { findSiteByDomain } from "@/lib/sites";

import { renderSite, siteMetadata } from "../../../render";

/**
 * Website op een eigen domein. Bezoekers komen hier niet rechtstreeks: de
 * middleware stuurt verkeer op een klantdomein door naar dit pad.
 */

type Props = { params: Promise<{ host: string; page?: string[] }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { host, page } = await params;
  return siteMetadata(await findSiteByDomain(decodeURIComponent(host)), page);
}

export default async function DomainPage({ params }: Props) {
  const { host, page } = await params;
  return renderSite(await findSiteByDomain(decodeURIComponent(host)), page, "");
}
