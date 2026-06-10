/* News hub — full headline grid from data/news.json with source filters. */

let newsItems = [];
let activeSource = "";

function timeAgo(pubDate) {
  const d = new Date(pubDate);
  if (isNaN(d)) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  if (mins < 10080) return `${Math.floor(mins / 1440)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function renderNews() {
  const grid = document.getElementById("news-grid");
  const items = newsItems.filter((it) => !activeSource || it.source === activeSource);
  document.getElementById("status").textContent = items.length ? "" : "No headlines for this source right now.";
  grid.innerHTML = items.map((it) => `
    <a class="news-card" href="${esc(it.link)}" target="_blank" rel="noopener">
      <div class="news-meta">
        <span class="ticker-source src-${esc(it.source)}">${esc(it.sourceLabel)}</span>
        <span class="news-time">${esc(timeAgo(it.pubDate))}</span>
      </div>
      <h3>${esc(it.title.replace(/\s+-\s+[^-]+$/, ""))}</h3>
    </a>`).join("");
}

(async () => {
  try {
    const res = await fetch("data/news.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`news.json → ${res.status}`);
    const data = await res.json();
    newsItems = data.items ?? [];
    document.getElementById("updated").textContent =
      `Refreshed ${data.updated.replace("T", " ").slice(0, 16)} UTC · auto-updates every 6 hours.`;
    renderNews();
  } catch (err) {
    // local fallback: live fetch through the proxy used by the ticker
    newsItems = (await fetchNewsLive()) ?? [];
    document.getElementById("updated").textContent = newsItems.length
      ? "Live feed (cached headlines unavailable)."
      : "News temporarily unavailable — please refresh.";
    renderNews();
    console.error(err);
  }
})();

document.getElementById("news-filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  activeSource = btn.dataset.source;
  document.querySelectorAll("#news-filters .chip").forEach((c) =>
    c.classList.toggle("active", c === btn));
  renderNews();
});
