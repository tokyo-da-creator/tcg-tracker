/* Markets page — charts and tables fed by data/analytics.json + data/movers.json. */

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const GAME_LABEL = { pokemon: "Pokémon", onepiece: "One Piece" };
const SERIES_COLORS = ["#ffcb05","#3d7dca","#e63946","#3ddc84","#f4a261","#a78bfa","#22d3ee","#fb7185","#84cc16","#eab308","#60a5fa","#f97316"];
const PACK_COST = 5.49;

/* ---------- Helpers ---------- */

async function getData(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

function hexRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function gradFill(color) {
  return (ctx) => {
    const { chart } = ctx;
    if (!chart.chartArea) return "transparent";
    const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
    g.addColorStop(0, hexRgba(color, 0.28));
    g.addColorStop(0.65, hexRgba(color, 0.06));
    g.addColorStop(1, hexRgba(color, 0));
    return g;
  };
}

function animateCount(el, target, fmt, duration = 750) {
  if (!el || isNaN(target) || target <= 0) return;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(target * eased);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = fmt(target);
  };
  requestAnimationFrame(step);
}

/* ---------- Chart defaults ---------- */

function baseChartOpts() {
  Chart.defaults.color = css("--muted");
  Chart.defaults.borderColor = "rgba(151,160,200,0.1)";
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 12;
  Chart.defaults.animation = { duration: 700, easing: "easeOutQuart" };
  Chart.defaults.plugins.tooltip.backgroundColor = "rgba(17,21,42,0.96)";
  Chart.defaults.plugins.tooltip.borderColor = "rgba(42,49,88,0.9)";
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 11;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;
  Chart.defaults.plugins.tooltip.titleFont = { size: 12, weight: "700" };
  Chart.defaults.plugins.tooltip.bodyFont  = { size: 11 };
  Chart.defaults.plugins.tooltip.titleColor = "#edf0ff";
  Chart.defaults.plugins.tooltip.bodyColor  = "#97a0c8";
}

/* ---------- Tiles (with animated count-up) ---------- */

function renderTiles(analytics, movers) {
  const pk = analytics.pokemon.sets;
  const op = analytics.onepiece.sets;
  const pkTotal = pk.reduce((s, x) => s + x.totalValue, 0);
  const opTotal = op.reduce((s, x) => s + x.totalValue, 0);
  const allTops = [...pk, ...op].map(s => s.topCard).filter(Boolean).sort((a, b) => b.price - a.price);
  const topCard = allTops[0] ?? { price: 0, name: "No data yet" };
  const moverList = movers?.ready
    ? [...movers.pokemon, ...movers.onepiece]
    : (movers?.interim?.pokemon ?? []);
  const big = moverList.length
    ? moverList.reduce((a, b) => Math.abs(b.pct) > Math.abs(a.pct) ? b : a)
    : null;

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
      <div class="t-value"><span class="t-num" data-amt="${pkTotal.toFixed(2)}">${usd(pkTotal)}</span> ${dHtml(pkDelta)}</div>
      <div class="t-sub">${pk.length} sets · ${pk.reduce((s, x) => s + x.pricedCards, 0)} priced cards</div>
    </div>
    <div class="tile">
      <div class="t-label">One Piece tracked</div>
      <div class="t-value"><span class="t-num" data-amt="${opTotal.toFixed(2)}">${usd(opTotal)}</span> ${dHtml(opDelta)}</div>
      <div class="t-sub">${op.length} sets · ${op.reduce((s, x) => s + x.pricedCards, 0)} priced cards</div>
    </div>
    <div class="tile">
      <div class="t-label">Most valuable card</div>
      <div class="t-value"><span class="t-num" data-amt="${topCard.price.toFixed(2)}">${usd(topCard.price)}</span></div>
      <div class="t-sub">${esc(topCard.name)}</div>
    </div>
    <div class="tile">
      <div class="t-label">Biggest move</div>
      <div class="t-value">${big ? `${big.pct > 0 ? "▲" : "▼"} ${Math.abs(big.pct).toFixed(1)}%` : "—"}</div>
      <div class="t-sub">${big ? esc(big.name) : "collecting data"}</div>
    </div>`;

  document.querySelectorAll(".t-num[data-amt]").forEach(el => {
    const target = parseFloat(el.dataset.amt);
    animateCount(el, target, usd);
  });
}

/* ---------- Set value bar chart ---------- */

function renderSetValueChart(analytics) {
  const rows = [
    ...analytics.pokemon.sets.map(s => ({ ...s, game: "pokemon" })),
    ...analytics.onepiece.sets.map(s => ({ ...s, game: "onepiece" })),
  ].sort((a, b) => b.totalValue - a.totalValue);

  new Chart(document.getElementById("chart-setvalue"), {
    type: "bar",
    data: {
      labels: rows.map(r => r.name),
      datasets: [{
        data: rows.map(r => r.totalValue),
        backgroundColor: rows.map(r =>
          r.game === "pokemon"
            ? hexRgba("#ffcb05", 0.85)
            : hexRgba("#e63946", 0.85)
        ),
        borderColor: rows.map(r => r.game === "pokemon" ? "#ffcb05" : "#e63946"),
        borderWidth: 1,
        borderRadius: 7,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => ` ${usd(c.raw)} · ${GAME_LABEL[rows[c.dataIndex].game]} · ${rows[c.dataIndex].pricedCards} cards`,
          },
        },
      },
      scales: {
        x: { ticks: { callback: v => usd(v) }, grid: { color: "rgba(151,160,200,0.08)" } },
        y: { grid: { display: false } },
      },
    },
  });
}

/* ---------- Set value history line chart ---------- */

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
    const color = SERIES_COLORS[i % SERIES_COLORS.length];
    return {
      label: nameOf(key),
      data: hist.map(row => row[game][id] ?? null),
      borderColor: color,
      backgroundColor: gradFill(color),
      fill: true,
      tension: 0.3,
      spanGaps: true,
      pointRadius: hist.length <= 14 ? 3 : 1,
      pointHoverRadius: 7,
      borderWidth: 2,
    };
  });
  new Chart(document.getElementById("chart-history"), {
    type: "line",
    data: { labels: hist.map(r => r.date), datasets: datasets.filter(Boolean) },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 11, padding: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${usd(c.raw)}` } },
      },
      scales: {
        y: { ticks: { callback: v => usd(v) }, grid: { color: "rgba(151,160,200,0.07)" } },
        x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } },
      },
      interaction: { mode: "index", intersect: false },
    },
  });
}

/* ---------- Normalized % growth chart ---------- */

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
    const color = SERIES_COLORS[i % SERIES_COLORS.length];
    return {
      label: `${nameOf(game, id)} (${totalPct >= 0 ? "+" : ""}${totalPct.toFixed(1)}%)`,
      data: vals.map(v => v != null ? +((v - firstVal) / firstVal * 100).toFixed(3) : null),
      borderColor: color,
      backgroundColor: gradFill(color),
      fill: true,
      tension: 0.35,
      spanGaps: true,
      pointRadius: hist.length <= 14 ? 4 : 2,
      pointHoverRadius: 8,
      borderWidth: 2.5,
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
        tooltip: {
          callbacks: {
            label: c => ` ${c.dataset.label.replace(/ \(.*\)$/, "")}: ${c.raw >= 0 ? "+" : ""}${c.raw?.toFixed(2)}%`,
          },
        },
      },
      scales: {
        y: {
          ticks: { callback: v => (v >= 0 ? "+" : "") + Number(v).toFixed(0) + "%", font: { size: 10 } },
          grid: { color: "rgba(151,160,200,0.07)" },
        },
        x: { ticks: { font: { size: 10 }, maxTicksLimit: 8 }, grid: { display: false } },
      },
      interaction: { mode: "index", intersect: false },
    },
  });
}

/* ---------- Cardmarket trend chart ---------- */

function renderTrendChart(analytics) {
  const sets = analytics.pokemon.sets.filter(s => s.cardmarket);
  const panel = document.getElementById("chart-trend").closest(".panel");
  if (!sets.length) { panel.style.display = "none"; return; }
  new Chart(document.getElementById("chart-trend"), {
    type: "line",
    data: {
      labels: ["30-day avg", "7-day avg", "1-day avg"],
      datasets: sets.map((s, i) => {
        const color = SERIES_COLORS[i % SERIES_COLORS.length];
        return {
          label: s.name,
          data: [s.cardmarket.avg30, s.cardmarket.avg7, s.cardmarket.avg1],
          borderColor: color,
          backgroundColor: gradFill(color),
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 9,
          borderWidth: 2.5,
        };
      }),
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${usd(c.raw)}` } },
      },
      scales: {
        y: { ticks: { callback: v => usd(v) }, grid: { color: "rgba(151,160,200,0.07)" } },
        x: { grid: { display: false } },
      },
      interaction: { mode: "index", intersect: false },
    },
  });
}

/* ---------- Listing tightness (spread) panel ---------- */

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
      datasets: [{
        data: rows.map(r => r.spread.median * 100),
        backgroundColor: rows.map(r =>
          r.game === "pokemon" ? hexRgba("#ffcb05", 0.8) : hexRgba("#e63946", 0.8)
        ),
        borderColor: rows.map(r => r.game === "pokemon" ? "#ffcb05" : "#e63946"),
        borderWidth: 1,
        borderRadius: 7,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => ` median lowest listing = ${c.raw.toFixed(1)}% of market (${rows[c.dataIndex].spread.cards} cards)`,
          },
        },
      },
      scales: {
        x: { ticks: { callback: v => v + "%" }, grid: { color: "rgba(151,160,200,0.08)" } },
        y: { grid: { display: false } },
      },
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

/* ---------- Biggest movers table ---------- */

function renderMoversTable(movers) {
  const tbody = document.querySelector("#movers-table tbody");
  const badge = document.getElementById("movers-badge");
  const sub   = document.getElementById("movers-sub");
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

/* ---------- Set details table ---------- */

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

/* ---------- Pack EV rankings ---------- */

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

/* ---------- Market Sentiment Gauge ---------- */

function renderSentiment(movers, analytics) {
  const section = document.getElementById("sentiment-section");
  if (!section) return;

  const allMovers = [
    ...(movers?.pokemon ?? []),
    ...(movers?.onepiece ?? []),
    ...(movers?.interim?.pokemon ?? []),
  ];

  let score = 50;
  let upCount = 0, downCount = 0;

  if (allMovers.length > 0) {
    let upW = 0, totalW = 0;
    for (const m of allMovers) {
      const w = Math.abs(m.pct ?? 0) * Math.max(m.new ?? m.price ?? 1, 0.01);
      totalW += w;
      if ((m.pct ?? 0) > 0) { upW += w; upCount++; }
      else downCount++;
    }
    if (totalW > 0) score = Math.round((upW / totalW) * 100);
  } else if ((analytics.valueHistory ?? []).length >= 2) {
    const hist = analytics.valueHistory;
    const prev = hist[hist.length - 2];
    const curr = hist[hist.length - 1];
    let upW = 0, totalW = 0;
    for (const game of ["pokemon", "onepiece"]) {
      for (const id of Object.keys(curr[game] ?? {})) {
        const p = prev[game]?.[id], c = curr[game]?.[id];
        if (p == null || c == null || p === 0) continue;
        const w = Math.abs(c - p);
        totalW += w;
        if (c > p) { upW += w; upCount++; } else downCount++;
      }
    }
    if (totalW > 0) score = Math.round((upW / totalW) * 100);
  }

  const { label, color } = score >= 80
    ? { label: "Extreme Greed", color: "#3ddc84" }
    : score >= 60 ? { label: "Greed",        color: "#84cc16" }
    : score >= 40 ? { label: "Neutral",       color: "#ffcb05" }
    : score >= 20 ? { label: "Fear",          color: "#f4a261" }
    :               { label: "Extreme Fear",  color: "#e63946" };

  /* Needle: score 0 → left, 50 → top, 100 → right */
  const cx = 110, cy = 110, needleR = 75;
  const angleRad = (1 - score / 100) * Math.PI;
  const nx = +(cx + needleR * Math.cos(angleRad)).toFixed(1);
  const ny = +(cy - needleR * Math.sin(angleRad)).toFixed(1);

  const pk = analytics?.pokemon?.sets ?? [];
  const op = analytics?.onepiece?.sets ?? [];

  const ss = (lbl, val, c = "var(--text)") =>
    `<div class="sent-stat"><span class="sent-stat-label">${lbl}</span><span class="sent-stat-val" style="color:${c}">${val}</span></div>`;

  section.innerHTML = `
    <div class="sentiment-card">
      <div class="sentiment-gauge-wrap">
        <svg viewBox="0 0 220 120" class="gauge-svg" role="img" aria-label="Market sentiment ${score} — ${label}">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stop-color="#e63946"/>
              <stop offset="25%"  stop-color="#f4a261"/>
              <stop offset="50%"  stop-color="#ffd700"/>
              <stop offset="75%"  stop-color="#84cc16"/>
              <stop offset="100%" stop-color="#3ddc84"/>
            </linearGradient>
          </defs>
          <!-- Track shadow -->
          <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="rgba(12,15,29,0.9)" stroke-width="20" stroke-linecap="round"/>
          <!-- Background track -->
          <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="rgba(42,49,88,0.7)" stroke-width="16" stroke-linecap="round"/>
          <!-- Gradient arc -->
          <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="url(#gaugeGrad)" stroke-width="13" stroke-linecap="round"/>
          <!-- Zone ticks at 0, 25, 50, 75, 100 -->
          ${[0,25,50,75,100].map(s => {
            const a = (1 - s/100) * Math.PI;
            const ix = (110 + 82 * Math.cos(a)).toFixed(1);
            const iy = (110 - 82 * Math.sin(a)).toFixed(1);
            const ox = (110 + 100 * Math.cos(a)).toFixed(1);
            const oy = (110 - 100 * Math.sin(a)).toFixed(1);
            return `<line x1="${ix}" y1="${iy}" x2="${ox}" y2="${oy}" stroke="rgba(12,15,29,0.85)" stroke-width="2.5"/>`;
          }).join("")}
          <!-- Needle -->
          <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="rgba(255,255,255,0.92)" stroke-width="3" stroke-linecap="round"/>
          <circle cx="${cx}" cy="${cy}" r="7" fill="#0c0f1d" stroke="rgba(255,255,255,0.92)" stroke-width="2.5"/>
          <!-- Edge labels -->
          <text x="12"  y="126" text-anchor="middle" font-size="8.5" fill="#e63946" font-weight="800" font-family="sans-serif">FEAR</text>
          <text x="208" y="126" text-anchor="middle" font-size="8.5" fill="#3ddc84" font-weight="800" font-family="sans-serif">GREED</text>
        </svg>
        <div class="gauge-reading">
          <span class="gauge-score" style="color:${color}">${score}</span>
          <span class="gauge-label" style="color:${color}">${label}</span>
        </div>
      </div>
      <div class="sentiment-stats">
        <div class="sent-label">Market Sentiment</div>
        <div class="sent-sub">Weighted price-move index across ${allMovers.length || (upCount + downCount)} signals · ${pk.length + op.length} sets tracked</div>
        <div class="sent-detail-grid">
          ${ss("▲ Rising cards",  upCount,   "var(--up)")}
          ${ss("▼ Falling cards", downCount, "var(--down)")}
          ${ss("Pokémon sets",    pk.length)}
          ${ss("One Piece sets",  op.length)}
        </div>
      </div>
    </div>`;
}

/* ---------- Analytics card detail modal ---------- */

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

/* ---------- Main ---------- */

(async () => {
  try {
    const [analytics, movers] = await Promise.all([
      getData("data/analytics.json"),
      getData("data/movers.json").catch(() => null),
    ]);
    baseChartOpts();
    document.getElementById("updated").textContent =
      `Data refreshed ${analytics.updated.replace("T", " ").slice(0, 16)} UTC · auto-updates every 6 hours.`;
    renderSentiment(movers, analytics);
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
