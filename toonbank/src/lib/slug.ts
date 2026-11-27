/** "Zomerjurk Bloemen!" naar "zomerjurk-bloemen". */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Adressen die we niet aan een winkel geven, omdat het platform ze gebruikt. */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "login", "signup", "logout", "s", "app", "www", "help",
  "toonbank", "dashboard", "static", "images",
]);

/**
 * Geeft een vrije variant van `base` terug: base, base-2, base-3, ...
 * `exists` zegt of een kandidaat al in gebruik is.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || "item";
  for (let i = 1; i < 500; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    if (RESERVED_SLUGS.has(candidate)) continue;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}
