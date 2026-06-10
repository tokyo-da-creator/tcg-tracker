/* Shared helpers: news ticker, formatting, modal. */

const TCGP_SEARCH = {
  pokemon: (q) =>
    `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(q)}&view=grid`,
  onepiece: (q) =>
    `https://www.tcgplayer.com/search/one-piece-card-game/product?q=${encodeURIComponent(q)}&view=grid`,
};

function usd(n) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function eur(n) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "EUR" });
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
