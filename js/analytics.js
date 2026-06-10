/* Markets page — charts and tables fed by data/analytics.json + data/movers.json. */

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const GAME_LABEL = { pokemon: "Pokémon", onepiece: "One Piece" };
const SERIES_COLORS = ["#ffcb05", "#3d7dca", "#e63946", "#3ddc84", "#f4a261", "#a78bfa",
                       "#22d3ee", "#fb7185", "#84cc16", "#eab308", "#60a5fa"];

async function getData(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

function tile(label, value, sub) {
  return `<div class="tile"><div class="t-label">${esc(label)}</div>
    <div class="t-value">${esc(value)}</div><div class="t-sub">${esc(sub)}</div></div>`;
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
  const allTops = [...pk, ...op].map((s) => s.topCard).sort((a, b) => b.price - a.price);
  const moverList = movers?.ready ? [...movers.pokemon, ...movers.onepiece]
    : movers?.interim?.pokemon ?? [];
  const big = moverList.length
    ? moverList.reduce((a, b) => (Math.abs(b.pct) > Math.abs(a.pct) ? b : a))
    : null;

  document.getElementById("tiles").innerHTML =
    tile("Pokémon market tracked", usd(pkTotal), `${pk.length} recent sets · ${pk.reduce((s, x) => s + x.pricedCards, 0)} priced cards`) +
    tile("One Piece market tracked", usd(opTotal), `${op.length} recent sets · ${op.reduce((s, x) => s + x.pricedCards, 0)} priced cards`) +
    tile("Most valuable card", usd(allTops[0].price), allTops[0].name) +
    tile("Biggest move", big ? `${big.pct > 0 ? "▲" : "▼"} ${Math.abs(big.pct).toFixed(1)}%` : "—",
      big ? big.name : "collecting data");
}

function renderSetValueChart(analytics) {
  const rows = [
    ...analytics.pokemon.sets.map((s) => ({ ...s, game: "pokemon" })),
    ...analytics.onepiece.sets.map((s) => ({ ...s, game: "onepiece" })),
  ].sort((a, b) => b.totalValue - a.totalValue);

  new Chart(document.getElementById("chart-setvalue"), {
    type: "bar",
    data: {
      labels: rows.map((r) => r.name),
      datasets: [{
        data: rows.map((r) => r.totalValue),
        backgroundColor: rows.map((r) => (r.game === "pokemon" ? "#ffcb05" : "#e63946")),
        borderRadius: 6,
      }],
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => ` ${usd(c.raw)} · ${GAME_LABEL[rows[c.dataIndex].game]} · ${rows[c.dataIndex].pricedCards} cards` } },
      },
      scales: { x: { ticks: { callback: (v) => usd(v) } } },
    },
  });
}

function renderHistoryChart(analytics) {
  const hist = analytics.valueHistory;
  if (hist.length < 2) {
    document.getElementById("history-sub").textContent =
      `First snapshot recorded ${hist[0]?.date ?? "today"} — the line chart appears once there are two days of data. Check back tomorrow.`;
    document.getElementById("chart-history").closest(".chart-wrap").style.display = "none";
    return;
  }
  const setIds = new Set();
  hist.forEach((row) => {
    Object.keys(row.pokemon).forEach((id) => setIds.add("pokemon:" + id));
    Object.keys(row.onepiece).forEach((id) => setIds.add("onepiece:" + id));
  });
  const nameOf = (key) => {
    const [game, id] = key.split(":");
    return (analytics[game].sets.find((s) => s.id === id)?.name ?? id) +
      (game === "onepiece" ? " (OP)" : "");
  };
  const datasets = [...setIds].map((key, i) => {
    const [game, id] = key.split(":");
    return {
      label: nameOf(key),
      data: hist.map((row) => row[game][id] ?? null),
      borderColor: SERIES_COLORS[i % SERIES_COLORS.length],
      backgroundColor: "transparent",
      tension: 0.25,
      spanGaps: true,
    };
  });
  new Chart(document.getElementById("chart-history"), {
    type: "line",
    data: { labels: hist.map((r) => r.date), datasets },
    options: {
      maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${usd(c.raw)}` } } },
      scales: { y: { ticks: { callback: (v) => usd(v) } } },
    },
  });
}

function renderTrendChart(analytics) {
  const sets = analytics.pokemon.sets.filter((s) => s.cardmarket);
  const panel = document.getElementById("chart-trend").closest(".panel");
  if (!sets.length) { panel.style.display = "none"; return; }
  new Chart(document.getElementById("chart-trend"), {
    type: "line",
    data: {
      labels: ["30-day avg", "7-day avg", "1-day avg"],
      datasets: sets.map((s, i) => ({
        label: s.name,
        data: [s.cardmarket.avg30, s.cardmarket.avg7, s.cardmarket.avg1],
        borderColor: SERIES_COLORS[i % SERIES_COLORS.length],
        backgroundColor: "transparent",
        tension: 0.25,
      })),
    },
    options: {
      maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${eur(c.raw)}` } } },
      scales: { y: { ticks: { callback: (v) => eur(v) } } },
    },
  });
}

function renderMoversTable(movers) {
  const tbody = document.querySelector("#movers-table tbody");
  const badge = document.getElementById("movers-badge");
  const sub = document.getElementById("movers-sub");
  let rows, fmt;
  if (movers?.ready) {
    rows = [...movers.pokemon.map((m) => ({ ...m, game: "Pokémon" })),
            ...movers.onepiece.map((m) => ({ ...m, game: "One Piece" }))]
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    fmt = usd;
    badge.textContent = `TCGplayer $, ${movers.from} → ${movers.to}`;
    sub.textContent = "Day-over-day TCGplayer market price changes across tracked sets.";
  } else if (movers?.interim?.pokemon?.length) {
    rows = movers.interim.pokemon.map((m) => ({ ...m, game: "Pokémon" }));
    fmt = eur;
    badge.textContent = "Cardmarket €, 1d vs 7d avg";
    sub.textContent = `Cardmarket rolling-average moves in ${movers.interim.setName}. TCGplayer day-over-day moves appear once two daily snapshots exist.`;
  } else {
    sub.textContent = "First snapshot recorded today — movers appear within 24 hours.";
    return;
  }
  tbody.innerHTML = rows.map((m) => `
    <tr>
      <td class="cell-card"><img loading="lazy" src="${esc(m.image)}" alt="" />${esc(m.name)}</td>
      <td>${esc(m.sub.split("·")[0].trim())}</td>
      <td>${fmt(m.old)}</td>
      <td>${fmt(m.new)}</td>
      <td><span class="delta ${m.pct >= 0 ? "up" : "down"}">${m.pct >= 0 ? "▲" : "▼"} ${Math.abs(m.pct).toFixed(1)}%</span></td>
      <td><a class="btn btn-buy btn-sm" href="${esc(m.buy)}" target="_blank" rel="noopener">Buy</a></td>
    </tr>`).join("");
}

function renderSetsTable(analytics) {
  const rows = [
    ...analytics.pokemon.sets.map((s) => ({ ...s, game: "Pokémon" })),
    ...analytics.onepiece.sets.map((s) => ({ ...s, game: "One Piece" })),
  ].sort((a, b) => b.totalValue - a.totalValue);
  document.querySelector("#sets-table tbody").innerHTML = rows.map((s) => `
    <tr>
      <td>${esc(s.name)}${s.releaseDate ? ` <small class="muted">${esc(s.releaseDate)}</small>` : ""}</td>
      <td>${esc(s.game)}</td>
      <td>${s.pricedCards}</td>
      <td><b>${usd(s.totalValue)}</b></td>
      <td>${usd(s.avgValue)}</td>
      <td class="cell-card"><img loading="lazy" src="${esc(s.topCard.image)}" alt="" />${esc(s.topCard.name)} · <b>${usd(s.topCard.price)}</b></td>
    </tr>`).join("");
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
    renderTrendChart(analytics);
    renderMoversTable(movers);
    renderSetsTable(analytics);
  } catch (err) {
    document.getElementById("updated").textContent =
      "Analytics data unavailable — the auto-refresh job hasn't run yet.";
    console.error(err);
  }
})();
