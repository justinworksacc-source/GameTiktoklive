const TARGET_SCORE = 50;
const DEFAULT_TEAMS = [
  { id: "girls", name: "Girls", gift: "Rose", giftEmoji: "🌹", color: "#ff3b9d" },
  { id: "boys", name: "Boys", gift: "GG", giftEmoji: "🟦", color: "#168cff" }
];

let teams = DEFAULT_TEAMS.map((team) => ({ ...team, score: 0 }));
let round = Number(localStorage.getItem("battle-round") || 1);
let locked = false;
const viewerTeams = new Map(JSON.parse(localStorage.getItem("battle-viewer-teams") || "[]"));
let lastEventId = sessionStorage.getItem("battle-last-event") || "";

const $ = (selector) => document.querySelector(selector);
const els = {
  statusDot: $("#statusDot"),
  statusText: $("#statusText"),
  drawer: $("#drawer"),
  scrim: $("#scrim"),
  webhookUrl: $("#webhookUrl"),
  mappingEditor: $("#mappingEditor"),
  toastStack: $("#toastStack"),
  winnerOverlay: $("#winnerOverlay"),
  winnerName: $("#winnerName"),
  roundNumber: $("#roundNumber")
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function render() {
  const total = Math.max(1, teams.reduce((sum, team) => sum + team.score, 0));
  teams.forEach((team) => {
    $(`#${team.id}Score`).textContent = team.score;
    $(`#${team.id}Detail`).textContent = `${team.score} / ${TARGET_SCORE} gifts`;
    const share = team.score === 0 && total === 1 ? 0 : (team.score / total) * 46;
    $(`#${team.id}Bar`).style.width = `${share}%`;
  });
  els.roundNumber.textContent = String(round).padStart(2, "0");
}

function renderMappings() {
  els.mappingEditor.innerHTML = `
    <div class="mapping-row"><span class="map-racer" style="background:#ff3b9d22;color:#ff3b9d">G</span><label><span>G COMMENT</span><input value="Joins Team Girls" readonly></label></div>
    <div class="mapping-row"><span class="map-racer" style="background:#168cff22;color:#168cff">B</span><label><span>B COMMENT</span><input value="Joins Team Boys" readonly></label></div>`;
}

function showToast(team, gift) {
  const toast = document.createElement("div");
  toast.className = "gift-toast";
  const detail = gift.isComment
    ? `Commented ${team.id === "girls" ? "G" : "B"} · team selected`
    : `${escapeHtml(gift.name || "Gift")} · +${gift.count || 1} point`;
  toast.innerHTML = `<span>${team.giftEmoji}</span><div><strong>@${escapeHtml(gift.sender || "demo_viewer")} ${gift.isComment ? "joined" : "boosted"} Team ${team.name}</strong><small>${detail}</small></div>`;
  els.toastStack.prepend(toast);
  setTimeout(() => toast.remove(), 3500);
}

function addScore(team, gift = {}) {
  if (locked) return;
  const count = Math.max(1, Number(gift.count || 1));
  team.score = Math.min(TARGET_SCORE, team.score + count);
  showToast(team, { name: team.gift, sender: "demo_viewer", ...gift, count });
  render();
  if (team.score >= TARGET_SCORE) showWinner(team);
}

function chooseTeam(sender, teamId, announce = true) {
  const team = teams.find((item) => item.id === teamId);
  if (!team || !sender) return;
  viewerTeams.set(sender.toLowerCase(), team.id);
  localStorage.setItem("battle-viewer-teams", JSON.stringify([...viewerTeams]));
  if (announce) showToast(team, { sender, isComment: true });
}

function handleGift(gift) {
  const teamId = viewerTeams.get(String(gift.sender || "").toLowerCase());
  const team = teams.find((item) => item.id === teamId);
  if (team) addScore(team, gift);
}

function handleEvent(event) {
  if (!event || event.eventId === lastEventId) return;
  lastEventId = event.eventId || `${event.type}-${event.receivedAt}`;
  sessionStorage.setItem("battle-last-event", lastEventId);
  if (event.type === "comment" && event.team) chooseTeam(event.sender, event.team);
  if (event.type === "gift") handleGift(event);
}

function showWinner(team) {
  locked = true;
  els.winnerOverlay.dataset.winner = team.id;
  els.winnerName.textContent = `${team.name.toUpperCase()}!`;
  els.winnerOverlay.classList.add("show");
}

function resetRound(advance = false) {
  teams.forEach((team) => { team.score = 0; });
  locked = false;
  els.winnerOverlay.classList.remove("show");
  if (advance) {
    round += 1;
    localStorage.setItem("battle-round", round);
  }
  render();
}

function openDrawer(open) {
  els.drawer.classList.toggle("open", open);
  els.scrim.classList.toggle("show", open);
  els.drawer.setAttribute("aria-hidden", String(!open));
}

document.querySelectorAll(".gift-button").forEach((button) => {
  button.addEventListener("click", () => {
    chooseTeam("demo_viewer", button.dataset.team);
    setTimeout(() => handleGift({ sender: "demo_viewer", name: "Test gift", count: 1 }), 250);
  });
});
$("#resetButton").addEventListener("click", () => resetRound(false));
$("#nextRound").addEventListener("click", () => resetRound(true));
$("#settingsButton").addEventListener("click", () => openDrawer(true));
$("#closeDrawer").addEventListener("click", () => openDrawer(false));
els.scrim.addEventListener("click", () => openDrawer(false));

const webhookUrl = `${location.origin}/api/tikfinity/gift?giftName=%giftName%&repeatCount=%repeatCount%&sender=%username%&coins=%coins%`;
const commentWebhookUrl = `${location.origin}/api/tikfinity/comment?comment=%commandParams%&sender=%username%`;
els.webhookUrl.value = webhookUrl;
$("#commentWebhookUrl").value = commentWebhookUrl;
$("#webhookTemplate").textContent = "Comment action → comment webhook · Gift action → gift webhook";
$("#copyWebhook").addEventListener("click", async (event) => {
  await navigator.clipboard.writeText(webhookUrl);
  event.currentTarget.textContent = "Copied ✓";
  setTimeout(() => { event.currentTarget.textContent = "Copy"; }, 1600);
});
$("#copyCommentWebhook").addEventListener("click", async (event) => {
  await navigator.clipboard.writeText(commentWebhookUrl);
  event.currentTarget.textContent = "Copied ✓";
  setTimeout(() => { event.currentTarget.textContent = "Copy"; }, 1600);
});

if (typeof io === "function") {
  const socket = io();
  socket.on("connection-status", ({ state, message }) => {
    els.statusDot.dataset.state = state;
    els.statusText.textContent = message;
  });
  socket.on("gift", (gift) => {
    handleGift(gift);
  });
  socket.on("comment", (event) => {
    if (event.team) chooseTeam(event.sender, event.team);
  });
}

async function pollLatestEvent() {
  try {
    const response = await fetch(`/api/tikfinity/latest?t=${Date.now()}`, { cache: "no-store" });
    const data = await response.json();
    handleEvent(data.event || data.gift);
  } catch {}
}
setInterval(pollLatestEvent, 1200);
pollLatestEvent();

renderMappings();
render();
