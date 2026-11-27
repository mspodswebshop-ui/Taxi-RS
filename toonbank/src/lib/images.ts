import "server-only";

import { db } from "@/lib/db";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

/** Herkent het bestandstype aan de eerste bytes, niet aan wat de browser zegt. */
function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP")
    return "image/webp";
  if (buf.subarray(0, 3).toString("ascii") === "GIF") return "image/gif";
  if (buf.subarray(4, 12).toString("ascii").startsWith("ftypavi")) return "image/avif";
  return null;
}

export type SaveImageResult = { id: string } | { error: string };

export async function saveImage(storeId: string, file: File): Promise<SaveImageResult> {
  if (file.size === 0) return { error: "Leeg bestand." };
  if (file.size > MAX_BYTES) return { error: `${file.name} is groter dan 4 MB.` };
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || !ALLOWED.has(type)) return { error: `${file.name} is geen JPG, PNG, WebP, GIF of AVIF.` };
  const image = await db.image.create({
    data: { storeId, contentType: type, data: buf, size: buf.length },
    select: { id: true },
  });
  return image;
}

/** Haalt de echte bestanden uit een formulierveld (lege velden vallen weg). */
export function filesFrom(form: FormData, name: string): File[] {
  return form
    .getAll(name)
    .filter((f): f is File => typeof f === "object" && f !== null && "size" in f && f.size > 0);
}

export function imageUrl(id: string | null | undefined): string | null {
  return id ? `/images/${id}` : null;
}
