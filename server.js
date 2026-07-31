import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const port = Number(process.env.PORT || 3000);

app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  if (/^https:\/\/([a-z0-9-]+\.)?(tikfinity\.com|tikfinity\.zerody\.one)$/i.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let lastGiftAt = 0;
let lastGift = null;
const viewerTeams = new Map();

io.on("connection", (socket) => {
  socket.emit("connection-status", {
    state: lastGiftAt && Date.now() - lastGiftAt < 120000 ? "connected" : "demo",
    message: lastGiftAt && Date.now() - lastGiftAt < 120000
      ? "TikFinity connected — gift received"
      : "TikFinity bridge ready",
    username: ""
  });
});

function readValue(source, ...keys) {
  const entries = Object.entries(source || {});
  for (const key of keys) {
    const match = entries.find(([candidate]) =>
      candidate.toLowerCase() === key.toLowerCase()
    );
    if (match && match[1] !== undefined && match[1] !== "") return match[1];
  }
  return undefined;
}

function receiveGift(req, res) {
  const raw = { ...(req.query || {}), ...(req.body?.data || {}), ...(req.body || {}) };
  const gift = {
    type: "gift",
    id: String(readValue(raw, "giftId", "id") || ""),
    name: String(readValue(raw, "giftName", "giftname", "name") || "Unknown gift"),
    count: Math.max(1, Number(readValue(raw, "repeatCount", "repeatcount", "count") || 1)),
    coins: Math.max(0, Number(readValue(raw, "coins", "diamondCount") || 0)),
    sender: String(readValue(raw, "username", "sender", "uniqueId", "nickname") || "viewer"),
    avatar: String(readValue(raw, "avatar", "profilePictureUrl") || "")
  };
  lastGiftAt = Date.now();
  lastGift = gift;
  console.log(`[TikFinity] ${gift.sender} sent ${gift.name} x${gift.count}`);
  io.emit("gift", gift);
  io.emit("connection-status", {
    state: "connected",
    message: `TikFinity gift received: ${gift.name}`,
    username: gift.sender
  });
  res.json({ ok: true, gift });
}

function receiveComment(req, res) {
  const raw = { ...(req.query || {}), ...(req.body?.data || {}), ...(req.body || {}) };
  const sender = String(readValue(raw, "username", "sender", "uniqueId", "nickname") || "viewer");
  const comment = String(readValue(raw, "comment", "commentText", "commandParams", "message", "text") || "").trim();
  const choice = comment.toLowerCase();
  const team = choice === "g" ? "girls" : choice === "b" ? "boys" : "";
  const event = { type: "comment", eventId: `${Date.now()}-${Math.random()}`, receivedAt: Date.now(), sender, comment, team };
  if (team) viewerTeams.set(sender.toLowerCase(), team);
  io.emit("comment", event);
  res.json({ ok: true, event, accepted: Boolean(team) });
}

app.get("/api/tikfinity/gift", receiveGift);
app.post("/api/tikfinity/gift", receiveGift);
app.get("/api/gift", receiveGift);
app.post("/api/gift", receiveGift);
app.get("/api/tikfinity/comment", receiveComment);
app.post("/api/tikfinity/comment", receiveComment);
app.get("/api/tikfinity/status", (_req, res) => {
  res.json({
    ok: true,
    connected: Boolean(lastGiftAt && Date.now() - lastGiftAt < 120000),
    lastGiftAt,
    lastGift
  });
});

httpServer.listen(port, () => {
  console.log(`Gift Race ready at http://localhost:${port}`);
});
