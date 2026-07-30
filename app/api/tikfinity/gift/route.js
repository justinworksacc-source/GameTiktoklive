export const dynamic = "force-dynamic";

const CACHE_URL = "https://gift-dash.internal/latest-gift";

function readValue(source, ...keys) {
  const entries = Object.entries(source || {});
  for (const key of keys) {
    const match = entries.find(([candidate]) =>
      candidate.toLowerCase() === key.toLowerCase()
    );
    if (match && match[1] !== undefined && match[1] !== "") return match[1];
  }
}

async function parseRequest(request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams);
  if (request.method === "GET") return query;
  const type = request.headers.get("content-type") || "";
  let body = {};
  try {
    body = type.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    body = {};
  }
  return { ...query, ...(body?.data || {}), ...body };
}

async function saveGift(gift) {
  globalThis.__giftDashLatest = gift;
  if (globalThis.caches?.default) {
    await globalThis.caches.default.put(
      new Request(CACHE_URL),
      new Response(JSON.stringify(gift), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400"
        }
      })
    );
  }
}

async function receive(request) {
  const raw = await parseRequest(request);
  const gift = {
    eventId: crypto.randomUUID(),
    receivedAt: Date.now(),
    id: String(readValue(raw, "giftId", "id") || ""),
    name: String(readValue(raw, "giftName", "giftname", "name") || "Unknown gift"),
    count: Math.max(1, Number(readValue(raw, "repeatCount", "repeatcount", "count") || 1)),
    coins: Math.max(0, Number(readValue(raw, "coins", "diamondCount") || 0)),
    sender: String(readValue(raw, "username", "sender", "uniqueId", "nickname") || "viewer"),
    avatar: String(readValue(raw, "avatar", "profilePictureUrl") || "")
  };
  await saveGift(gift);
  return Response.json({ ok: true, gift });
}

export const GET = receive;
export const POST = receive;
