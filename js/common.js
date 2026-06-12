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

/* ============================================================
   GLOBAL SEARCH OVERLAY — Cmd+K / Ctrl+K from any page
   ============================================================ */

let _searchDebounce = null;
let _searchAbort = null;
let _searchResults = [];

function _openSearch() {
  const overlay = document.getElementById("search-overlay");
  if (!overlay) return;
  overlay.hidden = false;
  overlay.querySelector("svg.search-box-anim")?.classList.remove("search-box-anim");
  const inp = document.getElementById("global-search-input");
  inp.value = "";
  document.getElementById("search-results").innerHTML =
    '<div class="search-hint"><span>Type to search Pokémon cards</span></div>';
  _searchResults = [];
  setTimeout(() => inp.focus(), 40);
  document.addEventListener("keydown", _searchNavHandler);
}

function _closeSearch() {
  const overlay = document.getElementById("search-overlay");
  if (overlay) overlay.hidden = true;
  if (_searchAbort) { _searchAbort.abort(); _searchAbort = null; }
  clearTimeout(_searchDebounce);
  document.removeEventListener("keydown", _searchNavHandler);
}

let _focusedIdx = -1;

function _searchNavHandler(e) {
  if (e.key === "Escape") { _closeSearch(); return; }
  const items = document.querySelectorAll("#search-results .search-result");
  if (!items.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    _focusedIdx = Math.min(_focusedIdx + 1, items.length - 1);
    _updateFocus(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    _focusedIdx = Math.max(_focusedIdx - 1, 0);
    _updateFocus(items);
  } else if (e.key === "Enter" && _focusedIdx >= 0) {
    e.preventDefault();
    items[_focusedIdx]?.click();
  }
}

function _updateFocus(items) {
  items.forEach((el, i) => el.classList.toggle("focused", i === _focusedIdx));
  items[_focusedIdx]?.scrollIntoView({ block: "nearest" });
}

async function _searchCards(q) {
  const resultsEl = document.getElementById("search-results");
  _focusedIdx = -1;
  resultsEl.innerHTML = '<div class="search-loading"><div class="search-spinner"></div><span>Searching…</span></div>';

  if (_searchAbort) _searchAbort.abort();
  _searchAbort = new AbortController();

  try {
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(`name:*${q}*`)}&pageSize=10&orderBy=-set.releaseDate&select=id,name,images,set,tcgplayer,rarity,number`;
    const res = await fetch(url, { signal: _searchAbort.signal });
    if (!res.ok) throw new Error("API error");
    const { data } = await res.json();

    if (!data.length) {
      resultsEl.innerHTML = '<div class="search-hint"><span>No cards found for "' + esc(q) + '"</span></div>';
      return;
    }

    _searchResults = data.sort((a, b) => {
      const ap = Math.max(0, ...Object.values(a.tcgplayer?.prices ?? {}).map(p => p.market ?? p.mid ?? 0));
      const bp = Math.max(0, ...Object.values(b.tcgplayer?.prices ?? {}).map(p => p.market ?? p.mid ?? 0));
      return bp - ap;
    });

    resultsEl.innerHTML = _searchResults.map((card, i) => {
      const price = Math.max(0, ...Object.values(card.tcgplayer?.prices ?? {}).map(p => p.market ?? p.mid ?? 0));
      return `<div class="search-result" data-idx="${i}" tabindex="-1">
        <img src="${esc(card.images.small)}" alt="${esc(card.name)}" loading="lazy" />
        <div class="sr-info">
          <div class="sr-name">${esc(card.name)}</div>
          <div class="sr-set">${esc(card.set.name)} · #${esc(card.number)}</div>
          <div class="sr-rarity">${esc(card.rarity ?? "")}</div>
        </div>
        <div class="sr-price">${price > 0 ? usd(price) : "—"}</div>
      </div>`;
    }).join("") + `<div class="search-footer"><span>↑↓ Navigate</span><span>↵ Open</span><span>ESC Close</span></div>`;

    resultsEl.querySelectorAll(".search-result").forEach((el, i) => {
      el.addEventListener("click", () => {
        _closeSearch();
        _pkSearchModal(_searchResults[i]);
      });
    });
  } catch (err) {
    if (err.name !== "AbortError") {
      resultsEl.innerHTML = '<div class="search-hint"><span>Search unavailable — check your connection.</span></div>';
    }
  }
}

function _pkSearchModal(card) {
  const prices = card.tcgplayer?.prices ?? {};
  const best = Object.values(prices).reduce((b, p) => (p.market ?? p.mid ?? 0) > (b.market ?? b.mid ?? 0) ? p : b, {});
  openModal(`
    <div><img class="art" src="${esc(hiResImage(card.images.large ?? card.images.small))}" alt="${esc(card.name)}" /></div>
    <div>
      <h2>${esc(card.name)}</h2>
      <div class="meta">${esc(card.set.name)} · #${esc(card.number)} · ${esc(card.rarity ?? "")}</div>
      <div class="detail-grid">
        ${detailStat("Set", card.set?.name)}
        ${detailStat("Release", card.set?.releaseDate)}
        ${detailStat("Number", `#${card.number}/${card.set?.printedTotal ?? "?"}`)}
        ${detailStat("Rarity", card.rarity)}
        ${detailStat("TCGplayer", best.market ? usd(best.market) : "—")}
        ${detailStat("Low", best.low ? usd(best.low) : "—")}
        ${detailStat("High", best.high ? usd(best.high) : "—")}
        ${detailStat("Mid", best.mid ? usd(best.mid) : "—")}
      </div>
      <div class="card-history" id="search-modal-hist"></div>
      ${localMarketNote("Pokémon TCG API", card.tcgplayer?.updatedAt)}
    </div>`);
  renderCardHistory("pokemon", card.id, document.getElementById("search-modal-hist"));
}

function _injectSearchOverlay() {
  if (document.getElementById("search-overlay")) return;
  const div = document.createElement("div");
  div.id = "search-overlay";
  div.className = "search-overlay";
  div.hidden = true;
  div.setAttribute("role", "dialog");
  div.setAttribute("aria-label", "Card search");
  div.setAttribute("aria-modal", "true");
  div.innerHTML = `
    <div class="search-box">
      <div class="search-input-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="search" id="global-search-input" placeholder="Search Pokémon cards by name…" autocomplete="off" spellcheck="false" />
        <kbd class="search-esc" title="Close">ESC</kbd>
      </div>
      <div id="search-results" class="search-results">
        <div class="search-hint"><span>Type to search Pokémon cards</span></div>
      </div>
    </div>`;
  document.body.appendChild(div);

  div.addEventListener("click", (e) => { if (e.target === div) _closeSearch(); });
  div.querySelector(".search-esc").addEventListener("click", _closeSearch);
  document.getElementById("global-search-input").addEventListener("input", (e) => {
    clearTimeout(_searchDebounce);
    const q = e.target.value.trim();
    if (!q) {
      _focusedIdx = -1;
      document.getElementById("search-results").innerHTML =
        '<div class="search-hint"><span>Type to search Pokémon cards</span></div>';
      return;
    }
    if (q.length < 2) return;
    _searchDebounce = setTimeout(() => _searchCards(q), 320);
  });
}

function _injectSearchButton() {
  if (document.querySelector(".search-btn")) return;
  const header = document.querySelector(".header");
  if (!header) return;
  const btn = document.createElement("button");
  btn.className = "search-btn";
  btn.setAttribute("aria-label", "Search cards (Cmd+K)");
  btn.setAttribute("title", "Search cards");
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span class="search-btn-hint"><kbd>⌘</kbd><kbd>K</kbd></span>`;
  btn.addEventListener("click", _openSearch);
  header.appendChild(btn);
}

function _injectMobileNav() {
  if (document.querySelector(".mobile-bottom-nav")) return;
  const page = location.pathname.split("/").pop().replace(".html", "") || "index";
  const items = [
    { href: "index.html",     id: "index",    label: "Home",     icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
    { href: "analytics.html", id: "analytics",label: "Markets",  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
    { href: "pokemon.html",   id: "pokemon",  label: "Pokémon",  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="3"/></svg>` },
    { href: "onepiece.html",  id: "onepiece", label: "OP",       icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>` },
    { href: "news.html",      id: "news",     label: "News",     icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a4 4 0 0 1-4 4z"/><line x1="10" y1="7" x2="18" y2="7"/><line x1="10" y1="11" x2="18" y2="11"/><line x1="10" y1="15" x2="14" y2="15"/></svg>` },
    { href: "portfolio.html", id: "portfolio", label: "Portfolio", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>` },
    { href: "alerts.html",    id: "alerts",   label: "Alerts",   icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>` },
  ];
  const nav = document.createElement("nav");
  nav.className = "mobile-bottom-nav";
  nav.setAttribute("aria-label", "Mobile navigation");
  nav.innerHTML = items.map(it =>
    `<a href="${it.href}" class="mbn-item${it.id === page ? " active" : ""}">${it.icon}<span>${it.label}</span></a>`
  ).join("");
  document.body.appendChild(nav);
}

/* Global keyboard shortcut — Cmd+K or Ctrl+K */
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    const overlay = document.getElementById("search-overlay");
    if (overlay && !overlay.hidden) _closeSearch();
    else _openSearch();
  }
});

function _injectHeaderPills() {
  const header = document.querySelector(".header");
  if (!header || document.querySelector(".header-pills")) return;
  const hasPf = typeof pfAll === "function";
  const hasAlerts = typeof alertsUnreadCount === "function";
  if (!hasPf && !hasAlerts) return;
  const wrap = document.createElement("div");
  wrap.className = "header-pills";
  if (hasPf) {
    const holdings = pfAll();
    if (holdings.length > 0) {
      const total = typeof pfQuickTotal === "function" ? pfQuickTotal() : 0;
      const pill = document.createElement("a");
      pill.href = "portfolio.html";
      pill.className = "pf-pill";
      pill.title = "Portfolio";
      pill.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>${total > 0 ? usd(total) : `${holdings.length} card${holdings.length !== 1 ? "s" : ""}`}`;
      wrap.appendChild(pill);
    }
  }
  if (hasAlerts) {
    const unread = alertsUnreadCount();
    const bell = document.createElement("a");
    bell.href = "alerts.html";
    bell.className = "alerts-bell";
    bell.title = "Alerts";
    bell.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>${unread > 0 ? `<span class="bell-badge">${unread > 9 ? "9+" : unread}</span>` : ""}`;
    wrap.appendChild(bell);
  }
  if (wrap.children.length) {
    const searchBtn = header.querySelector(".search-btn");
    if (searchBtn) header.insertBefore(wrap, searchBtn);
    else header.appendChild(wrap);
  }
}

_injectSearchOverlay();
_injectSearchButton();
_injectMobileNav();
_injectHeaderPills();
