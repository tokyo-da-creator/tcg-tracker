/* Alerts settings page — configure Telegram alerts, preview the config that
 * the data job consumes (config/alerts.json), and send a test message. */

const SETTINGS_KEY = "pokesnipr-alert-settings";

const el = (id) => document.getElementById(id);

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/* Build the config/alerts.json shape from the current form state. */
function buildConfig() {
  const triggers = [...document.querySelectorAll(".watch-trigger")].map((row) => {
    const above = parseFloat(row.querySelector(".wt-above").value);
    const below = parseFloat(row.querySelector(".wt-below").value);
    const out = { id: row.dataset.id, name: row.dataset.name, game: row.dataset.game };
    if (!isNaN(above)) out.above = above;
    if (!isNaN(below)) out.below = below;
    return out;
  }).filter((t) => t.above != null || t.below != null);

  return {
    restock: { enabled: el("opt-restock")?.checked !== false },
    movers: { enabled: el("opt-movers")?.checked ?? true, minPct: clampNum(el("movers-pct")?.value, 1, 90, 15) },
    sealed: { enabled: el("opt-sealed")?.checked ?? true, minPct: clampNum(el("sealed-pct")?.value, 1, 90, 10) },
    news: { enabled: el("opt-news")?.checked ?? true },
    watchlist: { enabled: el("opt-watch")?.checked ?? true, cards: triggers },
  };
}

function clampNum(v, lo, hi, dflt) {
  const n = parseFloat(v);
  if (isNaN(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
}

function refresh() {
  const cfg = buildConfig();
  el("config-out").textContent = JSON.stringify(cfg, null, 2);
  saveSettings(cfg);
}

function renderWatchTriggers() {
  const box = el("watch-triggers");
  const list = typeof wlAll === "function" ? wlAll() : [];
  const saved = loadSettings().watchlist?.cards ?? [];
  const savedById = Object.fromEntries(saved.map((c) => [c.id, c]));

  if (!list.length) {
    box.innerHTML = `<p class="note">No watchlisted cards yet. Star cards on the
      <a href="pokemon.html">Pokémon</a> or <a href="onepiece.html">One Piece</a> pages,
      then come back to set price triggers.</p>`;
    return;
  }
  box.innerHTML = list.map((w) => {
    const s = savedById[w.id] ?? {};
    return `
    <div class="watch-trigger" data-id="${esc(w.id)}" data-name="${esc(w.name)}" data-game="${esc(w.game)}">
      <img loading="lazy" src="${esc(w.image)}" alt="" />
      <span class="wt-name">${esc(w.name)}<small>${esc(w.sub ?? "")}</small></span>
      <label>Above <input class="wt-above inline-num" type="number" min="0" step="0.5" placeholder="$" value="${s.above ?? ""}" /></label>
      <label>Below <input class="wt-below inline-num" type="number" min="0" step="0.5" placeholder="$" value="${s.below ?? ""}" /></label>
    </div>`;
  }).join("");
  box.querySelectorAll("input").forEach((i) => i.addEventListener("input", refresh));
}

/* Restore saved form state. */
function applySaved() {
  const s = loadSettings();
  if (s.movers) { el("opt-movers").checked = s.movers.enabled !== false; el("movers-pct").value = s.movers.minPct ?? 15; }
  if (s.sealed) { el("opt-sealed").checked = s.sealed.enabled !== false; el("sealed-pct").value = s.sealed.minPct ?? 10; }
  if (s.news) { el("opt-news").checked = s.news.enabled !== false; }
  if (s.restock && el("opt-restock")) { el("opt-restock").checked = s.restock.enabled !== false; }
  if (s.watchlist) { el("opt-watch").checked = s.watchlist.enabled !== false; }
}

/* Telegram test message — uses the token/chat the user types, client-side only. */
async function sendTest() {
  const token = el("tg-token").value.trim();
  const chat = el("tg-chat").value.trim();
  const result = el("tg-result");
  if (!token || !chat) {
    result.textContent = "Enter both the bot token and chat ID first.";
    return;
  }
  result.textContent = "Sending…";
  try {
    const safeToken = token.replace(/[^A-Za-z0-9:_-]/g, "");
    const res = await fetch(`https://api.telegram.org/bot${safeToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: "✅ PokeSnipr is connected. You'll get price, market, and news alerts here.",
      }),
    });
    const data = await res.json();
    if (data.ok) {
      result.textContent = "✅ Test message sent — check Telegram!";
      el("tg-status").textContent = "Connected";
      el("tg-status").style.color = "var(--up)";
      sessionStorage.setItem("pokesnipr-tg-ok", "1");
    } else {
      result.textContent = `Telegram error: ${data.description ?? "unknown"}. Double-check the token and chat ID.`;
    }
  } catch (e) {
    result.textContent = "Couldn't reach Telegram from the browser. The token/chat may still work server-side once added as GitHub secrets.";
    console.error(e);
  }
}

el("tg-test").addEventListener("click", sendTest);
["opt-restock", "opt-movers", "opt-sealed", "opt-news", "opt-watch", "movers-pct", "sealed-pct"]
  .forEach((id) => el(id)?.addEventListener("input", refresh));

el("copy-config").addEventListener("click", async () => {
  await navigator.clipboard.writeText(el("config-out").textContent);
  el("copy-config").textContent = "Copied!";
  setTimeout(() => (el("copy-config").textContent = "Copy config"), 1500);
});

el("download-config").addEventListener("click", () => {
  const blob = new Blob([el("config-out").textContent], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "alerts.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ── Client-side alert inbox ── */
function renderInbox() {
  const inboxEl = document.getElementById("alerts-inbox");
  if (!inboxEl || typeof alertsAll !== "function") return;

  const all = alertsAll();
  const triggered = all.filter(a => a.status === "triggered");
  const active = all.filter(a => a.status === "active");
  const dismissed = all.filter(a => a.status === "dismissed").length;

  /* Summary tiles */
  const summaryEl = document.getElementById("ai-summary");
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="ai-tile"><div class="ai-num ${triggered.length ? "red" : ""}">${triggered.length}</div><div class="ai-label">Triggered</div></div>
      <div class="ai-tile"><div class="ai-num gold">${active.length}</div><div class="ai-label">Watching</div></div>
      <div class="ai-tile"><div class="ai-num">${dismissed}</div><div class="ai-label">Dismissed</div></div>
      <div class="ai-tile"><div class="ai-num">${all.length}</div><div class="ai-label">Total alerts</div></div>`;
  }

  /* Triggered feed */
  const feedEl = document.getElementById("triggered-feed");
  if (feedEl) {
    if (!triggered.length) {
      feedEl.innerHTML = `<p class="note">No triggered alerts yet. Active watches fire here when prices cross your targets.</p>`;
    } else {
      feedEl.innerHTML = triggered.map(a => {
        const kindCls = a.kind === "price-above" ? "target" : a.kind === "pct-move" ? "pct" : "drop";
        const kindTag = a.kind === "price-above" ? "Price Target ↑" : a.kind === "pct-move" ? "% Move" : "Price Drop ↓";
        const msg = typeof alertText === "function" ? alertText(a) : (a.cardName ?? a.cardId);
        const when = a.when ? new Date(a.when).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
        return `<div class="tf-item ${kindCls}" data-id="${esc(a.id)}">
          ${a.cardImage ? `<img src="${esc(a.cardImage)}" alt="" loading="lazy" />` : ""}
          <div class="tf-body">
            <span class="tf-tag ${kindCls}">${kindTag}</span>
            <div class="tf-msg">${esc(msg)}</div>
            ${a.price != null ? `<div class="tf-when">Triggered at ${usd(a.price)}${when ? " · " + when : ""}</div>` : (when ? `<div class="tf-when">${when}</div>` : "")}
          </div>
          <button class="tf-dismiss" data-id="${esc(a.id)}" title="Dismiss">✕</button>
        </div>`;
      }).join("");
      feedEl.querySelectorAll(".tf-dismiss").forEach(btn => {
        btn.addEventListener("click", () => {
          if (typeof dismissAlert === "function") dismissAlert(btn.dataset.id);
          btn.closest(".tf-item")?.remove();
          renderInbox();
        });
      });
    }
  }

  /* Active watches */
  const watchesEl = document.getElementById("active-watches");
  if (watchesEl) {
    if (!active.length) {
      watchesEl.innerHTML = `<p class="note">No active alerts. Open a Pokémon card and click <b>🔔 Set Alert</b> to add one.</p>`;
    } else {
      watchesEl.innerHTML = active.map(a => {
        const kindLabel = { "price-below": "Below", "price-above": "Above", "pct-move": "% Move" }[a.kind] ?? a.kind;
        const targetLabel = a.kind === "pct-move" ? `${a.target}%` : `$${a.target.toFixed(2)}`;
        const color = a.kind === "price-above" ? "var(--up)" : a.kind === "pct-move" ? "var(--accent-2)" : "var(--down)";
        return `<div class="aw-item">
          <div class="aw-head">
            ${a.cardImage ? `<img src="${esc(a.cardImage)}" alt="" loading="lazy" />` : ""}
            <span class="aw-name">${esc(a.cardName ?? a.cardId)}</span>
            <span class="aw-kind">${kindLabel} ${targetLabel}</span>
            <button class="aw-remove" data-id="${esc(a.id)}" title="Remove alert">✕</button>
          </div>
          <div class="aw-progress-wrap">
            <div class="aw-progress-bar" style="width:50%;background:${color}"></div>
          </div>
          <div class="aw-progress-label"><span>Added ${esc(a.created ?? "")}</span><span>Target: ${targetLabel}</span></div>
        </div>`;
      }).join("");
      watchesEl.querySelectorAll(".aw-remove").forEach(btn => {
        btn.addEventListener("click", () => {
          if (typeof removeAlert === "function") removeAlert(btn.dataset.id);
          renderInbox();
        });
      });
    }
  }
}

/* Mark alerts as read when visiting the page */
if (typeof alertsMarkRead === "function") alertsMarkRead();

document.addEventListener("alerts-changed", renderInbox);
renderInbox();

applySaved();
renderWatchTriggers();
refresh();
