/* Portfolio page — renders headline stats, chart, allocation, holdings table. */

async function pfFetchPokemonPrices(ids) {
  if (!ids.length) return new Map();
  const results = new Map();
  const chunks = [];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
  for (const chunk of chunks) {
    try {
      const q = chunk.map(id => `id:${id}`).join(" OR ");
      const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=250&select=id,name,images,set,tcgplayer,cardmarket,rarity`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const { data } = await res.json();
      for (const card of data) {
        const prices = card.tcgplayer?.prices ?? {};
        const market = Math.max(0, ...Object.values(prices).map(p => p.market ?? 0).filter(v => v > 0));
        const cm = card.cardmarket?.prices;
        const d7 = (cm?.avg1 && cm?.avg7 && cm.avg7 > 0) ? (cm.avg1 - cm.avg7) / cm.avg7 * 100 : null;
        results.set(card.id, { market: market || null, d7, card });
      }
    } catch { /* keep going */ }
  }
  return results;
}

async function pfFetchHistory() {
  try {
    const res = await fetch("data/price-history.json", { cache: "no-cache" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/* ---------- Headline tiles ---------- */
function renderHeadline(holdings, prices) {
  let totalValue = 0, totalCost = 0, todayDelta = 0;
  for (const h of holdings) {
    const info = prices.get(h.id);
    const market = info?.market ?? h.lastPrice ?? h.cost;
    const value = market * h.qty;
    totalValue += value;
    totalCost += h.cost * h.qty;
    if (info?.d7 != null) todayDelta += value * (info.d7 / 100 / 7);
  }
  const pl = totalValue - totalCost;
  const plPct = totalCost > 0 ? (pl / totalCost * 100) : 0;

  const tval = document.getElementById("pf-total-value");
  if (tval) {
    tval.textContent = usd(totalValue);
    const plEl = document.getElementById("pf-pl");
    if (plEl) {
      plEl.textContent = (pl >= 0 ? "+" : "") + usd(pl);
      plEl.className = "pf-tile-sub " + (pl >= 0 ? "up" : "down");
    }
    const plPctEl = document.getElementById("pf-pl-pct");
    if (plPctEl) plPctEl.textContent = `${plPct >= 0 ? "+" : ""}${plPct.toFixed(2)}% all-time`;
  }

  const todayValEl = document.getElementById("pf-today-val");
  if (todayValEl) todayValEl.textContent = (todayDelta >= 0 ? "+" : "") + usd(todayDelta);
  const todayEl = document.getElementById("pf-today");
  if (todayEl) {
    const pct = totalValue > 0 ? (todayDelta / totalValue * 100) : 0;
    todayEl.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% est. (7d avg ÷ 7)`;
    todayEl.className = "pf-tile-sub " + (todayDelta >= 0 ? "up" : "down");
  }

  const countEl = document.getElementById("pf-cards-count");
  if (countEl) countEl.textContent = holdings.reduce((s, h) => s + h.qty, 0).toString();
  const posEl = document.getElementById("pf-positions-count");
  if (posEl) posEl.textContent = `${holdings.length} position${holdings.length !== 1 ? "s" : ""}`;
}

/* ---------- Allocation bars ---------- */
function renderAllocation(holdings, prices) {
  const rarityTotals = {};
  let pkTotal = 0, opTotal = 0;
  for (const h of holdings) {
    const market = prices.get(h.id)?.market ?? h.lastPrice ?? h.cost;
    const value = market * h.qty;
    const rarity = h.rarity ?? "Unknown";
    rarityTotals[rarity] = (rarityTotals[rarity] ?? 0) + value;
    if ((h.game ?? "pokemon") === "onepiece") opTotal += value;
    else pkTotal += value;
  }
  const totalVal = pkTotal + opTotal;
  const rarityColors = {
    "Special Illustration Rare": "#c084fc",
    "Illustration Rare": "#f97316",
    "Hyper Rare": "#f59e0b",
    "Ultra Rare": "#3b82f6",
    "Secret Rare": "#ec4899",
    "Double Rare": "#14b8a6",
    "Rare Holo VMAX": "#8b5cf6",
    "Rare Holo V": "#6366f1",
    "Rare Holo": "#0ea5e9",
    "Rare": "#22d3ee",
  };
  const sorted = Object.entries(rarityTotals).sort((a, b) => b[1] - a[1]);

  const allocEl = document.getElementById("alloc-by-rarity");
  if (allocEl) {
    allocEl.innerHTML = sorted.length ? `
      <div class="alloc-list">
        ${sorted.map(([rarity, val], i) => {
          const pct = totalVal > 0 ? val / totalVal * 100 : 0;
          const hue = 200 + (i * 53) % 160;
          const color = rarityColors[rarity] ?? `hsl(${hue},55%,58%)`;
          return `<div class="alloc-row">
            <span class="alloc-label" title="${esc(rarity)}">${esc(rarity)}</span>
            <div class="alloc-bar-wrap">
              <div class="alloc-bar" style="width:${pct.toFixed(1)}%;background:${color}"></div>
            </div>
            <span class="alloc-pct">${pct.toFixed(0)}%</span>
            <span class="alloc-val">${usd(val)}</span>
          </div>`;
        }).join("")}
      </div>` : `<p class="note">No holdings yet.</p>`;
  }

  const splitEl = document.getElementById("game-split");
  if (splitEl) {
    const pkPct = totalVal > 0 ? pkTotal / totalVal * 100 : 50;
    const opPct = 100 - pkPct;
    splitEl.innerHTML = `
      <div class="game-split-bar">
        <div class="game-split-pk" style="width:${pkPct.toFixed(1)}%"></div>
        <div class="game-split-op" style="width:${opPct.toFixed(1)}%"></div>
      </div>
      <div class="game-split-legend">
        <span class="gsl-item"><span class="gsl-dot" style="background:var(--accent-2)"></span>Pokémon ${usd(pkTotal)} (${pkPct.toFixed(1)}%)</span>
        <span class="gsl-item"><span class="gsl-dot" style="background:var(--accent)"></span>One Piece ${usd(opTotal)} (${opPct.toFixed(1)}%)</span>
      </div>`;
  }
}

/* ---------- Holdings table ---------- */
function renderTable(holdings, prices) {
  const tbody = document.getElementById("holdings-tbody");
  if (!tbody) return;
  if (!holdings.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="pf-empty">
      <h3>No cards yet</h3>
      <p>Open any <a href="pokemon.html">Pokémon</a> or <a href="onepiece.html">One Piece</a> card and click <b>＋ Collection</b> to start tracking.</p>
    </div></td></tr>`;
    return;
  }
  tbody.innerHTML = holdings.map(h => {
    const market = prices.get(h.id)?.market ?? h.lastPrice ?? null;
    const value = market != null ? market * h.qty : null;
    const costTotal = h.cost * h.qty;
    const pl = value != null ? value - costTotal : null;
    const plPct = pl != null && costTotal > 0 ? pl / costTotal * 100 : null;
    const plCls = pl != null ? (pl >= 0 ? "up" : "down") : "";
    return `<tr data-id="${esc(h.id)}">
      <td>
        <div class="ht-card">
          ${h.image ? `<img src="${esc(h.image)}" alt="" loading="lazy" />` : ""}
          <div>
            <div class="ht-name">${esc(h.name ?? h.id)}</div>
            <div class="ht-meta">${esc(h.set ?? "")}${h.rarity ? " · " + esc(h.rarity) : ""}</div>
          </div>
        </div>
      </td>
      <td>${h.qty}</td>
      <td>${usd(h.cost)}</td>
      <td>${market != null ? usd(market) : "—"}</td>
      <td>${value != null ? usd(value) : "—"}</td>
      <td class="${plCls}">${pl != null ? (pl >= 0 ? "+" : "") + usd(pl) : "—"}${plPct != null ? `<br><small style="font-weight:400;opacity:.8">${plPct >= 0 ? "+" : ""}${plPct.toFixed(1)}%</small>` : ""}</td>
      <td><button class="ht-remove" data-id="${esc(h.id)}" title="Remove from portfolio">✕</button></td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("tr[data-id]").forEach(row => {
    row.querySelector(".ht-card")?.addEventListener("click", () => {
      const h = holdings.find(x => x.id === row.dataset.id);
      if (!h) return;
      const info = prices.get(h.id);
      pfOpenCardPanel(h, info);
    });
    row.querySelector(".ht-remove")?.addEventListener("click", e => {
      e.stopPropagation();
      if (confirm(`Remove ${pfAll().find(x => x.id === e.currentTarget.dataset.id)?.name ?? "this card"} from portfolio?`)) {
        removeHolding(e.currentTarget.dataset.id);
      }
    });
  });
}

/* Simple modal for portfolio card details. */
function pfOpenCardPanel(h, info) {
  const market = info?.market ?? h.lastPrice ?? null;
  const value = market != null ? market * h.qty : null;
  const costTotal = h.cost * h.qty;
  const pl = value != null ? value - costTotal : null;
  const plPct = pl != null && costTotal > 0 ? pl / costTotal * 100 : null;
  const plCls = pl != null ? (pl >= 0 ? "up" : "down") : "";
  openModal(`
    <div class="modal-card-col">
      ${h.image ? `<img class="art" src="${esc(h.image)}" alt="${esc(h.name ?? "")}" />` : ""}
      ${market != null ? `
        <div class="modal-price-hero">
          <span class="mph-label">Market Price</span>
          <span class="mph-value">${usd(market)}</span>
          ${info?.d7 != null ? `<span class="mph-delta ${info.d7 >= 0 ? "up" : "down"}">${info.d7 >= 0 ? "▲" : "▼"} ${Math.abs(info.d7).toFixed(1)}% (7d)</span>` : ""}
        </div>` : ""}
    </div>
    <div>
      <div class="modal-title-row">
        <h2>${esc(h.name ?? h.id)}</h2>
      </div>
      <div class="meta">${esc(h.set ?? "")}${h.rarity ? " · " + esc(h.rarity) : ""}</div>
      <div class="detail-grid" style="margin-top:1rem">
        ${detailStat("Qty owned", `${h.qty} card${h.qty !== 1 ? "s" : ""}`)}
        ${detailStat("Paid / card", usd(h.cost))}
        ${detailStat("Total cost", usd(costTotal))}
        ${detailStat("Market / card", market != null ? usd(market) : "—")}
        ${detailStat("Total value", value != null ? usd(value) : "—")}
        <div class="detail-stat"><span>P&amp;L</span><b class="${plCls}">${pl != null ? (pl >= 0 ? "+" : "") + usd(pl) : "—"}</b></div>
        <div class="detail-stat"><span>Return</span><b class="${plCls}">${plPct != null ? (plPct >= 0 ? "+" : "") + plPct.toFixed(1) + "%" : "—"}</b></div>
        ${detailStat("Added", h.updated ?? "—")}
      </div>
      <div class="buy-row" style="margin-top:1.25rem">
        <button class="btn btn-ghost" id="pf-modal-remove">Remove from portfolio</button>
      </div>
    </div>
  `);
  document.getElementById("pf-modal-remove")?.addEventListener("click", () => {
    if (confirm(`Remove ${h.name ?? h.id} from portfolio?`)) {
      removeHolding(h.id);
      closeModal();
    }
  });
}

/* ---------- Value chart ---------- */
let _pfChart = null;

function renderChart(holdings, history, range) {
  const wrap = document.getElementById("pf-chart-wrap");
  if (!wrap) return;
  if (!history?.snapshots?.length || !holdings.length) {
    wrap.innerHTML = '<p class="note" style="margin:1rem 0">Not enough history data yet — check back after a few daily snapshots.</p>';
    return;
  }
  const days = { "7": 7, "14": 14, "28": 28 }[range] ?? 14;
  const snaps = history.snapshots.slice(-days);

  const points = snaps.map(snap => {
    let total = 0;
    for (const h of holdings) {
      let price = null;
      const bucket = (h.game ?? "pokemon") === "onepiece" ? (snap.onepiece ?? {}) : (snap.pokemon ?? {});
      for (const sid of Object.keys(bucket)) {
        const v = bucket[sid]?.[h.id];
        if (v != null) { price = v; break; }
      }
      total += (price ?? h.lastPrice ?? h.cost) * h.qty;
    }
    return { date: snap.date, v: total };
  }).filter(p => p.v > 0);

  if (points.length < 2) {
    wrap.innerHTML = '<p class="note" style="margin:1rem 0">Not enough price history yet.</p>';
    return;
  }

  const first = points[0].v, last = points[points.length - 1].v;
  const pct = first > 0 ? (last - first) / first * 100 : 0;
  const up = pct >= 0;
  const color = up ? "#3ddc84" : "#ff5d5d";

  wrap.innerHTML = `
    <div class="hist-head">
      <span>Portfolio value — last ${days} days</span>
      <span class="delta ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%</span>
    </div>
    <div style="position:relative;height:200px"><canvas id="pf-chart-canvas"></canvas></div>
    <div class="hist-range">
      <span>${esc(points[0].date)} · ${usd(first)}</span>
      <span>${esc(points[points.length - 1].date)} · ${usd(last)}</span>
    </div>`;

  if (_pfChart) { _pfChart.destroy(); _pfChart = null; }
  _pfChart = new Chart(document.getElementById("pf-chart-canvas"), {
    type: "line",
    data: {
      labels: points.map(p => p.date),
      datasets: [{
        data: points.map(p => p.v),
        borderColor: color,
        backgroundColor: ctx => {
          const { chart } = ctx;
          if (!chart.chartArea) return "transparent";
          const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
          const [r, gr, b] = [1, 3, 5].map(o => parseInt(color.slice(o, o + 2), 16));
          g.addColorStop(0, `rgba(${r},${gr},${b},0.28)`);
          g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
          return g;
        },
        fill: true, tension: 0.3, pointRadius: 2, pointHoverRadius: 6, pointBackgroundColor: color,
      }],
    },
    options: {
      animation: { duration: 700, easing: "easeOutQuart" },
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${usd(c.raw)}` } } },
      scales: {
        y: { ticks: { callback: v => usd(v), font: { size: 10 } }, grid: { color: "rgba(151,160,200,0.08)" } },
        x: { ticks: { font: { size: 10 }, maxTicksLimit: 6 }, grid: { display: false } },
      },
      interaction: { mode: "index", intersect: false },
    },
  });
}

/* ---------- Boot ---------- */
let _pfHistory = null;
let _pfRange = "14";
let _pfPrices = new Map();

async function pfInit() {
  const holdings = pfAll();
  if (!holdings.length) {
    const hl = document.getElementById("pf-headline");
    if (hl) hl.innerHTML = `<div class="pf-empty" style="grid-column:1/-1;padding:2rem 1rem">
      <h3>Your collection is empty</h3>
      <p>Browse <a href="pokemon.html">Pokémon cards</a> or <a href="onepiece.html">One Piece cards</a>, open any card, and click <b>＋ Collection</b> to start tracking.</p>
    </div>`;
    const tbody = document.getElementById("holdings-tbody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="7"><div class="pf-empty">
      <h3>No cards yet</h3><p>Open any card and click <b>＋ Collection</b> to track it here.</p>
    </div></td></tr>`;
    ["pf-chart-wrap", "alloc-by-rarity", "game-split"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
    return;
  }

  const pokemonIds = holdings.filter(h => (h.game ?? "pokemon") !== "onepiece").map(h => h.id);
  _pfPrices = await pfFetchPokemonPrices(pokemonIds);

  for (const [id, info] of _pfPrices) {
    if (info.market) pfUpdatePrice(id, info.market);
  }

  /* Evaluate alerts against fresh prices */
  if (typeof evaluateAlerts === "function") {
    const priceMap = new Map();
    for (const [id, info] of _pfPrices) {
      if (info.market != null) priceMap.set(id, { market: info.market, pct7d: info.d7 });
    }
    evaluateAlerts(priceMap);
  }

  renderHeadline(holdings, _pfPrices);
  renderChart(holdings, _pfHistory, _pfRange);
  renderAllocation(holdings, _pfPrices);
  renderTable(holdings, _pfPrices);
}

(async () => {
  _pfHistory = await pfFetchHistory();
  await pfInit();

  document.addEventListener("portfolio-changed", debounce(pfInit, 200));

  document.querySelectorAll(".pf-range-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      _pfRange = btn.dataset.range;
      document.querySelectorAll(".pf-range-btn").forEach(b => b.classList.toggle("active", b === btn));
      renderChart(pfAll(), _pfHistory, _pfRange);
    });
  });
})();
