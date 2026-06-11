/* Markets page — charts and tables fed by data/analytics.json + data/movers.json. */

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const GAME_LABEL = { pokemon: "Pokémon", onepiece: "One Piece" };
const SERIES_COLORS = ["#ffcb05","#3d7dca","#e63946","#3ddc84","#f4a261","#a78bfa","#22d3ee","#fb7185","#84cc16","#eab308","#60a5fa"];
const PACK_COST = 5.49;

async function getData(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

function baseChartOpts() {
  Chart.defaults.color = css("--muted");
  Chart.defaults.borderColor = "rgba(151,160,200,0.15)";
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
}

function renderTiles(analytics, movers) {
  const pk = analytics.pokemon.sets;
  const op = analytics.onepiece.sets;
  const pkTotal = pk.reduce((s, x) => s + x.totalValue, 0);
  const opTotal = op.reduce((s, x) => s + x.totalValue, 0);
  const allTops = [...pk, ...op].map(s => s.topCard).filter(Boolean).sort((a, b) => b.price - a.price);
  const topCard = allTops[0] ?? { price: 0, name: "No data yet" };
  const moverList = movers?.ready ? [...movers.pokemon, ...movers.onepiece] : (movers?.interim?.pokemon ?? []);
  const big = moverList.length ? moverList.reduce((a, b) => Math.abs(b.pct) > Math.abs(a.pct) ? b : a) : null;

  const hist = analytics.valueHistory ?? [];
  let pkDelta = null, opDelta = null;
  if (hist.length >= 2) {
    const prev = hist[hist.length - 2], curr = hist[hist.length - 1];
    const prevPk = Object.values(prev.pokemon ?? {}).reduce((s, v) => s + v, 0);
    const currPk = Object.values(curr.pokemon ?? {}).reduce((s, v) => s + v, 0);
    const prevOp = Object.values(prev.onepiece ?? {}).reduce((s, v) => s + v, 0);
    const currOp = Object.values(curr.onepiece ?? {}).reduce((s, v) => s + v, 0);
    if (prevPk > 0) pkDelta = ((currPk - prevPk) / prevPk) * 100;
    if (prevOp > 0) opDelta = ((currOp - prevOp) / prevOp) * 100;
  }

  const dHtml = v => v != null
    ? `<span class="tile-delta ${v >= 0 ? "up" : "down"}">${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(1)}% 24h</span>`
    : "";

  document.getElementById("tiles").innerHTML = `
    <div class="tile">
      <div class="t-label">Pokémon tracked</div>
      <div class="t-value">${usd(pkTotal)} ${dHtml(pkDelta)}</div>
      <div class="t-sub">${pk.length} sets · ${pk.reduce((s, x) => s + x.pricedCards, 0)} priced cards</div>
    </div>
    <div class="tile">
      <div class="t-label">One Piece tracked</div>
      <div class="t-value">${usd(opTotal)} ${dHtml(opDelta)}</div>
      <div class="t-sub">${op.length} sets · ${op.reduce((s, x) => s + x.pricedCards, 0)} priced cards</div>
    </div>
    <div class="tile">
      <div class="t-label">Most valuable card</div>
      <div class="t-value">${usd(topCard.price)}</div>
      <div class="t-sub">${esc(topCard.name)}</div>
    </div>
    <div class="tile">
      <div class="t-label">Biggest move</div>
      <div class="t-value">${big ? `${big.pct > 0 ? "▲" : "▼"} ${Math.abs(big.pct).toFixed(1)}%` : "—"}</div>
      <div class="t-sub">${big ? esc(big.name) : "collecting data"}</div>
    </div>`;
}

function renderSetValueChart(analytics) {
  const rows = [
    ...analytics.pokemon.sets.map(s => ({ ...s, game: "pokemon" })),
    ...analytics.onepiece.sets.map(s => ({ ...s, game: "onepiece" })),
  ].sort((a, b) => b.totalValue - a.totalValue);

  new Chart(document.getElementById("chart-setvalue"), {
    type: "bar",
    data: {
      labels: rows.map(r => r.name),
      datasets: [{ data: rows.map(r => r.totalValue),
        backgroundColor: rows.map(r => r.game === "pokemon" ? "#ffcb05" : "#e63946"),
        borderRadius: 6 }],
    },
    options: {
      indexAxis: "y", maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${usd(c.raw)} · ${GAME_LABEL[rows[c.dataIndex].game]} · ${rows[c.dataIndex].pricedCards} cards` } },
      },
      scales: { x: { ticks: { callback: v => usd(v) } } },
    },
  });
}

function renderHistoryChart(analytics) {
  const hist = analytics.valueHistory;
  if (hist.length < 2) {
    document.getElementById("history-sub").textContent =
      `First snapshot recorded ${hist[0]?.date ?? "today"} — line chart appears once there are two days of data. Check back tomorrow.`;
    document.getElementById("chart-history").closest(".chart-wrap").style.display = "none";
    return;
  }
  const setIds = new Set();
  hist.forEach(row => {
    Object.keys(row.pokemon).forEach(id => setIds.add("pokemon:" + id));
    Object.keys(row.onepiece).forEach(id => setIds.add("onepiece:" + id));
  });
  const nameOf = key => {
    const [game, id] = key.split(":");
    if (!analytics[game]) return id;
    return (analytics[game].sets.find(s => s.id === id)?.name ?? id) + (game === "onepiece" ? " (OP)" : "");
  };
  const datasets = [...setIds].map((key, i) => {
    const [game, id] = key.split(":");
    if (!analytics[game]) return null;
    return { label: nameOf(key), data: hist.map(row => row[game][id] ?? null),
      borderColor: SERIES_COLORS[i % SERIES_COLORS.length], backgroundColor: "transparent",
      tension: 0.25, spanGaps: true };
  });
  new Chart(document.getElementById("chart-history"), {
    type: "line",
    data: { labels: hist.map(r => r.date), datasets: datasets.filter(Boolean) },
    options: {
      maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${usd(c.raw)}` } } },
      scales: { y: { ticks: { callback: v => usd(v) } } },
    },
  });
}

/* Normalized % growth chart — all sets baseline at 0%, shows relative gains/losses. */
function renderGrowthChart(analytics) {
  const panel = document.getElementById("growth-panel");
  if (!panel) return;
  const hist = analytics.valueHistory ?? [];
  if (hist.length < 2) {
    const sub = panel.querySelector(".panel-sub");
    if (sub) sub.textContent = "Growth comparisons appear once two daily snapshots exist. Check back tomorrow.";
    const wrap = panel.querySelector(".chart-wrap");
    if (wrap) wrap.style.display = "none";
    return;
  }
  const allKeys = new Set();
  hist.forEach(d => {
    Object.keys(d.pokemon ?? {}).forEach(id => allKeys.add("pokemon:" + id));
    Object.keys(d.onepiece ?? {}).forEach(id => allKeys.add("onepiece:" + id));
  });
  const nameOf = (game, id) =>
    (analytics[game]?.sets.find(s => s.id === id)?.name ?? id) + (game === "onepiece" ? " (OP)" : "");

  const datasets = [...allKeys].map((key, i) => {
    const [game, id] = key.split(":");
    const vals = hist.map(d => (game === "pokemon" ? d.pokemon : d.onepiece)?.[id] ?? null);
    const firstVal = vals.find(v => v != null);
    if (!firstVal || vals.filter(v => v != null).length < 2) return null;
    const lastVal = [...vals].reverse().find(v => v != null);
    const totalPct = ((lastVal - firstVal) / firstVal) * 100;
    return {
      label: `${nameOf(game, id)} (${totalPct >= 0 ? "+" : ""}${totalPct.toFixed(1)}%)`,
      data: vals.map(v => v != null ? +((v - firstVal) / firstVal * 100).toFixed(3) : null),
      borderColor: SERIES_COLORS[i % SERIES_COLORS.length],
      backgroundColor: "transparent",
      tension: 0.35, spanGaps: true,
      pointRadius: hist.length <= 14 ? 4 : 2, pointHoverRadius: 8, borderWidth: 2.5,
    };
  }).filter(Boolean);

  if (!datasets.length) { panel.style.display = "none"; return; }

  new Chart(document.getElementById("chart-growth"), {
    type: "line",
    data: { labels: hist.map(r => r.date), datasets },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, padding: 14, font: { size: 11 } } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label.replace(/ \(.*\)$/, "")}: ${c.raw >= 0 ? "+" : ""}${c.raw?.toFixed(2)}%` } },
      },
      scales: {
        y: { ticks: { callback: v => (v >= 0 ? "+" : "") + Number(v).toFixed(0) + "%", font: { size: 10 } }, grid: { color: "rgba(151,160,200,0.08)" } },
        x: { ticks: { font: { size: 10 }, maxTicksLimit: 8 }, grid: { display: false } },
      },
    },
  });
}

function renderTrendChart(analytics) {
  const sets = analytics.pokemon.sets.filter(s => s.cardmarket);
  const panel = document.getElementById("chart-trend").closest(".panel");
  if (!sets.length) { panel.style.display = "none"; return; }
  new Chart(document.getElementById("chart-trend"), {
    type: "line",
    data: {
      labels: ["30-day avg", "7-day avg", "1-day avg"],
      datasets: sets.map((s, i) => ({ label: s.name,
        data: [s.cardmarket.avg30, s.cardmarket.avg7, s.cardmarket.avg1],
        borderColor: SERIES_COLORS[i % SERIES_COLORS.length], backgroundColor: "transparent", tension: 0.25 })),
    },
    options: {
      maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${usd(c.raw)}` } } },
      scales: { y: { ticks: { callback: v => usd(v) } } },
    },
  });
}

function renderSpreadPanel(analytics) {
  const panel = document.getElementById("spread-panel");
  const rows = [
    ...analytics.pokemon.sets.filter(s => s.spread).map(s => ({ ...s, game: "pokemon" })),
    ...analytics.onepiece.sets.filter(s => s.spread).map(s => ({ ...s, game: "onepiece" })),
  ].sort((a, b) => b.spread.median - a.spread.median);
  if (!rows.length) { panel.style.display = "none"; return; }

  new Chart(document.getElementById("chart-spread"), {
    type: "bar",
    data: {
      labels: rows.map(r => r.name),
      datasets: [{ data: rows.map(r => r.spread.median * 100),
        backgroundColor: rows.map(r => r.game === "pokemon" ? "#ffcb05" : "#e63946"),
        borderRadius: 6 }],
    },
    options: {
      indexAxis: "y", maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` median lowest listing = ${c.raw.toFixed(1)}% of market (${rows[c.dataIndex].spread.cards} cards)` } },
      },
      scales: { x: { ticks: { callback: v => v + "%" } } },
    },
  });

  const tight = rows.flatMap(r => r.spread.tightest.map(t => ({ ...t, set: r.name, game: r.game })))
    .sort((a, b) => b.ratio - a.ratio).slice(0, 10);
  document.querySelector("#tight-table tbody").innerHTML = tight.map(t => `
    <tr class="detail-row" data-kind="tight" data-name="${esc(t.name)}">
      <td class="cell-card"><img loading="lazy" src="${esc(t.image)}" alt="" />${esc(t.name)}</td>
      <td>${esc(t.set)}</td>
      <td>${usd(t.market)}</td>
      <td>${usd(t.low)}</td>
      <td><b>${(t.ratio * 100).toFixed(0)}%</b></td>
      <td><button class="btn btn-ghost btn-sm" type="button">Details</button></td>
    </tr>`).join("");
  document.querySelectorAll("#tight-table .detail-row").forEach((row, i) =>
    row.addEventListener("click", () => openAnalyticsCard(tight[i])));
}

function renderMoversTable(movers) {
  const tbody = document.querySelector("#movers-table tbody");
  const badge = document.getElementById("movers-badge");
  const sub = document.getElementById("movers-sub");
  let rows, fmt;
  if (movers?.ready) {
    rows = [...movers.pokemon.map(m => ({ ...m, game: "Pokémon", currency: "USD" })),
            ...movers.onepiece.map(m => ({ ...m, game: "One Piece", currency: "USD" }))]
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    fmt = usd;
    badge.textContent = `TCGplayer $, ${movers.from} → ${movers.to}`;
    sub.textContent = "Day-over-day TCGplayer market price changes across tracked sets.";
  } else if (movers?.interim?.pokemon?.length) {
    rows = movers.interim.pokemon.map(m => ({ ...m, game: "Pokémon", currency: "USD" }));
    fmt = usd;
    badge.textContent = "Cardmarket → USD, 1d vs 7d avg";
    sub.textContent = `Cardmarket rolling-average moves in ${movers.interim.setName} (converted to USD). TCGplayer day-over-day moves appear once two daily snapshots exist.`;
  } else {
    sub.textContent = "First snapshot recorded today — movers appear within 24 hours.";
    return;
  }
  tbody.innerHTML = rows.map(m => `
    <tr class="detail-row">
      <td class="cell-card"><img loading="lazy" src="${esc(m.image)}" alt="" />${esc(m.name)}</td>
      <td>${esc(m.sub.split("·")[0].trim())}</td>
      <td>${fmt(m.old)}</td>
      <td>${fmt(m.new)}</td>
      <td><span class="delta ${m.pct >= 0 ? "up" : "down"}">${m.pct >= 0 ? "▲" : "▼"} ${Math.abs(m.pct).toFixed(1)}%</span></td>
      <td><button class="btn btn-ghost btn-sm" type="button">Details</button></td>
    </tr>`).join("");
  tbody.querySelectorAll(".detail-row").forEach((row, i) =>
    row.addEventListener("click", () => openAnalyticsCard({ ...rows[i], market: rows[i].new })));
}

function renderSetsTable(analytics) {
  const rows = [
    ...analytics.pokemon.sets.map(s => ({ ...s, game: "Pokémon" })),
    ...analytics.onepiece.sets.map(s => ({ ...s, game: "One Piece" })),
  ].sort((a, b) => b.totalValue - a.totalValue);
  document.querySelector("#sets-table tbody").innerHTML = rows.map(s => `
    <tr>
      <td>${esc(s.name)}${s.releaseDate ? ` <small class="muted">${esc(s.releaseDate)}</small>` : ""}</td>
      <td>${esc(s.game)}</td>
      <td>${s.pricedCards}</td>
      <td><b>${usd(s.totalValue)}</b></td>
      <td>${usd(s.avgValue)}</td>
      <td class="cell-card"><img loading="lazy" src="${esc(s.topCard.image)}" alt="" />${esc(s.topCard.name)} · <b>${usd(s.topCard.price)}</b></td>
    </tr>`).join("");
}

/* Pack EV rankings — all tracked sets sorted by estimated pack EV vs MSRP. */
function renderPackEvRankings(analytics) {
  const tbody = document.querySelector("#pack-ev-table tbody");
  if (!tbody) return;
  const rows = [
    ...analytics.pokemon.sets.map(s => ({ ...s, game: "Pokémon" })),
    ...analytics.onepiece.sets.map(s => ({ ...s, game: "One Piece" })),
  ].map(s => ({ ...s, packEV: s.pricedCards > 0 ? (s.totalValue * 10) / s.pricedCards : 0 }))
   .sort((a, b) => (b.packEV / PACK_COST) - (a.packEV / PACK_COST));

  tbody.innerHTML = rows.map((s, i) => {
    const ratio = s.packEV / PACK_COST;
    const cls = ratio >= 1.5 ? "ev-good" : ratio >= 1.0 ? "ev-ok" : "ev-bad";
    return `<tr>
      <td class="muted">${i + 1}</td>
      <td>${esc(s.name)}${s.releaseDate ? ` <small class="muted">${esc(s.releaseDate)}</small>` : ""}</td>
      <td>${esc(s.game)}</td>
      <td>${usd(s.totalValue)}</td>
      <td><b>${usd(s.packEV)}</b></td>
      <td><span class="ev-ratio ${cls}">${ratio.toFixed(1)}×</span></td>
      <td class="cell-card">${s.topCard?.image ? `<img loading="lazy" src="${esc(s.topCard.image)}" alt="" />` : ""}${esc(s.topCard?.name ?? "—")} · <b>${usd(s.topCard?.price ?? 0)}</b></td>
    </tr>`;
  }).join("");
}

function openAnalyticsCard(card) {
  openModal(`
    <div><img class="art" src="${esc(card.image ?? card.topCard?.image ?? "")}" alt="${esc(card.name ?? card.topCard?.name ?? "")}" /></div>
    <div>
      <h2>${esc(card.name ?? card.topCard?.name ?? "Card details")}</h2>
      <div class="meta">${esc(card.set ?? card.sub ?? "")}</div>
      <div class="detail-grid">
        ${detailStat("Game", GAME_LABEL[card.game] ?? card.game)}
        ${detailStat("Market", card.market != null ? usd(card.market) : null)}
        ${detailStat("Lowest listing", card.low != null ? usd(card.low) : null)}
        ${detailStat("Listing / market", card.ratio != null ? `${(card.ratio * 100).toFixed(0)}%` : null)}
        ${detailStat("Previous", card.old != null ? usd(card.old) : null)}
        ${detailStat("Current", card.new != null ? usd(card.new) : null)}
        ${detailStat("Change", card.pct != null ? `${card.pct >= 0 ? "▲" : "▼"} ${Math.abs(card.pct).toFixed(1)}%` : null)}
      </div>
      ${localMarketNote("PokeSnipr analytics snapshots")}
    </div>`);
}

(async () => {
  try {
    const [analytics, movers] = await Promise.all([
      getData("data/analytics.json"),
      getData("data/movers.json").catch(() => null),
    ]);
    baseChartOpts();
    document.getElementById("updated").textContent =
      `Data refreshed ${analytics.updated.replace("T", " ").slice(0, 16)} UTC · auto-updates every 6 hours.`;
    renderTiles(analytics, movers);
    renderSetValueChart(analytics);
    renderHistoryChart(analytics);
    renderGrowthChart(analytics);
    renderTrendChart(analytics);
    renderSpreadPanel(analytics);
    renderMoversTable(movers);
    renderSetsTable(analytics);
    renderPackEvRankings(analytics);
  } catch (err) {
    document.getElementById("updated").textContent =
      "Analytics data unavailable — the auto-refresh job hasn't run yet.";
    console.error(err);
  }
})();
