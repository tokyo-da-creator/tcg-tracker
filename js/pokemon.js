/* Pokémon browser — data: api.pokemontcg.io v2 (TCGplayer prices + Cardmarket averages). */

const PK_API = "https://api.pokemontcg.io/v2";
const SEARCH_PAGE_SIZE = 24;
const SET_PAGE_SIZE = 250;

const setSelect      = document.getElementById("set-select");
const searchEl       = document.getElementById("search");
const sortSelect     = document.getElementById("sort-select");
const grid           = document.getElementById("grid");
const statusEl       = document.getElementById("status");
const updatedEl      = document.getElementById("price-updated");
const loadMoreBtn    = document.getElementById("load-more");
const cardTableWrap  = document.getElementById("card-table-wrap");
const cardTableBody  = document.getElementById("card-table-body");
const btnGrid        = document.getElementById("btn-grid");
const btnTable       = document.getElementById("btn-table");

let mode = "set";
let page = 1;
let totalCount = 0;
let cards = [];
let setValueChart = null;
let viewMode = "grid";

async function pkFetch(path) {
  const res = await fetch(`${PK_API}${path}`);
  if (!res.ok) throw new Error(`Pokémon TCG API error ${res.status}`);
  return res.json();
}

/* Best available TCGplayer price block.
 * Picks the variant with the highest ANY price (market → mid → low → high).
 * Using only market to pick the variant misses expensive holofoil variants
 * whose market field is null but have real low/mid prices. */
function bestPrice(card) {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;
  const variants = Object.entries(prices);
  if (!variants.length) return null;
  variants.sort((a, b) => {
    const va = a[1].market ?? a[1].mid ?? a[1].low ?? a[1].high ?? 0;
    const vb = b[1].market ?? b[1].mid ?? b[1].low ?? b[1].high ?? 0;
    return vb - va;
  });
  const [variant, p] = variants[0];
  return { variant, ...p };
}

/* Best sortable price — falls back through all price fields. Returns -1 if none. */
function sortPrice(card) {
  const p = bestPrice(card);
  if (!p) return -1;
  return p.market ?? p.mid ?? p.low ?? p.high ?? -1;
}

/* Rarity tier — used as a price proxy when TCGplayer data is missing for a card.
 * Ensures "Price: High → Low" shows Secret/Ultra Rares before Commons even without prices. */
const RARITY_TIER_MAP = [
  ["hyper rare", 9], ["secret rare", 9],
  ["special illustration rare", 8],
  ["ultra rare", 7], ["shiny ultra rare", 7],
  ["illustration rare", 6], ["shiny rare", 6],
  ["double rare", 5], ["ace spec rare", 5], ["trainer gallery rare holo", 5],
  ["holo rare", 4], ["rare holo", 4], ["rare", 3],
  ["uncommon", 2], ["common", 1],
];

function rarityTier(card) {
  const r = (card.rarity ?? "").toLowerCase();
  for (const [key, val] of RARITY_TIER_MAP) {
    if (r.includes(key)) return val;
  }
  return 0;
}

/* ---------- Analytics fetch (cached) ---------- */
async function getAnalytics() {
  if (Object.prototype.hasOwnProperty.call(getAnalytics, "_cache")) return getAnalytics._cache;
  try {
    const r = await fetch("data/analytics.json");
    getAnalytics._cache = await r.json();
  } catch {
    getAnalytics._cache = null;
  }
  return getAnalytics._cache;
}

/* Cardmarket 7-day delta. Returns null if unavailable. */
function cmDelta7d(card) {
  const cm = card.cardmarket?.prices;
  if (!cm?.avg1 || !cm?.avg7 || cm.avg7 === 0) return null;
  return (cm.avg1 - cm.avg7) / cm.avg7 * 100;
}

/* ---------- Skeleton loading ---------- */
function showSkeleton(n = 18) {
  grid.innerHTML = Array.from({ length: n }, () => `
    <li class="tcard sk">
      <div class="sk-img"></div>
      <div class="sk-line sk-w80"></div>
      <div class="sk-line sk-w50"></div>
      <div class="sk-pricebar">
        <div class="sk-pill sk-w40"></div>
        <div class="sk-pill sk-w30"></div>
      </div>
    </li>`).join("");
}

/* ---------- Card tile ---------- */
function cardLi(card) {
  const p = bestPrice(card);
  const displayPrice = p ? (p.market ?? p.mid ?? p.low ?? p.high) : null;
  const li = document.createElement("li");
  li.className = `tcard ${rarityClass(card.rarity)}`.trim();
  const d7 = cmDelta7d(card);
  const deltaSpan = d7 != null && Math.abs(d7) >= 6
    ? `<span class="card-delta ${d7 >= 0 ? "up" : "down"}">${d7 >= 0 ? "▲" : "▼"} ${Math.abs(d7).toFixed(0)}%</span>`
    : "";
  li.innerHTML = `
    <img loading="lazy" decoding="async" src="${esc(hiResImage(card.images.large || card.images.small))}" alt="${esc(card.name)}" />
    <div class="name">${esc(card.name)}</div>
    <div class="meta">${esc(card.set.name)} · #${esc(card.number)}/${esc(card.set.printedTotal)}</div>
    <div class="pricebar">
      <span class="price">${displayPrice != null ? usd(displayPrice) : "—"}</span>
      <span class="rarity-group">${deltaSpan}<span class="rarity">${esc(card.rarity ?? "—")}</span></span>
    </div>`;
  li.appendChild(wlStarButton({
    game: "pokemon",
    id: card.id,
    name: card.name,
    image: card.images.small,
    sub: `${card.set.name} · #${card.number}`,
    detail: `pokemon:${card.id}`,
    price: displayPrice,
  }));
  li.addEventListener("click", () => openCard(card));
  return li;
}

/* ---------- Shared sort logic ---------- */
function getSortedCards() {
  const sorted = [...cards];
  const sort = sortSelect.value;
  if (sort === "price-desc" || sort === "price-asc") {
    sorted.sort((a, b) => {
      const pa = sortPrice(a), pb = sortPrice(b);
      const ha = pa >= 0, hb = pb >= 0;
      if (ha && hb) return sort === "price-desc" ? pb - pa : pa - pb;
      if (!ha && !hb) {
        const ra = rarityTier(a), rb = rarityTier(b);
        return sort === "price-desc" ? rb - ra : ra - rb;
      }
      return ha ? -1 : 1;
    });
  } else if (sort === "number") {
    sorted.sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));
  } else if (sort === "name") {
    sorted.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }
  return sorted;
}

/* ---------- Table view render ---------- */
function renderTable(sorted) {
  const dBadge = v => v == null
    ? `<span class="muted">—</span>`
    : `<span class="delta-mini ${v >= 0 ? "up" : "down"}">${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(1)}%</span>`;

  cardTableBody.innerHTML = sorted.map(card => {
    const p = bestPrice(card);
    const displayPrice = p ? (p.market ?? p.mid ?? p.low ?? p.high) : null;
    const cm = card.cardmarket?.prices;
    const d7  = (cm?.avg1 && cm?.avg7  && cm.avg7  > 0) ? ((cm.avg1 - cm.avg7)  / cm.avg7  * 100) : null;
    const d30 = (cm?.avg1 && cm?.avg30 && cm.avg30 > 0) ? ((cm.avg1 - cm.avg30) / cm.avg30 * 100) : null;
    return `<tr class="ct-row" data-id="${esc(card.id)}">
      <td class="ct-img"><img loading="lazy" src="${esc(card.images.small)}" alt="" /></td>
      <td class="ct-name">${esc(card.name)}</td>
      <td class="ct-num">#${esc(card.number)}</td>
      <td><span class="rarity">${esc(card.rarity ?? "—")}</span></td>
      <td class="ct-price">${displayPrice != null ? `<b>${usd(displayPrice)}</b>` : `<span class="muted">—</span>`}</td>
      <td>${cm?.avg7 ? eurUsd(cm.avg7) : `<span class="muted">—</span>`}</td>
      <td>${dBadge(d7)}</td>
      <td>${dBadge(d30)}</td>
    </tr>`;
  }).join("");

  cardTableBody.querySelectorAll(".ct-row").forEach((row, i) =>
    row.addEventListener("click", () => openCard(sorted[i])));
}

/* ---------- Grid render ---------- */
function render() {
  const sorted = getSortedCards();

  if (viewMode === "table") {
    grid.hidden = true;
    cardTableWrap.hidden = false;
    renderTable(sorted);
  } else {
    grid.hidden = false;
    cardTableWrap.hidden = true;
    grid.innerHTML = "";
    sorted.forEach((c, i) => {
      const li = cardLi(c);
      li.style.animationDelay = `${Math.min(i, 40) * 25}ms`;
      li.classList.add("card-enter");
      grid.appendChild(li);
    });
  }

  loadMoreBtn.hidden = mode === "set" || cards.length >= totalCount;

  const updated = cards.find((c) => c.tcgplayer?.updatedAt)?.tcgplayer?.updatedAt;
  updatedEl.textContent = updated
    ? `TCGplayer prices updated ${updated} · ${totalCount} cards`
    : "";

  if (mode === "set" && cards.length > 0) {
    renderSetStats(cards);
    renderInsights(cards);
    showNoPricesWarning(cards);
  } else {
    const ov  = document.getElementById("set-overview");
    const ins = document.getElementById("insights");
    const np  = document.getElementById("no-prices-warn");
    const shp = document.getElementById("set-hist-panel");
    const rbp = document.getElementById("rarity-breakdown-panel");
    if (ov)  ov.hidden  = true;
    if (ins) ins.hidden = true;
    if (np)  np.hidden  = true;
    if (shp) shp.hidden = true;
    if (rbp) rbp.hidden = true;
  }
}

/* ---------- No-price warning ---------- */
function showNoPricesWarning(allCards) {
  const warn = document.getElementById("no-prices-warn");
  if (!warn) return;

  const pricedCount = allCards.filter(c => sortPrice(c) >= 0).length;
  if (pricedCount > 0) { warn.hidden = true; return; }

  // Zero price data — show the warning with the current set name + 3 suggestions
  const setName = setSelect.options[setSelect.selectedIndex]?.text?.split(" (")[0] ?? "This set";
  const nameEl = document.getElementById("np-set-name");
  if (nameEl) nameEl.textContent = setName;

  // Pick 3 well-known sets with reliable price data as suggestions
  const suggestions = [
    { label: "Prismatic Evolutions", id: "sv8pt5" },
    { label: "Surging Sparks",       id: "sv8"    },
    { label: "Stellar Crown",        id: "sv7"    },
  ];
  suggestions.forEach((s, i) => {
    const btn = document.getElementById(`np-suggest-${i + 1}`);
    if (!btn) return;
    btn.textContent = s.label;
    btn.onclick = () => {
      const opt = Array.from(setSelect.options).find(o => o.value === s.id);
      if (opt) {
        setSelect.value = s.id;
        mode = "set";
        searchEl.value = "";
        loadPage(true);
      }
    };
  });

  warn.hidden = false;
}

/* ---------- Set stats panel ---------- */
function renderSetStats(allCards) {
  const overviewEl = document.getElementById("set-overview");
  if (!overviewEl) return;

  const priced = allCards.filter(c => {
    const p = bestPrice(c);
    return p && (p.market ?? p.mid ?? p.low ?? p.high) != null;
  });
  const prices = priced.map(c => sortPrice(c)).filter(v => v > 0).sort((a, b) => a - b);

  if (!prices.length) { overviewEl.hidden = true; return; }

  const coverage = priced.length / allCards.length;
  const sparseWarning = coverage < 0.4
    ? `<div class="sparse-warn">⚠ Only ${priced.length} of ${allCards.length} cards have price data — this set may be too new for full coverage. Cards without prices are sorted by rarity tier. Try a set released 4+ weeks ago for complete stats.</div>`
    : "";

  const total   = prices.reduce((s, v) => s + v, 0);
  const avg     = total / prices.length;
  const median  = prices[Math.floor(prices.length / 2)] ?? 0;
  const topCard = priced.reduce((top, c) => sortPrice(c) > sortPrice(top) ? c : top, priced[0]);

  // Pack Rip EV — simplified uniform model: each of the 10 pack slots equally likely per card.
  // Real pull rates vary by rarity; this gives a useful benchmark vs MSRP.
  const PACK_COST = 5.49;
  const packEV = allCards.length > 0 ? (total * 10) / allCards.length : 0;
  const evRatio = PACK_COST > 0 ? packEV / PACK_COST : 0;
  const evClass = evRatio >= 1.5 ? "ev-good" : evRatio >= 1.0 ? "ev-ok" : "ev-bad";

  document.getElementById("set-tiles").innerHTML = `
    ${sparseWarning}
    <div class="tile tile-anim">
      <div class="t-label">Set Total Value</div>
      <div class="t-value">${usd(total)}</div>
      <div class="t-sub">${priced.length} priced / ${allCards.length} total cards</div>
    </div>
    <div class="tile tile-anim" style="animation-delay:0.07s">
      <div class="t-label">Average Card</div>
      <div class="t-value">${usd(avg)}</div>
      <div class="t-sub">Median ${usd(median)}</div>
    </div>
    <div class="tile tile-anim" style="animation-delay:0.14s">
      <div class="t-label">Top Card</div>
      <div class="t-value">${usd(sortPrice(topCard))}</div>
      <div class="t-sub">${esc(topCard.name)}</div>
    </div>
    <div class="tile tile-anim" style="animation-delay:0.21s">
      <div class="t-label">Pack Rip EV</div>
      <div class="t-value">${usd(packEV)} <span class="ev-ratio ${evClass}">${evRatio.toFixed(1)}×</span></div>
      <div class="t-sub">est. vs $${PACK_COST.toFixed(2)} pack MSRP</div>
    </div>`;

  const tiers = [
    { label: "< $1",    min: 0,   max: 1,       color: "#97a0c8" },
    { label: "$1–5",    min: 1,   max: 5,        color: "#3ddc84" },
    { label: "$5–25",   min: 5,   max: 25,       color: "#3d7dca" },
    { label: "$25–100", min: 25,  max: 100,      color: "#ffcb05" },
    { label: "$100+",   min: 100, max: Infinity, color: "#ff5d5d" },
  ];
  const tierData = tiers.map(t => ({
    ...t, count: prices.filter(p => p >= t.min && p < t.max).length,
  }));
  const maxCount = Math.max(...tierData.map(t => t.count), 1);

  document.getElementById("dist-bars").innerHTML = tierData.map(t => `
    <div class="dist-bar-wrap">
      <div class="dist-bar" style="height:${Math.max((t.count / maxCount) * 100, t.count ? 4 : 0)}%; background:${t.color}"></div>
      <div class="dist-count">${t.count}</div>
      <div class="dist-tier">${esc(t.label)}</div>
    </div>`).join("");

  overviewEl.hidden = false;
  renderRarityBreakdown(allCards);
  renderSetValueChart(setSelect.value).catch(() => {});
}

/* ---------- Rarity breakdown panel ---------- */
function renderRarityBreakdown(allCards) {
  const panel = document.getElementById("rarity-breakdown-panel");
  const container = document.getElementById("rarity-breakdown");
  if (!panel || !container) return;

  const grouped = {};
  for (const card of allCards) {
    const rarity = card.rarity ?? "Unknown";
    if (!grouped[rarity]) {
      grouped[rarity] = { tier: rarityTier(card), count: 0, total: 0, pricedCount: 0 };
    }
    grouped[rarity].count++;
    const sp = sortPrice(card);
    if (sp > 0) {
      grouped[rarity].total += sp;
      grouped[rarity].pricedCount++;
    }
  }

  const entries = Object.entries(grouped).sort(([, a], [, b]) => b.tier - a.tier || b.count - a.count);
  if (!entries.length) { panel.hidden = true; return; }

  const rows = entries.map(([rarity, g]) => {
    const avg = g.pricedCount > 0 ? g.total / g.pricedCount : null;
    return `
      <div class="rb-row">
        <span class="rb-rarity">${esc(rarity)}</span>
        <span class="rb-count">${g.count}</span>
        <span class="rb-total">${g.total > 0 ? usd(g.total) : "—"}</span>
        <span class="rb-avg">${avg != null ? usd(avg) : "—"}</span>
      </div>`;
  }).join("");

  container.innerHTML = `
    <div class="rb-title">Rarity Breakdown</div>
    <div class="rb-row rb-header">
      <span class="rb-rarity">Rarity</span>
      <span class="rb-count">Count</span>
      <span class="rb-total">Total</span>
      <span class="rb-avg">Avg Price</span>
    </div>
    ${rows}`;

  panel.hidden = false;
}

/* ---------- Set value history chart ---------- */
async function renderSetValueChart(setId) {
  const panel = document.getElementById("set-hist-panel");
  const wrap = document.getElementById("set-value-chart-wrap");
  if (!panel || !wrap) return;

  if (setValueChart) { setValueChart.destroy(); setValueChart = null; }

  const analytics = await getAnalytics();
  if (!analytics) { panel.hidden = true; return; }

  const pts = (analytics.valueHistory ?? [])
    .map(d => ({ date: d.date, value: d.pokemon?.[setId] }))
    .filter(d => d.value != null);

  if (pts.length < 2) {
    if (pts.length === 1) {
      wrap.innerHTML = `<div class="note" style="padding:0.4rem 0">Set value tracking started ${esc(pts[0].date)} · ${usd(pts[0].value)} · Check back tomorrow for the trend chart.</div>`;
      panel.hidden = false;
    } else {
      panel.hidden = true;
    }
    return;
  }

  const first = pts[0].value, last = pts[pts.length - 1].value;
  const pct = first ? ((last - first) / first) * 100 : 0;
  const up = pct >= 0;
  const color = up ? "#3ddc84" : "#ff5d5d";
  const bg    = up ? "rgba(61,220,132,0.08)" : "rgba(255,93,93,0.08)";

  wrap.innerHTML = `
    <div class="set-hist-head">
      <span>Set Total Value · ${pts.length} days tracked</span>
      <span class="delta ${up ? "up" : "down"} set-hist-delta">${up ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%</span>
    </div>
    <div style="position:relative;height:130px"><canvas id="set-value-chart"></canvas></div>
    <div class="hist-range">
      <span>${esc(pts[0].date)} · ${usd(first)}</span>
      <span>${esc(pts[pts.length - 1].date)} · ${usd(last)}</span>
    </div>`;

  if (typeof Chart === "undefined") { panel.hidden = true; return; }

  setValueChart = new Chart(document.getElementById("set-value-chart"), {
    type: "line",
    data: {
      labels: pts.map(p => p.date),
      datasets: [{
        data: pts.map(p => p.value),
        borderColor: color,
        backgroundColor: bg,
        fill: true,
        tension: 0.3,
        pointRadius: pts.length > 20 ? 2 : 4,
        pointHoverRadius: 7,
        pointBackgroundColor: color,
      }],
    },
    options: {
      animation: { duration: 800, easing: "easeOutQuart" },
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${usd(c.raw)}` } },
      },
      scales: {
        y: {
          ticks: { callback: v => usd(v), font: { size: 10 } },
          grid: { color: "rgba(151,160,200,0.08)" },
        },
        x: { ticks: { font: { size: 10 }, maxTicksLimit: 6 }, grid: { display: false } },
      },
    },
  });

  panel.hidden = false;
}

/* ---------- Insights: buy signals + best bang for buck ---------- */
function renderInsights(allCards) {
  const insightsEl = document.getElementById("insights");
  if (!insightsEl) return;

  /* --- Buy signals --- */
  const signals = [];
  for (const card of allCards) {
    const p = bestPrice(card);
    if (!p) continue;
    const mkt = p.market ?? p.mid ?? p.low;
    if (!mkt || mkt <= 0) continue;

    const reasons = [];
    let score = 0;

    if (p.low && p.low > 0) {
      const ratio = p.low / mkt;
      if (ratio >= 0.88) {
        reasons.push({ label: "Supply Tight", color: "up" });
        score += (ratio - 0.88) * 120;
      }
    }

    const cm = card.cardmarket?.prices;
    if (cm?.trendPrice) {
      const cmUsd = cm.trendPrice * EUR_USD;
      const gap = (cmUsd - mkt) / cmUsd;
      if (gap >= 0.20) {
        reasons.push({ label: "EU Premium", color: "accent-2" });
        score += gap * 60;
      }
    }

    if (cm?.avg1 && cm?.avg7 && cm.avg1 > cm.avg7 * 1.08) {
      reasons.push({ label: "Rising ▲", color: "up" });
      score += 12;
    }

    if (p.low && mkt >= p.low * 1.30) {
      reasons.push({ label: "High Demand", color: "accent" });
      score += 10;
    }

    if (reasons.length > 0) signals.push({ card, reasons, score, price: mkt });
  }
  signals.sort((a, b) => b.score - a.score);
  const topSignals = signals.slice(0, 10);

  const signalsBadge = document.getElementById("signals-badge");
  if (signalsBadge) {
    signalsBadge.textContent = topSignals.length ? String(topSignals.length) : "";
    signalsBadge.hidden = !topSignals.length;
  }

  const noPriceData = allCards.every(c => sortPrice(c) < 0);

  const signalsEl = document.getElementById("buy-signals-list");
  if (signalsEl) {
    if (!topSignals.length) {
      const msg = noPriceData
        ? "No TCGplayer price data for this set yet — signals will appear once prices are available."
        : "No strong signals right now — prices across this set appear balanced.";
      signalsEl.innerHTML = `<p class="status">${msg}</p>`;
    } else {
      signalsEl.innerHTML = topSignals.map(({ card, reasons, price }) => `
        <div class="insight-card" data-id="${esc(card.id)}">
          <img src="${esc(card.images.small)}" alt="${esc(card.name)}" loading="lazy" />
          <div class="ic-body">
            <div class="ic-name">${esc(card.name)}</div>
            <div class="ic-price">${usd(price)}</div>
            <div class="ic-sigs">
              ${reasons.map(r => `<span class="sig-badge sig-${esc(r.color)}">${esc(r.label)}</span>`).join("")}
            </div>
          </div>
        </div>`).join("");
      Array.from(signalsEl.children).forEach((el, i) => {
        el.addEventListener("click", () => openCard(topSignals[i].card));
      });
    }
  }

  /* --- Best bang for buck --- */
  const bangCards = allCards
    .filter(c => {
      const sp = sortPrice(c);
      return sp > 0.5 && sp < 150;
    })
    .map(card => {
      const sp = sortPrice(card);
      const tier = rarityTier(card);
      return { card, price: sp, tier, score: (tier * tier) / (Math.log(sp + 1) || 1) };
    })
    .filter(x => x.tier >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const bangEl = document.getElementById("bang-list");
  if (bangEl) {
    if (!bangCards.length) {
      const bangMsg = noPriceData
        ? "No TCGplayer price data for this set yet — bang-for-buck rankings will appear once prices are available."
        : "Not enough high-rarity price data to rank bang-for-buck in this set.";
      bangEl.innerHTML = `<p class="status">${bangMsg}</p>`;
    } else {
      bangEl.innerHTML = bangCards.map(({ card, price }) => `
        <div class="insight-card" data-id="${esc(card.id)}">
          <img src="${esc(card.images.small)}" alt="${esc(card.name)}" loading="lazy" />
          <div class="ic-body">
            <div class="ic-name">${esc(card.name)}</div>
            <div class="ic-price">${usd(price)}</div>
            <div class="ic-sigs">
              <span class="sig-badge sig-accent">${esc(card.rarity ?? "Rare")}</span>
            </div>
          </div>
        </div>`).join("");
      Array.from(bangEl.children).forEach((el, i) => {
        el.addEventListener("click", () => openCard(bangCards[i].card));
      });
    }
  }

  insightsEl.hidden = false;
}

/* ---------- Card modal ---------- */
function openCard(card) {
  const prices = card.tcgplayer?.prices ?? {};
  const rows = Object.entries(prices).map(([variant, p]) => `
    <tr>
      <td>${esc(variant.replace(/([A-Z])/g, " $1"))}</td>
      <td>${usd(p.low)}</td>
      <td class="mkt">${usd(p.market)}</td>
      <td>${usd(p.high)}</td>
    </tr>`).join("");

  const cm = card.cardmarket?.prices;
  const d7  = (cm?.avg1 && cm?.avg7  && cm.avg7  > 0) ? ((cm.avg1 - cm.avg7)  / cm.avg7  * 100) : null;
  const d30 = (cm?.avg1 && cm?.avg30 && cm.avg30 > 0) ? ((cm.avg1 - cm.avg30) / cm.avg30 * 100) : null;
  let trendHtml = "";
  if (cm && (cm.avg1 || cm.avg7 || cm.avg30 || cm.trendPrice)) {
    const dBadge = v => v == null ? "" : `<span class="delta-mini ${v >= 0 ? "up" : "down"}">${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(1)}%</span>`;
    trendHtml = `
      <div class="cm-trend-panel">
        <div class="cmt-head">Cardmarket (EUR → USD)</div>
        <div class="cmt-grid">
          ${cm.avg1       ? `<div class="cmt-stat"><span class="cmt-label">1-Day</span><b class="cmt-val">${eurUsd(cm.avg1)}</b></div>` : ""}
          ${cm.avg7       ? `<div class="cmt-stat"><span class="cmt-label">7-Day Avg</span><b class="cmt-val">${eurUsd(cm.avg7)} ${dBadge(d7)}</b></div>` : ""}
          ${cm.avg30      ? `<div class="cmt-stat"><span class="cmt-label">30-Day Avg</span><b class="cmt-val">${eurUsd(cm.avg30)} ${dBadge(d30)}</b></div>` : ""}
          ${cm.trendPrice ? `<div class="cmt-stat"><span class="cmt-label">CM Trend</span><b class="cmt-val">${eurUsd(cm.trendPrice)}</b></div>` : ""}
        </div>
      </div>`;
  }

  const sp = bestPrice(card);
  const spread = (sp?.market && sp?.low && sp.low > 0)
    ? `<div class="spread-row"><span class="spread-label">Market vs low listing</span><span class="spread-val">${((sp.market / sp.low - 1) * 100).toFixed(0)}% premium</span></div>`
    : "";

  const detailRows = [
    detailStat("Set", card.set?.name),
    detailStat("Number", `#${card.number}/${card.set?.printedTotal ?? "?"}`),
    detailStat("Rarity", card.rarity),
    detailStat("HP", card.hp),
    detailStat("Stage", joinList(card.subtypes)),
    detailStat("Types", joinList(card.types)),
    detailStat("Artist", card.artist),
    detailStat("Evolves from", card.evolvesFrom),
    detailStat("Weakness", joinList((card.weaknesses ?? []).map((w) => `${w.type} ${w.value}`))),
    detailStat("Resistance", joinList((card.resistances ?? []).map((r) => `${r.type} ${r.value}`))),
    detailStat("Regulation", card.regulationMark),
    detailStat("Legal", Object.entries(card.legalities ?? {}).map(([k, v]) => `${k}: ${v}`).join(", ")),
    detailStat("Release", card.set?.releaseDate),
    detailStat("Series", card.set?.series),
  ].join("");

  const rules = [
    ...(card.abilities ?? []).map((a) => `<p class="card-text"><b>${esc(a.name)}</b> (${esc(a.type)}): ${esc(a.text)}</p>`),
    ...(card.attacks ?? []).map((a) => `<p class="card-text"><b>${esc(a.name)}</b> ${a.damage ? `· ${esc(a.damage)}` : ""}<br>${esc(a.text ?? "")}</p>`),
    card.rules?.length ? `<p class="card-text">${card.rules.map(esc).join("<br>")}</p>` : "",
    card.flavorText ? `<p class="card-text card-flavor">${esc(card.flavorText)}</p>` : "",
  ].join("");

  const mktPrice = sp?.market ? usd(sp.market) : null;
  const mktRaw = sp?.market ?? 0;
  const inColl = typeof pfHas === "function" && pfHas(card.id);
  const collHolding = inColl && typeof pfGet === "function" ? pfGet(card.id) : null;
  const priceHero = mktPrice ? `
    <div class="modal-price-hero">
      <span class="mph-label">Market Price</span>
      <span class="mph-value">${mktPrice}</span>
      ${d7 != null ? `<span class="mph-delta ${d7 >= 0 ? "up" : "down"}">${d7 >= 0 ? "▲" : "▼"} ${Math.abs(d7).toFixed(1)}% (7d)</span>` : ""}
    </div>` : "";
  const tcgUrl = card.tcgplayer?.url ?? "";

  openModal(`
    <div class="modal-card-col">
      <img class="art" src="${esc(hiResImage(card.images.large || card.images.small))}" alt="${esc(card.name)}" />
      ${priceHero}
      <div class="modal-actions">
        ${tcgUrl ? `<a href="${esc(tcgUrl)}" target="_blank" rel="noopener" class="modal-btn-tcg">Buy on TCGplayer ↗</a>` : ""}
        <button class="modal-btn-portfolio${inColl ? " in-collection" : ""}" id="modal-collection-btn">${inColl ? `✓ Collection (${collHolding?.qty ?? 1})` : "＋ Add to Collection"}</button>
        <button class="modal-btn-alert" id="modal-alert-btn">🔔 Set Alert</button>
      </div>
    </div>
    <div>
      <div class="modal-title-row">
        <h2>${esc(card.name)}</h2>
        <button class="copy-name-btn" title="Copy card name">⎘ Copy</button>
      </div>
      <div class="meta">
        ${esc(card.set.name)} · #${esc(card.number)}/${esc(card.set.printedTotal)} ·
        ${esc(card.rarity ?? "Unknown rarity")} ${card.artist ? "· Illus. " + esc(card.artist) : ""}
      </div>
      <div class="detail-grid">${detailRows}</div>
      ${rules}
      ${rows ? `
        <table class="price-table">
          <thead><tr><th>TCGplayer (USD)</th><th>Low</th><th>Market</th><th>High</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${spread}
        ${localMarketNote("Pokémon TCG API and TCGplayer market feeds", card.tcgplayer?.updatedAt)}`
        : `<p class="note">No TCGplayer price listed for this card.</p>`}
      ${trendHtml}
      <div id="modal-chart-wrap" class="modal-chart-wrap">
        <div class="chart-loading">Loading price chart…</div>
      </div>
    </div>
  `);

  document.querySelector(".copy-name-btn")?.addEventListener("click", function () {
    navigator.clipboard.writeText(card.name).then(() => {
      this.textContent = "✓ Copied";
      setTimeout(() => { this.textContent = "⎘ Copy"; }, 1500);
    }).catch(() => {});
  });

  /* ── Add to Collection ── */
  document.getElementById("modal-collection-btn")?.addEventListener("click", function () {
    if (document.getElementById("modal-alert-form")) document.getElementById("modal-alert-form").remove();
    const existing = document.getElementById("modal-collection-form");
    if (existing) { existing.remove(); return; }
    const h = typeof pfGet === "function" ? pfGet(card.id) : null;
    const form = document.createElement("div");
    form.id = "modal-collection-form";
    form.className = "modal-mini-form";
    form.innerHTML = `
      <div class="mf-row">
        <label>Qty<input type="number" id="mc-qty" min="1" max="999" value="${h?.qty ?? 1}" /></label>
        <label>Paid / card ($)<input type="number" id="mc-cost" step="0.01" min="0" value="${h?.cost ?? (mktRaw > 0 ? mktRaw.toFixed(2) : "0")}" /></label>
      </div>
      <div class="mf-row mf-actions">
        <button class="btn btn-buy" id="mc-save">Save</button>
        ${h ? `<button class="btn btn-ghost" id="mc-remove">Remove</button>` : ""}
        <button class="btn btn-ghost" id="mc-cancel">Cancel</button>
      </div>`;
    this.closest(".modal-actions").after(form);
    document.getElementById("mc-cancel")?.addEventListener("click", () => form.remove());
    document.getElementById("mc-remove")?.addEventListener("click", () => {
      if (typeof removeHolding === "function") removeHolding(card.id);
      form.remove();
      this.textContent = "＋ Add to Collection";
      this.classList.remove("in-collection");
    });
    document.getElementById("mc-save")?.addEventListener("click", () => {
      const qty = Math.max(1, parseInt(document.getElementById("mc-qty").value) || 1);
      const cost = Math.max(0, parseFloat(document.getElementById("mc-cost").value) || 0);
      if (typeof setHolding === "function") {
        setHolding(card.id, qty, cost, {
          game: "pokemon",
          name: card.name,
          image: card.images?.small ?? "",
          set: card.set?.name ?? "",
          rarity: card.rarity ?? "",
          lastPrice: mktRaw || 0,
        });
      }
      form.remove();
      this.textContent = `✓ Collection (${qty})`;
      this.classList.add("in-collection");
    });
  });

  /* ── Set Alert ── */
  document.getElementById("modal-alert-btn")?.addEventListener("click", function () {
    if (document.getElementById("modal-collection-form")) document.getElementById("modal-collection-form").remove();
    const existing = document.getElementById("modal-alert-form");
    if (existing) { existing.remove(); return; }
    const existingAlerts = typeof alertsForCard === "function" ? alertsForCard(card.id) : [];
    const kindLabel = { "price-below": "Below", "price-above": "Above", "pct-move": "% Move" };
    const form = document.createElement("div");
    form.id = "modal-alert-form";
    form.className = "modal-alert-form";
    form.innerHTML = `
      <div class="maf-tabs">
        <button class="maf-tab active" data-kind="price-below">Below</button>
        <button class="maf-tab" data-kind="price-above">Above</button>
        <button class="maf-tab" data-kind="pct-move">% Move</button>
      </div>
      <div class="maf-input">
        <input type="number" id="ma-target" step="0.01" min="0" placeholder="Target $" value="${mktRaw > 0 ? mktRaw.toFixed(2) : ""}" />
        <button class="btn btn-buy" id="ma-save">Set</button>
        <button class="btn btn-ghost" id="ma-cancel">✕</button>
      </div>
      ${existingAlerts.length ? `<div class="maf-chips">${existingAlerts.map(a =>
        `<span class="maf-chip">${esc(kindLabel[a.kind] ?? a.kind)}: ${a.kind === "pct-move" ? a.target + "%" : "$" + a.target.toFixed(2)} <button class="chip-x" data-alert-id="${esc(a.id)}">✕</button></span>`
      ).join("")}</div>` : ""}`;
    this.closest(".modal-actions").after(form);
    let activeKind = "price-below";
    form.querySelectorAll(".maf-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        activeKind = tab.dataset.kind;
        form.querySelectorAll(".maf-tab").forEach(t => t.classList.toggle("active", t === tab));
        const inp = document.getElementById("ma-target");
        if (!inp) return;
        if (activeKind === "pct-move") { inp.placeholder = "Min % move (e.g. 10)"; inp.value = "10"; }
        else { inp.placeholder = "Target $"; if (mktRaw > 0) inp.value = mktRaw.toFixed(2); }
      });
    });
    document.getElementById("ma-cancel")?.addEventListener("click", () => form.remove());
    document.getElementById("ma-save")?.addEventListener("click", () => {
      const target = parseFloat(document.getElementById("ma-target").value);
      if (isNaN(target) || target <= 0) return;
      if (typeof addAlert === "function") {
        addAlert({ kind: activeKind, cardId: card.id, cardName: card.name, cardImage: card.images?.small ?? "", target });
      }
      form.remove();
      this.textContent = "🔔 Alert set ✓";
    });
    form.querySelectorAll(".chip-x").forEach(btn => {
      btn.addEventListener("click", () => {
        if (typeof removeAlert === "function") removeAlert(btn.dataset.alertId);
        btn.closest(".maf-chip")?.remove();
      });
    });
  });

  renderModalChart(card);
}

/* ---------- Modal price chart (Chart.js) ---------- */
async function renderModalChart(card) {
  const wrap = document.getElementById("modal-chart-wrap");
  if (!wrap || typeof Chart === "undefined") return;

  const h = await getHistory();
  const pts = [];
  for (const snap of h.snapshots) {
    for (const sid of Object.keys(snap.pokemon ?? {})) {
      const v = snap.pokemon[sid][card.id];
      if (v != null) { pts.push({ date: snap.date, v }); break; }
    }
  }

  if (pts.length >= 2) {
    const first = pts[0].v, last = pts[pts.length - 1].v;
    const pct = first ? ((last - first) / first) * 100 : 0;
    const up = pct >= 0;
    const color = up ? "#3ddc84" : "#ff5d5d";
    const bg    = up ? "rgba(61,220,132,0.12)" : "rgba(255,93,93,0.12)";

    wrap.innerHTML = `
      <div class="hist-head">
        <span>TCGplayer Price History (${pts.length} days)</span>
        <span class="delta ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%</span>
      </div>
      <div style="position:relative;height:140px"><canvas id="pk-modal-chart"></canvas></div>
      <div class="hist-range">
        <span>${esc(pts[0].date)} · ${usd(first)}</span>
        <span>${esc(pts[pts.length - 1].date)} · ${usd(last)}</span>
      </div>`;

    new Chart(document.getElementById("pk-modal-chart"), {
      type: "line",
      data: {
        labels: pts.map(p => p.date),
        datasets: [{ data: pts.map(p => p.v), borderColor: color, backgroundColor: bg,
          fill: true, tension: 0.3, pointRadius: pts.length > 20 ? 2 : 4, pointHoverRadius: 7,
          pointBackgroundColor: color }],
      },
      options: {
        animation: { duration: 900, easing: "easeOutQuart" },
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${usd(c.raw)}` } } },
        scales: {
          y: { ticks: { callback: v => usd(v), font: { size: 10 } }, grid: { color: "rgba(151,160,200,0.08)" } },
          x: { ticks: { font: { size: 10 }, maxTicksLimit: 6 }, grid: { display: false } },
        },
      },
    });
    return;
  }

  // Fallback: Cardmarket rolling averages
  const cm = card.cardmarket?.prices;
  if (cm && (cm.avg30 || cm.avg7 || cm.avg1)) {
    const vals = [
      cm.avg30 ? cm.avg30 * EUR_USD : null,
      cm.avg7  ? cm.avg7  * EUR_USD : null,
      cm.avg1  ? cm.avg1  * EUR_USD : null,
    ];
    const valid = vals.filter(v => v != null);
    const pct = valid.length >= 2 && valid[0]
      ? ((valid[valid.length - 1] - valid[0]) / valid[0]) * 100 : 0;
    const up    = pct >= 0;
    const color = up ? "#3ddc84" : "#ff5d5d";
    const bg    = up ? "rgba(61,220,132,0.12)" : "rgba(255,93,93,0.12)";

    wrap.innerHTML = `
      <div class="hist-head">
        <span>Cardmarket Trend (EUR→USD)</span>
        <span class="delta ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%</span>
      </div>
      <div style="position:relative;height:140px"><canvas id="pk-modal-chart"></canvas></div>`;

    new Chart(document.getElementById("pk-modal-chart"), {
      type: "line",
      data: {
        labels: ["30-day avg", "7-day avg", "Today"],
        datasets: [{ data: vals, borderColor: color, backgroundColor: bg,
          fill: true, tension: 0.4, pointRadius: 6, pointHoverRadius: 9,
          pointBackgroundColor: color }],
      },
      options: {
        animation: { duration: 900, easing: "easeOutQuart" },
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${usd(c.raw)}` } } },
        scales: {
          y: { ticks: { callback: v => usd(v), font: { size: 10 } }, grid: { color: "rgba(151,160,200,0.08)" } },
          x: { grid: { display: false } },
        },
      },
    });
    return;
  }

  wrap.innerHTML = pts.length === 1
    ? `<div class="note">Daily price tracking started ${esc(pts[0].date)} — chart appears as snapshots accumulate.</div>`
    : `<div class="note">Price chart will appear as daily snapshots accumulate for this card.</div>`;
}

/* ---------- Data loading ---------- */
async function loadPage(reset) {
  if (reset) {
    page = 1;
    cards = [];
    showSkeleton();
    const ov  = document.getElementById("set-overview");
    const ins = document.getElementById("insights");
    const shp = document.getElementById("set-hist-panel");
    const rbp = document.getElementById("rarity-breakdown-panel");
    if (ov)  ov.hidden  = true;
    if (ins) ins.hidden = true;
    if (shp) shp.hidden = true;
    if (rbp) rbp.hidden = true;
    if (setValueChart) { setValueChart.destroy(); setValueChart = null; }
  }
  statusEl.textContent = "Loading cards…";
  loadMoreBtn.hidden = true;
  try {
    const clean = searchEl.value.trim()
      .replace(/[^\p{L}\p{N}\s.'-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (mode === "search" && clean) {
      const q = `name:"*${clean}*"`;
      const data = await pkFetch(
        `/cards?q=${encodeURIComponent(q)}&page=${page}&pageSize=${SEARCH_PAGE_SIZE}&orderBy=-set.releaseDate`
      );
      totalCount = data.totalCount;
      cards = cards.concat(data.data);
    } else {
      const q = `set.id:${setSelect.value}`;
      let pg = 1;
      const all = [];
      while (true) {
        const data = await pkFetch(
          `/cards?q=${encodeURIComponent(q)}&page=${pg}&pageSize=${SET_PAGE_SIZE}`
        );
        totalCount = data.totalCount;
        all.push(...data.data);
        if (all.length >= totalCount || data.data.length === 0) break;
        pg += 1;
      }
      cards = all;
    }
    statusEl.textContent = totalCount === 0 ? "No cards found." : "";
    render();
  } catch (err) {
    grid.innerHTML = "";
    statusEl.textContent = "Couldn't reach the Pokémon TCG API — please try again in a moment.";
    console.error(err);
  }
}

async function init() {
  try {
    const data = await pkFetch("/sets?orderBy=-releaseDate&pageSize=250");
    setSelect.innerHTML = data.data
      .map((s) => `<option value="${esc(s.id)}">${esc(s.name)} (${esc(s.releaseDate)})</option>`)
      .join("");
    await loadPage(true);
  } catch (err) {
    statusEl.textContent = "Couldn't load sets — please refresh.";
    console.error(err);
  }
}

setSelect.addEventListener("change", () => {
  mode = "set";
  searchEl.value = "";
  loadPage(true);
});

searchEl.addEventListener("input", debounce(() => {
  const q = searchEl.value.trim();
  mode = q.length >= 2 ? "search" : "set";
  loadPage(true);
}, 450));

sortSelect.addEventListener("change", render);
loadMoreBtn.addEventListener("click", () => { page += 1; loadPage(false); });

if (btnGrid) btnGrid.addEventListener("click", () => {
  viewMode = "grid";
  btnGrid.classList.add("active"); btnGrid.setAttribute("aria-pressed", "true");
  btnTable.classList.remove("active"); btnTable.setAttribute("aria-pressed", "false");
  render();
});

if (btnTable) btnTable.addEventListener("click", () => {
  viewMode = "table";
  btnTable.classList.add("active"); btnTable.setAttribute("aria-pressed", "true");
  btnGrid.classList.remove("active"); btnGrid.setAttribute("aria-pressed", "false");
  render();
});

init();
