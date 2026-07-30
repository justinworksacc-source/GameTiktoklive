const DEFAULT_RACERS = [
  { id: "nova", emoji: "⚽", spriteX: 0, spriteY: 0, flag: "🇵🇭", country: "Philippines", color: "#ff4fa3", gift: "Rose", giftEmoji: "🌹", step: 10, wins: 0 },
  { id: "bolt", emoji: "⚽", spriteX: 1, spriteY: 0, flag: "🇺🇸", country: "United States", color: "#ffb43b", gift: "GG", giftEmoji: "🌈", step: 10, wins: 0 },
  { id: "pixel", emoji: "⚽", spriteX: 2, spriteY: 0, flag: "🇮🇩", country: "Indonesia", color: "#a178ff", gift: "You're awesome", giftEmoji: "🐱", step: 10, wins: 0 },
  { id: "orbit", emoji: "⚽", spriteX: 0, spriteY: 1, flag: "🇻🇳", country: "Vietnam", color: "#3fe0b4", gift: "Clap Clap", giftEmoji: "👏", step: 10, wins: 0 },
  { id: "comet", emoji: "⚽", spriteX: 1, spriteY: 1, flag: "🇲🇾", country: "Malaysia", color: "#57c9ff", gift: "Pop", giftEmoji: "🐏", step: 10, wins: 0 },
  { id: "blaze", emoji: "⚽", spriteX: 2, spriteY: 1, flag: "🇹🇭", country: "Thailand", color: "#ff6b4a", gift: "Freestyle", giftEmoji: "🎹", step: 10, wins: 0 }
];

const saved = JSON.parse(localStorage.getItem("gift-dash-racers") || "null");
const savedRacers = Array.isArray(saved) ? saved : saved?.racers;
const hasFairGiftConfig = saved?.version === 2;
let racers = DEFAULT_RACERS.map((defaults, index) => ({
  ...DEFAULT_RACERS[index],
  ...(hasFairGiftConfig ? savedRacers?.[index] : {}),
  name: DEFAULT_RACERS[index].country,
  emoji: "⚽",
  spriteX: DEFAULT_RACERS[index].spriteX,
  spriteY: DEFAULT_RACERS[index].spriteY,
  step: 10,
  wins: Number(savedRacers?.[index]?.wins || 0),
  progress: 0,
  finishing: false
}));
let round = Number(localStorage.getItem("gift-dash-round") || 1);
let winnerDisplayTimer = null;

const els = {
  lanes: document.querySelector("#lanes"),
  giftList: document.querySelector("#giftList"),
  leaderStrip: document.querySelector("#leaderStrip"),
  mappingEditor: document.querySelector("#mappingEditor"),
  statusDot: document.querySelector("#statusDot"),
  statusText: document.querySelector("#statusText"),
  drawer: document.querySelector("#drawer"),
  scrim: document.querySelector("#scrim"),
  toastStack: document.querySelector("#toastStack"),
  webhookUrl: document.querySelector("#webhookUrl"),
  copyWebhook: document.querySelector("#copyWebhook"),
  winnerBurst: document.querySelector("#winnerBurst"),
  roundNumber: document.querySelector("#roundNumber")
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function spriteVars(racer) {
  return `--sprite-x:${racer.spriteX};--sprite-y:${racer.spriteY}`;
}

function render() {
  els.roundNumber.textContent = String(round).padStart(2, "0");
  els.lanes.innerHTML = racers.map((racer, index) => `
    <div class="lane" style="--racer:${racer.color}; --delay:${index * 80}ms">
      <span class="lane-number">${index + 1}</span>
      <div class="racer" id="racer-${racer.id}" style="left:calc(4% + ${racer.progress * 0.86}%)">
        <span class="speed-lines"></span>
        <span class="racer-flag" title="${escapeHtml(racer.country)}">${racer.flag}</span>
        <span class="character soccer-player" style="${spriteVars(racer)}"></span>
        <span class="racer-label">${escapeHtml(racer.name)}</span>
        <span class="win-badge">🏆 ${racer.wins}</span>
      </div>
    </div>`).join("");

  els.giftList.innerHTML = racers.map((racer) => `
    <button class="gift-card" data-racer="${racer.id}" style="--racer:${racer.color}">
      <span class="gift-icon">${racer.giftEmoji}</span>
      <span class="gift-copy"><strong>${escapeHtml(racer.gift)}</strong><small>🪙 1 coin · +${racer.step} boost</small></span>
      <span class="racer-mini">${racer.flag} ⚽<b>🏆${racer.wins}</b></span>
    </button>`).join("");

  els.mappingEditor.innerHTML = racers.map((racer) => `
    <div class="mapping-row" data-id="${racer.id}">
      <span class="map-racer" style="background:${racer.color}22;color:${racer.color}">${racer.flag}<i class="mini-soccer-player" style="${spriteVars(racer)}"></i></span>
      <label><span>${escapeHtml(racer.name)}</span><input data-field="gift" value="${escapeHtml(racer.gift)}" /></label>
      <label class="boost-field"><span>Fair boost</span><input data-field="step" type="number" value="${racer.step}" readonly /></label>
    </div>`).join("");

  renderLeaders();
}

function renderLeaders() {
  const sorted = [...racers]
    .sort((a, b) => (b.wins - a.wins) || (b.progress - a.progress))
    .slice(0, 3);
  els.leaderStrip.innerHTML = sorted.map((racer, index) => `
    <div class="leader-card ${index === 0 ? "first" : ""}" style="--racer:${racer.color}">
      <span class="rank">${index + 1}</span><span class="leader-avatar mini-soccer-player" style="${spriteVars(racer)}"></span>
      <span><small>${racer.flag} ${escapeHtml(racer.country)}</small><strong>🏆 ${racer.wins} wins</strong></span>
      <b>${Math.round(racer.progress)}%</b>
    </div>`).join("");
}

function showToast(gift, racer) {
  const toast = document.createElement("div");
  toast.className = "gift-toast";
  toast.innerHTML = `<span>${racer.giftEmoji}</span><div><strong>@${escapeHtml(gift.sender || "demo")} sent ${escapeHtml(gift.name)}</strong><small>${racer.name} boosted +${racer.step * gift.count}</small></div>`;
  els.toastStack.prepend(toast);
  setTimeout(() => toast.remove(), 4200);
}

function boostRacer(racer, gift = {}) {
  if (racer.finishing) return;
  const count = Math.max(1, Number(gift.count || 1));
  racer.progress = Math.min(100, racer.progress + racer.step * count);
  const node = document.querySelector(`#racer-${racer.id}`);
  if (node) {
    node.style.left = `calc(4% + ${racer.progress * 0.86}%)`;
    node.classList.remove("boosting");
    requestAnimationFrame(() => node.classList.add("boosting"));
  }
  showToast({ sender: "demo_viewer", name: racer.gift, ...gift }, racer);
  renderLeaders();
  if (racer.progress >= 100) declareWinner(racer);
}

function declareWinner(racer) {
  racer.finishing = true;
  racer.wins += 1;
  saveRacers();
  const winBadge = document.querySelector(`#racer-${racer.id} .win-badge`);
  if (winBadge) winBadge.textContent = `🏆 ${racer.wins}`;
  renderLeaders();
  els.winnerBurst.style.setProperty("--winner", racer.color);
  els.winnerBurst.innerHTML = `<div><span class="winner-icons">${racer.flag}<i class="mini-soccer-player" style="${spriteVars(racer)}"></i></span><span class="winner-copy"><small>FINISH LINE!</small><strong>${escapeHtml(racer.name)}</strong></span><em>🏆 ${racer.wins} total wins</em><p>Others keep racing</p></div>`;
  els.winnerBurst.classList.add("show");

  clearTimeout(winnerDisplayTimer);
  winnerDisplayTimer = setTimeout(() => {
    els.winnerBurst.classList.remove("show");
    setTimeout(() => { els.winnerBurst.innerHTML = ""; }, 300);
  }, 2200);

  // Only the country that finished returns to the starting line.
  setTimeout(() => {
    racer.progress = 0;
    racer.finishing = false;
    render();
  }, 2400);
}

function resetRace() {
  racers.forEach((racer) => racer.progress = 0);
  racers.forEach((racer) => racer.finishing = false);
  round += 1;
  localStorage.setItem("gift-dash-round", round);
  els.winnerBurst.classList.remove("show");
  setTimeout(() => { els.winnerBurst.innerHTML = ""; }, 300);
  render();
}

function findRacerForGift(gift) {
  const giftName = String(gift.name || "").trim().toLowerCase();
  const giftId = String(gift.id || "");
  return racers.find((racer) =>
    racer.gift.trim().toLowerCase() === giftName ||
    (racer.giftId && String(racer.giftId) === giftId)
  );
}

function saveRacers() {
  localStorage.setItem("gift-dash-racers", JSON.stringify({
    version: 2,
    racers: racers.map(({ progress, finishing, ...item }) => item)
  }));
}

function openDrawer(open = true) {
  els.drawer.classList.toggle("open", open);
  els.scrim.classList.toggle("show", open);
  els.drawer.setAttribute("aria-hidden", String(!open));
}

document.querySelector("#settingsButton").addEventListener("click", () => openDrawer(true));
document.querySelector("#closeDrawer").addEventListener("click", () => openDrawer(false));
els.scrim.addEventListener("click", () => openDrawer(false));
document.querySelector("#resetButton").addEventListener("click", resetRace);

els.giftList.addEventListener("click", (event) => {
  const card = event.target.closest(".gift-card");
  if (!card) return;
  const racer = racers.find((item) => item.id === card.dataset.racer);
  if (racer) boostRacer(racer);
});

els.mappingEditor.addEventListener("change", (event) => {
  const input = event.target.closest("input");
  if (!input) return;
  const racer = racers.find((item) => item.id === input.closest(".mapping-row").dataset.id);
  if (!racer) return;
  racer[input.dataset.field] = input.dataset.field === "step"
    ? Math.max(1, Math.min(100, Number(input.value) || 1))
    : input.value.trim();
  saveRacers();
  render();
});

const webhookUrl = `${location.origin}/api/tikfinity/gift?giftName={giftname}&repeatCount={repeatcount}&sender={username}&coins={coins}`;
els.webhookUrl.value = webhookUrl;
document.querySelector("#webhookTemplate").textContent =
  "TikFinity → Actions & Events → Create Action → Trigger Webhook";
els.copyWebhook.addEventListener("click", async () => {
  await navigator.clipboard.writeText(webhookUrl);
  els.copyWebhook.textContent = "Copied ✓";
  setTimeout(() => { els.copyWebhook.textContent = "Copy"; }, 1800);
});

let lastGiftEventId = sessionStorage.getItem("gift-dash-last-event") || "";

async function pollLatestGift() {
  try {
    const response = await fetch(`/api/tikfinity/latest?t=${Date.now()}`, {
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { gift } = await response.json();
    if (gift?.eventId && gift.eventId !== lastGiftEventId) {
      lastGiftEventId = gift.eventId;
      sessionStorage.setItem("gift-dash-last-event", lastGiftEventId);
      const racer = findRacerForGift(gift);
      if (racer) boostRacer(racer, gift);
      els.statusDot.dataset.state = "connected";
      els.statusText.textContent = `TikFinity connected — ${gift.name} received`;
    }
  } catch {
    els.statusDot.dataset.state = "demo";
    els.statusText.textContent = "Gift bridge reconnecting…";
  }
}

pollLatestGift();
setInterval(pollLatestGift, 750);

saveRacers();
render();
