import { db } from "@/lib/db";

// Foto's veranderen nooit: een nieuwe foto krijgt een nieuw ID. Daarom mag de
// browser ze een jaar bewaren.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await db.image.findUnique({ where: { id }, select: { data: true, contentType: true } });
  if (!image) return new Response("Niet gevonden", { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
