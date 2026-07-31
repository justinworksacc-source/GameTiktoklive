export const dynamic = "force-dynamic";

const CACHE_URL = "https://gift-dash.internal/latest-event";

export async function GET() {
  let event = globalThis.__giftDashLatest || null;
  if (globalThis.caches?.default) {
    const cached = await globalThis.caches.default.match(new Request(CACHE_URL));
    if (cached) event = await cached.json();
  }
  return Response.json(
    { ok: true, event, gift: event?.type === "gift" ? event : null },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
