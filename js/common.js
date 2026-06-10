/* Shared helpers: news ticker, formatting, modal. */

function usd(n) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function eur(n) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "EUR" });
}

/* Live EUR->USD rate, refreshed from data/fx.json (written by the data job).
 * Used for the handful of values fetched live from Cardmarket in EUR; all
 * cached/server data is already converted to USD. */
let EUR_USD = 1.08;
(async () => {
  try {
    const res = await fetch("data/fx.json", { cache: "no-cache" });
    if (res.ok) {
      const fx = await res.json();
      if (fx.eurUsd > 0.5 && fx.eurUsd < 3) EUR_USD = fx.eurUsd;
    }
  } catch { /* keep fallback rate */ }
})();

/* Format an EUR amount as USD using the live rate. */
function eurUsd(n) {
  if (n == null || isNaN(n)) return "—";
  return usd(n * EUR_USD);
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function rarityClass(rarity) {
  const r = String(rarity ?? "").toLowerCase();
  if (r.includes("manga")) return "rarity-glow-manga";
  if (r.includes("secret") || r.includes("hyper")) return "rarity-glow-secret";
  if (r.includes("special") || r.includes("alternate") || r.includes("illustration")) return "rarity-glow-special";
  if (r.includes("ultra") || r.includes("rainbow") || r.includes("gold")) return "rarity-glow-ultra";
  if (r.includes("holo") || r.includes("double rare") || r.includes("ace")) return "rarity-glow-holo";
  if (r.includes("super")) return "rarity-glow-super";
  if (r.includes("leader")) return "rarity-glow-leader";
  if (r.includes("rare")) return "rarity-glow-rare";
  if (r.includes("uncommon")) return "rarity-glow-uncommon";
  if (r.includes("common")) return "rarity-glow-common";
  return "";
}

function detailStat(label, value) {
  const shown = value == null || value === "" || Number.isNaN(value) ? "—" : value;
  return `<div class="detail-stat"><span>${esc(label)}</span><b>${esc(shown)}</b></div>`;
}

function localMarketNote(source, updated) {
  return `<div class="note">Data shown in PokeSnipr from ${esc(source)}${updated ? ` · updated ${esc(updated)}` : ""}.</div>`;
}

function hiResImage(url) {
  const s = String(url ?? "");
  if (s.includes("images.pokemontcg.io") && s.endsWith(".png") && !s.endsWith("_hires.png")) {
    return s.replace(/\.png$/, "_hires.png");
  }
  if (s.includes("tcgplayer-cdn.tcgplayer.com")) {
    return s.replace(/_200w(?=\.jpg)/, "_in_1000x1000");
  }
  return s;
}

function joinList(xs) {
  return Array.isArray(xs) && xs.length ? xs.join(", ") : null;
}

/* ---------- News ticker ----------
 * Primary source: data/news.json, refreshed by a scheduled GitHub Action.
 * Fallback: live Google News RSS through a public CORS proxy.
 */
const NEWS_SOURCES = [
  { key: "pokebeach", label: "PokeBeach", rss: "https://news.google.com/rss/search?q=site:pokebeach.com&hl=en-US&gl=US&ceid=US:en" },
  { key: "tcgplayer", label: "TCGplayer", rss: "https://news.google.com/rss/search?q=site:tcgplayer.com&hl=en-US&gl=US&ceid=US:en" },
  { key: "pokemoncenter", label: "Pokémon Center", rss: "https://news.google.com/rss/search?q=%22pokemon%20center%22&hl=en-US&gl=US&ceid=US:en" },
];

async function loadNews() {
  const el = document.getElementById("ticker");
  if (!el) return;

  let items = null;
  try {
    const res = await fetch("data/news.json", { cache: "no-cache" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length) items = data.items;
    }
  } catch { /* fall through to live fetch */ }

  if (!items) items = await fetchNewsLive();

  if (!items || !items.length) {
    el.innerHTML = `<span class="ticker-item">News feed temporarily unavailable — see
      <a href="https://www.pokebeach.com" target="_blank" rel="noopener">PokeBeach</a>,
      <a href="https://www.tcgplayer.com/content" target="_blank" rel="noopener">TCGplayer Infinite</a>, and
      <a href="https://www.pokemoncenter.com" target="_blank" rel="noopener">Pokémon Center</a>.</span>`;
    return;
  }

  const html = items.slice(0, 24).map((it) => `
    <span class="ticker-item">
      <span class="ticker-source src-${esc(it.source)}">${esc(it.sourceLabel || it.source)}</span>
      <a href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.title)}</a>
    </span>`).join("");

  // Content is doubled so the -50% translate loops seamlessly.
  el.innerHTML = html + html;
}

async function fetchNewsLive() {
  const all = [];
  await Promise.all(NEWS_SOURCES.map(async (src) => {
    try {
      const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(src.rss)}`;
      const res = await fetch(proxied);
      if (!res.ok) return;
      const xml = new DOMParser().parseFromString(await res.text(), "text/xml");
      xml.querySelectorAll("item").forEach((item, i) => {
        if (i >= 8) return;
        const title = item.querySelector("title")?.textContent?.trim();
        const link = item.querySelector("link")?.textContent?.trim();
        const pubDate = item.querySelector("pubDate")?.textContent ?? "";
        if (title && link) {
          all.push({ source: src.key, sourceLabel: src.label, title, link, pubDate });
        }
      });
    } catch { /* one bad feed shouldn't kill the ticker */ }
  }));
  all.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  return all;
}

/* ---------- Per-card price history (from daily snapshots) ---------- */
let HISTORY_CACHE = null;

async function getHistory() {
  if (!HISTORY_CACHE) {
    try {
      const res = await fetch("data/price-history.json", { cache: "no-cache" });
      HISTORY_CACHE = res.ok ? await res.json() : { snapshots: [] };
    } catch {
      HISTORY_CACHE = { snapshots: [] };
    }
  }
  return HISTORY_CACHE;
}

function sparklineSVG(points, w = 360, h = 90) {
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.15 || max * 0.05 || 1;
  const lo = min - pad, hi = max + pad;
  const x = (i) => 4 + (i / (points.length - 1)) * (w - 8);
  const y = (v) => h - 4 - ((v - lo) / (hi - lo)) * (h - 8);
  const path = points.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" class="spark" preserveAspectRatio="none">
    <polyline points="${path}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
    <circle cx="${x(points.length - 1).toFixed(1)}" cy="${y(last.v).toFixed(1)}" r="3" fill="currentColor" />
  </svg>`;
}

/* Renders a TCGplayer price trend for one card into `el`, if we have
 * snapshot history for it (only the newest sets are tracked daily). */
async function renderCardHistory(game, id, el) {
  if (!el) return;
  const h = await getHistory();
  const pts = [];
  for (const snap of h.snapshots) {
    for (const sid of Object.keys(snap[game] ?? {})) {
      const v = snap[game][sid][id];
      if (v != null) { pts.push({ date: snap.date, v }); break; }
    }
  }
  if (pts.length === 0) return; // not in the daily-tracked sets
  if (pts.length === 1) {
    el.innerHTML = `<div class="note">Daily price tracking started ${esc(pts[0].date)} — the trend chart appears as snapshots accumulate.</div>`;
    return;
  }
  const first = pts[0].v, last = pts[pts.length - 1].v;
  const pct = first ? ((last - first) / first) * 100 : 0;
  el.innerHTML = `
    <div class="hist-head">
      <span>TCGplayer market trend</span>
      <span class="delta ${pct >= 0 ? "up" : "down"}">${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%</span>
    </div>
    ${sparklineSVG(pts)}
    <div class="hist-range"><span>${esc(pts[0].date)} · ${usd(first)}</span><span>${esc(pts[pts.length - 1].date)} · ${usd(last)}</span></div>`;
}

/* ---------- Modal ---------- */
function openModal(innerHTML) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-overlay">
      <div class="modal" role="dialog" aria-modal="true">
        <button class="close" aria-label="Close">&times;</button>
        ${innerHTML}
      </div>
    </div>`;
  const overlay = root.firstElementChild;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  overlay.querySelector(".close").addEventListener("click", closeModal);
  document.addEventListener("keydown", escClose);
}

function escClose(e) {
  if (e.key === "Escape") closeModal();
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
  document.removeEventListener("keydown", escClose);
}

loadNews();
