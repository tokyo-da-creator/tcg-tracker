/* Pokémon browser — data: api.pokemontcg.io v2 (TCGplayer prices + Cardmarket averages). */

const PK_API = "https://api.pokemontcg.io/v2";
const SEARCH_PAGE_SIZE = 24;
const SET_PAGE_SIZE = 250;

const setSelect   = document.getElementById("set-select");
const searchEl    = document.getElementById("search");
const sortSelect  = document.getElementById("sort-select");
const grid        = document.getElementById("grid");
const statusEl    = document.getElementById("status");
const updatedEl   = document.getElementById("price-updated");
const loadMoreBtn = document.getElementById("load-more");

let mode = "set";
let page = 1;
let totalCount = 0;
let cards = [];

async function pkFetch(path) {
  const res = await fetch(`${PK_API}${path}`);
  if (!res.ok) throw new Error(`Pokémon TCG API error ${res.status}`);
  return res.json();
}

/* Best available TCGplayer price block — picks the variant with the highest market price. */
function bestPrice(card) {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;
  const variants = Object.entries(prices);
  if (!variants.length) return null;
  variants.sort((a, b) => (b[1].market ?? 0) - (a[1].market ?? 0));
  const [variant, p] = variants[0];
  return { variant, ...p };
}

/* Best available numeric price for sorting — uses market, then mid, then low, then high. */
function sortPrice(card) {
  const p = bestPrice(card);
  if (!p) return -1;
  return p.market ?? p.mid ?? p.low ?? p.high ?? -1;
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
  const li = document.createElement("li");
  li.className = `tcard ${rarityClass(card.rarity)}`.trim();
  li.innerHTML = `
    <img loading="lazy" decoding="async" src="${esc(hiResImage(card.images.large || card.images.small))}" alt="${esc(card.name)}" />
    <div class="name">${esc(card.name)}</div>
    <div class="meta">${esc(card.set.name)} · #${esc(card.number)}/${esc(card.set.printedTotal)}</div>
    <div class="pricebar">
      <span class="price">${p ? usd(p.market ?? p.mid ?? p.low) : "—"}</span>
      <span class="rarity">${esc(card.rarity ?? "—")}</span>
    </div>`;
  li.appendChild(wlStarButton({
    game: "pokemon",
    id: card.id,
    name: card.name,
    image: card.images.small,
    sub: `${card.set.name} · #${card.number}`,
    detail: `pokemon:${card.id}`,
    price: p ? (p.market ?? p.mid ?? p.low) : null,
  }));
  li.addEventListener("click", () => openCard(card));
  return li;
}

/* ---------- Grid render ---------- */
function render() {
  grid.innerHTML = "";
  const sorted = [...cards];
  const sort = sortSelect.value;

  if (sort === "price-desc" || sort === "price-asc") {
    sorted.sort((a, b) => {
      const pa = sortPrice(a);
      const pb = sortPrice(b);
      if (pa < 0 && pb < 0) return 0;
      if (pa < 0) return 1;   // unpriced → always last
      if (pb < 0) return -1;
      return sort === "price-desc" ? pb - pa : pa - pb;
    });
  } else if (sort === "number") {
    sorted.sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));
  } else if (sort === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }

  sorted.forEach((c, i) => {
    const li = cardLi(c);
    li.style.animationDelay = `${Math.min(i, 40) * 25}ms`;
    li.classList.add("card-enter");
    grid.appendChild(li);
  });

  loadMoreBtn.hidden = mode === "set" || cards.length >= totalCount;

  const updated = cards.find((c) => c.tcgplayer?.updatedAt)?.tcgplayer.updatedAt;
  updatedEl.textContent = updated
    ? `TCGplayer prices updated ${updated} · ${totalCount} cards`
    : "";

  if (mode === "set" && cards.length > 0) {
    renderSetStats(cards);
    renderInsights(cards);
  } else {
    const ov = document.getElementById("set-overview");
    const ins = document.getElementById("insights");
    if (ov) ov.hidden = true;
    if (ins) ins.hidden = true;
  }
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

  const total  = prices.reduce((s, v) => s + v, 0);
  const avg    = total / prices.length;
  const median = prices[Math.floor(prices.length / 2)];
  const topCard = priced.reduce((top, c) => sortPrice(c) > sortPrice(top) ? c : top);

  document.getElementById("set-tiles").innerHTML = `
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
      <div class="t-label">Price Coverage</div>
      <div class="t-value">${Math.round(priced.length / allCards.length * 100)}%</div>
      <div class="t-sub">${priced.length} of ${allCards.length} cards priced</div>
    </div>`;

  const tiers = [
    { label: "< $1",     min: 0,   max: 1,        color: "#97a0c8" },
    { label: "$1–5",     min: 1,   max: 5,         color: "#3ddc84" },
    { label: "$5–25",    min: 5,   max: 25,        color: "#3d7dca" },
    { label: "$25–100",  min: 25,  max: 100,       color: "#ffcb05" },
    { label: "$100+",    min: 100, max: Infinity,  color: "#ff5d5d" },
  ];
  const tierData = tiers.map(t => ({
    ...t,
    count: prices.filter(p => p >= t.min && p < t.max).length,
  }));
  const maxCount = Math.max(...tierData.map(t => t.count), 1);

  document.getElementById("dist-bars").innerHTML = tierData.map(t => `
    <div class="dist-bar-wrap">
      <div class="dist-bar" style="height:${Math.max((t.count / maxCount) * 100, t.count ? 4 : 0)}%; background:${t.color}"></div>
      <div class="dist-count">${t.count}</div>
      <div class="dist-tier">${esc(t.label)}</div>
    </div>`).join("");

  overviewEl.hidden = false;
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

    // Supply squeeze: lowest listing is ≥ 88% of market price
    if (p.low && p.low > 0) {
      const ratio = p.low / mkt;
      if (ratio >= 0.88) {
        reasons.push({ label: "Supply Tight", color: "up" });
        score += (ratio - 0.88) * 120;
      }
    }

    // Cardmarket trend > TCGplayer by ≥ 20% → US underpriced vs EU
    const cm = card.cardmarket?.prices;
    if (cm?.trendPrice) {
      const cmUsd = cm.trendPrice * EUR_USD;
      const gap = (cmUsd - mkt) / cmUsd;
      if (gap >= 0.20) {
        reasons.push({ label: "EU Premium", color: "accent-2" });
        score += gap * 60;
      }
    }

    // Cardmarket 1-day avg rising vs 7-day (momentum signal)
    if (cm?.avg1 && cm?.avg7 && cm.avg1 > cm.avg7 * 1.08) {
      reasons.push({ label: "Rising ▲", color: "up" });
      score += 12;
    }

    // High spread: market is ≥ 30% above the lowest listing (buyers paying up)
    if (p.low && mkt >= p.low * 1.30) {
      reasons.push({ label: "High Demand", color: "accent" });
      score += 10;
    }

    if (reasons.length > 0) {
      signals.push({ card, reasons, score, price: mkt });
    }
  }
  signals.sort((a, b) => b.score - a.score);
  const topSignals = signals.slice(0, 10);

  const signalsBadge = document.getElementById("signals-badge");
  if (signalsBadge) signalsBadge.textContent = topSignals.length || "";

  const signalsEl = document.getElementById("buy-signals-list");
  if (signalsEl) {
    if (!topSignals.length) {
      signalsEl.innerHTML = `<p class="status">No strong signals in this set — prices appear balanced.</p>`;
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
      topSignals.forEach((s, i) => {
        signalsEl.children[i]?.addEventListener("click", () => openCard(s.card));
      });
    }
  }

  /* --- Best bang for buck --- */
  const RARITY_TIER = {
    "common": 1, "uncommon": 2, "rare": 3, "holo rare": 4,
    "double rare": 5, "ace spec rare": 5, "ultra rare": 6,
    "illustration rare": 6, "special illustration rare": 7,
    "hyper rare": 8, "secret rare": 8, "shiny rare": 6, "shiny ultra rare": 7,
    "trainer gallery rare holo": 5,
  };

  const bangCards = allCards
    .filter(c => {
      const sp = sortPrice(c);
      return sp > 0.5 && sp < 150;
    })
    .map(card => {
      const sp = sortPrice(card);
      const rarityKey = (card.rarity ?? "").toLowerCase();
      const tier = Object.entries(RARITY_TIER).reduce(
        (best, [key, val]) => rarityKey.includes(key) ? Math.max(best, val) : best, 1
      );
      return { card, price: sp, tier, score: (tier * tier) / (Math.log(sp + 1) || 1) };
    })
    .filter(x => x.tier >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const bangEl = document.getElementById("bang-list");
  if (bangEl) {
    if (!bangCards.length) {
      bangEl.innerHTML = `<p class="status">Not enough high-rarity price data to rank bang-for-buck in this set.</p>`;
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
      bangCards.forEach((b, i) => {
        bangEl.children[i]?.addEventListener("click", () => openCard(b.card));
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
  const trendHtml = cm ? `
    <div class="trend-row">
      <span class="t">CM trend<b>${eurUsd(cm.trendPrice)}</b></span>
      <span class="t">1-day avg<b>${eurUsd(cm.avg1)}</b></span>
      <span class="t">7-day avg<b>${eurUsd(cm.avg7)}</b></span>
      <span class="t">30-day avg<b>${eurUsd(cm.avg30)}</b></span>
    </div>` : "";

  const sp = bestPrice(card);
  const spread = (sp && sp.market && sp.low)
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

  openModal(`
    <div><img class="art" src="${esc(hiResImage(card.images.large || card.images.small))}" alt="${esc(card.name)}" /></div>
    <div>
      <h2>${esc(card.name)}</h2>
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
    const bg = up ? "rgba(61,220,132,0.12)" : "rgba(255,93,93,0.12)";

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
        datasets: [{
          data: pts.map(p => p.v),
          borderColor: color,
          backgroundColor: bg,
          fill: true, tension: 0.3,
          pointRadius: pts.length > 20 ? 2 : 4,
          pointHoverRadius: 7,
          pointBackgroundColor: color,
        }],
      },
      options: {
        animation: { duration: 900, easing: "easeOutQuart" },
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` ${usd(c.raw)}` } },
        },
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
    const vals = [cm.avg30 * EUR_USD, cm.avg7 * EUR_USD, cm.avg1 * EUR_USD];
    const pct = vals[0] ? ((vals[2] - vals[0]) / vals[0]) * 100 : 0;
    const up = pct >= 0;
    const color = up ? "#3ddc84" : "#ff5d5d";
    const bg = up ? "rgba(61,220,132,0.12)" : "rgba(255,93,93,0.12)";

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
        datasets: [{
          data: vals,
          borderColor: color,
          backgroundColor: bg,
          fill: true, tension: 0.4,
          pointRadius: 6, pointHoverRadius: 9,
          pointBackgroundColor: color,
        }],
      },
      options: {
        animation: { duration: 900, easing: "easeOutQuart" },
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` ${usd(c.raw)}` } },
        },
        scales: {
          y: { ticks: { callback: v => usd(v), font: { size: 10 } }, grid: { color: "rgba(151,160,200,0.08)" } },
          x: { grid: { display: false } },
        },
      },
    });
    return;
  }

  // No chart data
  if (pts.length === 1) {
    wrap.innerHTML = `<div class="note">Daily price tracking started ${esc(pts[0].date)} — chart appears as snapshots accumulate.</div>`;
  } else {
    wrap.innerHTML = `<div class="note">Price chart will appear as daily snapshots accumulate for this card.</div>`;
  }
}

/* ---------- Data loading ---------- */
async function loadPage(reset) {
  if (reset) {
    page = 1;
    cards = [];
    showSkeleton();
    const ov = document.getElementById("set-overview");
    const ins = document.getElementById("insights");
    if (ov) ov.hidden = true;
    if (ins) ins.hidden = true;
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

init();
