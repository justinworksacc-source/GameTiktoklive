export const dynamic = "force-dynamic";

const CACHE_URL = "https://gift-dash.internal/latest-gift";

export async function GET() {
  let gift = globalThis.__giftDashLatest || null;
  if (globalThis.caches?.default) {
    const cached = await globalThis.caches.default.match(new Request(CACHE_URL));
    if (cached) gift = await cached.json();
  }
  return Response.json(
    { ok: true, gift },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
