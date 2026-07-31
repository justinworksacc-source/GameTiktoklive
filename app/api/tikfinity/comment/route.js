export const dynamic = "force-dynamic";

const CACHE_URL = "https://gift-dash.internal/latest-event";

function readValue(source, ...keys) {
  const entries = Object.entries(source || {});
  for (const key of keys) {
    const match = entries.find(([candidate]) => candidate.toLowerCase() === key.toLowerCase());
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

async function receive(request) {
  const raw = await parseRequest(request);
  const text = String(readValue(raw, "comment", "commentText", "commandParams", "message", "text") || "").trim();
  const choice = text.toLowerCase();
  const event = {
    type: "comment",
    eventId: crypto.randomUUID(),
    receivedAt: Date.now(),
    sender: String(readValue(raw, "username", "sender", "uniqueId", "nickname") || "viewer"),
    comment: text,
    team: choice === "g" ? "girls" : choice === "b" ? "boys" : ""
  };

  if (globalThis.caches?.default) {
    await globalThis.caches.default.put(
      new Request(CACHE_URL),
      new Response(JSON.stringify(event), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" }
      })
    );
  }
  globalThis.__giftDashLatest = event;
  return Response.json({ ok: true, event, accepted: Boolean(event.team) });
}

export const GET = receive;
export const POST = receive;
