/* Dashboard — featured cards and movers for both games. */

const PK_API = "https://api.pokemontcg.io/v2";
const OP_API = "https://optcgapi.com/api";

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function pkBestPrice(card) {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;
  const variants = Object.values(prices);
  if (!variants.length) return null;
  return variants.reduce((best, p) => ((p.market ?? 0) > (best.market ?? 0) ? p : best));
}

function miniCard({ img, name, sub, priceText, onClick }) {
  const div = document.createElement("div");
  div.className = `mini-card ${rarityClass(`${name} ${sub}`)}`.trim();
  div.innerHTML = `
    <img loading="lazy" decoding="async" src="${esc(hiResImage(img))}" alt="${esc(name)}" />
    <div class="name" title="${esc(name)}">${esc(name)}</div>
    <div class="price">${esc(priceText)}</div>
    <div class="meta" style="font-size:0.7rem;color:var(--muted)">${esc(sub)}</div>`;
  div.addEventListener("click", onClick);
  return div;
}

function pkModal(card) {
  const p = pkBestPrice(card);
  const cm = card.cardmarket?.prices;
  openModal(`
    <div><img class="art" src="${esc(hiResImage(card.images.large || card.images.small))}" alt="${esc(card.name)}" /></div>
    <div>
      <h2>${esc(card.name)}</h2>
      <div class="meta">${esc(card.set.name)} · #${esc(card.number)} · ${esc(card.rarity ?? "")}</div>
      <div class="detail-grid">
        ${detailStat("Set", card.set?.name)}
        ${detailStat("Number", `#${card.number}/${card.set?.printedTotal ?? "?"}`)}
        ${detailStat("Rarity", card.rarity)}
        ${detailStat("Artist", card.artist)}
        ${detailStat("Types", card.types?.join(", "))}
        ${detailStat("Release", card.set?.releaseDate)}
      </div>
      ${p ? `
        <div class="trend-row">
          <span class="t">TCGplayer market<b>${usd(p.market)}</b></span>
          <span class="t">Low<b>${usd(p.low)}</b></span>
          <span class="t">High<b>${usd(p.high)}</b></span>
        </div>
        ${localMarketNote("Pokémon TCG API and TCGplayer market feeds", card.tcgplayer?.updatedAt)}` : ""}
      ${cm ? `
        <div class="trend-row">
          <span class="t">CM 1-day avg<b>${eurUsd(cm.avg1)}</b></span>
          <span class="t">CM 7-day avg<b>${eurUsd(cm.avg7)}</b></span>
          <span class="t">CM 30-day avg<b>${eurUsd(cm.avg30)}</b></span>
        </div>` : ""}
    </div>`);
}

function opModal(card) {
  openModal(`
    <div><img class="art" src="${esc(hiResImage(card.card_image))}" alt="${esc(card.card_name)}" /></div>
    <div>
      <h2>${esc(card.card_name)}</h2>
      <div class="meta">${esc(card.set_name)} · ${esc(card.card_set_id)} · ${esc(card.rarity ?? "")}</div>
      <div class="detail-grid">
        ${detailStat("Set", card.set_name)}
        ${detailStat("Card ID", card.card_set_id)}
        ${detailStat("Rarity", card.rarity)}
        ${detailStat("Type", card.card_type)}
        ${detailStat("Color", card.card_color)}
        ${detailStat("Cost", card.card_cost)}
        ${detailStat("Power", card.card_power)}
        ${detailStat("Counter", card.counter_amount)}
        ${detailStat("Attribute", card.attribute)}
      </div>
      <div class="trend-row">
        <span class="t">TCGplayer market<b>${usd(parseFloat(card.market_price))}</b></span>
        <span class="t">Listed (low)<b>${usd(parseFloat(card.inventory_price))}</b></span>
      </div>
      ${card.card_text ? `<p class="card-text">${esc(card.card_text)}</p>` : ""}
      ${localMarketNote("OPTCG API and TCGplayer market feeds", card.date_scraped)}
    </div>`);
}

function cachedCardModal(card, game) {
  const isPokemon = game === "pokemon";
  openModal(`
    <div><img class="art" src="${esc(hiResImage(card.image))}" alt="${esc(card.name)}" /></div>
    <div>
      <h2>${esc(card.name)}</h2>
      <div class="meta">${esc(card.sub ?? "")}</div>
      <div class="detail-grid">
        ${detailStat("Game", isPokemon ? "Pokémon" : "One Piece")}
        ${detailStat("Card ID", card.id)}
        ${detailStat("Market price", card.priceText ?? usd(card.price))}
        ${detailStat("Tracked from", card.sub)}
      </div>
      <p class="card-text">This card is from the local featured snapshot. Open the ${isPokemon ? "Pokémon" : "One Piece"} browser for the full set view and live searchable card data.</p>
      ${localMarketNote(isPokemon ? "cached Pokémon TCG API data" : "cached OPTCG API data")}
    </div>`);
}

/* TCGplayer day-over-day movers, cached by the scheduled GitHub Action.
 * Until two daily snapshots exist, the dashboard falls back to Cardmarket
 * rolling averages (also real historical data, just EUR). */
async function loadSnapshotMovers() {
  try {
    const res = await fetch("data/movers.json", { cache: "no-cache" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* Renders movers.json (TCGplayer day-over-day when ready, otherwise the
 * Action-computed Cardmarket interim list). Returns true if it rendered. */
function renderSnapshotMovers(moversEl, data) {
  const panel = moversEl.closest(".panel");
  let items, fmt;
  if (data.ready) {
    items = [
      ...data.pokemon.map((m) => ({ ...m, game: "pokemon", currency: "USD" })),
      ...data.onepiece.map((m) => ({ ...m, game: "onepiece", currency: "USD" })),
    ]
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
      .slice(0, 12);
    fmt = usd;
    panel.querySelector(".badge").textContent = `TCGplayer $, ${data.from} → ${data.to}`;
    panel.querySelector(".panel-sub").textContent =
      "Day-over-day TCGplayer market price changes in the newest Pokémon and One Piece sets.";
  } else if (data.interim?.pokemon?.length) {
    items = data.interim.pokemon.map((m) => ({ ...m, game: "pokemon", currency: "USD" }));
    fmt = usd;
    panel.querySelector(".badge").textContent = "Cardmarket → USD, 1d vs 7d avg";
    panel.querySelector(".panel-sub").textContent =
      `Cardmarket rolling-average moves in ${data.interim.setName} (converted to USD). ` +
      "TCGplayer day-over-day moves appear once two daily snapshots exist.";
  } else {
    moversEl.innerHTML =
      "<p class='panel-sub'>First price snapshot recorded today — day-over-day moves appear within 24 hours.</p>";
    return true;
  }

  moversEl.innerHTML = items.length ? "" : "<p class='panel-sub'>No significant moves today.</p>";
  items.forEach((m) => {
    const div = document.createElement("div");
    div.className = "mover";
    div.innerHTML = `
      <img loading="lazy" src="${esc(m.image)}" alt="${esc(m.name)}" />
      <span class="m-name">${esc(m.name)}<small>${esc(m.sub)} · ${fmt(m.old)} → ${fmt(m.new)}</small></span>
      <span class="delta ${m.pct >= 0 ? "up" : "down"}">${m.pct >= 0 ? "▲" : "▼"} ${Math.abs(m.pct).toFixed(1)}%</span>`;
    div.addEventListener("click", () => cachedCardModal({
      id: m.id,
      name: m.name,
      image: m.image,
      sub: m.sub,
      price: m.new,
      priceText: fmt(m.new),
    }, m.game ?? "pokemon"));
    moversEl.appendChild(div);
  });
  return true;
}

/* Cached featured cards written by the GitHub Action — instant render,
 * no API round-trips. */
async function loadFeaturedCache() {
  try {
    const res = await fetch("data/featured.json", { cache: "no-cache" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.pokemon?.cards?.length && data.onepiece?.cards?.length ? data : null;
  } catch {
    return null;
  }
}

async function loadSealedCache() {
  try {
    const res = await fetch("data/sealed.json", { cache: "no-cache" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function stripHtml(html) {
  const doc = new DOMParser().parseFromString(String(html ?? ""), "text/html");
  return doc.body.textContent.replace(/\s+/g, " ").trim();
}

function sealedModal(product) {
  openModal(`
    <div><img class="art sealed-art" src="${esc(hiResImage(product.image || product.imageThumb))}" alt="${esc(product.name)}" /></div>
    <div>
      <h2>${esc(product.name)}</h2>
      <div class="meta">${esc(product.set)} · ${esc(product.type)}</div>
      <div class="detail-grid">
        ${detailStat("Game", product.game)}
        ${detailStat("Product type", product.type)}
        ${detailStat("Set", product.set)}
        ${detailStat("Release", product.releaseDate)}
        ${detailStat("Market", usd(product.market))}
        ${detailStat("Low", usd(product.low))}
        ${detailStat("Mid", usd(product.mid))}
        ${detailStat("High", usd(product.high))}
      </div>
      ${product.description ? `<p class="card-text">${esc(stripHtml(product.description))}</p>` : ""}
      ${localMarketNote("TCGCSV daily TCGplayer catalog export", product.modifiedOn?.slice(0, 10))}
    </div>`);
}

function renderCachedRow(el, cards, game) {
  el.innerHTML = "";
  cards.forEach((c) =>
    el.appendChild(miniCard({
      img: c.image,
      name: c.name,
      sub: c.sub,
      priceText: usd(c.price),
      onClick: () => cachedCardModal(c, game),
    }))
  );
}

function renderSealedRow(data) {
  const label = document.getElementById("sealed-label");
  const el = document.getElementById("sealed-featured");
  if (!label || !el) return;
  if (!data) {
    label.textContent = "Sealed product data is being collected.";
    return;
  }
  const rows = [...(data.pokemon ?? []), ...(data.onepiece ?? [])]
    .sort((a, b) => (b.market ?? 0) - (a.market ?? 0))
    .slice(0, 14);
  label.textContent = `Cached ${rows.length} top products from ${data.source}.`;
  el.innerHTML = "";
  rows.forEach((p) => el.appendChild(miniCard({
    img: p.image || p.imageThumb,
    name: p.name,
    sub: `${p.game} · ${p.type}`,
    priceText: usd(p.market),
    onClick: () => sealedModal(p),
  })));
}

async function loadPokemonPanels(cache) {
  const featuredEl = document.getElementById("pk-featured");
  const moversEl = document.getElementById("pk-movers");
  const label = document.getElementById("pk-set-label");
  const moversData = await loadSnapshotMovers();
  const moversRendered = moversData ? renderSnapshotMovers(moversEl, moversData) : false;

  if (cache) {
    const pk = cache.pokemon;
    label.textContent = pk.set.releaseDate
      ? `${pk.set.name} — released ${pk.set.releaseDate}`
      : pk.set.name;
    renderCachedRow(featuredEl, pk.cards, "pokemon");
    document.getElementById("freshness").textContent =
      `Prices cached ${cache.updated.slice(0, 10)} · refreshed automatically every 6 hours.`;
    if (!moversRendered) {
      moversEl.innerHTML =
        "<p class='panel-sub'>Price-move data is being collected — check back soon.</p>";
    }
    return;
  }

  // No cached data (e.g. fresh clone before the Action has run): fall back to
  // the live API. Brand-new sets can predate TCGplayer pricing, so probe.
  try {
    const sets = await getJSON(`${PK_API}/sets?orderBy=-releaseDate&pageSize=5`);
    let set = null;
    let cards = [];
    for (const candidate of sets.data) {
      const res = await getJSON(
        `${PK_API}/cards?q=${encodeURIComponent(`set.id:${candidate.id}`)}&pageSize=250&select=id,name,number,rarity,images,set,tcgplayer,cardmarket`
      );
      if (res.data.some((c) => pkBestPrice(c)?.market)) {
        set = candidate;
        cards = res.data;
        break;
      }
    }
    if (!set) throw new Error("no recent set with prices");
    label.textContent = `${set.name} — released ${set.releaseDate}`;

    const byValue = [...cards]
      .filter((c) => pkBestPrice(c)?.market)
      .sort((a, b) => pkBestPrice(b).market - pkBestPrice(a).market)
      .slice(0, 12);
    featuredEl.innerHTML = "";
    byValue.forEach((c) =>
      featuredEl.appendChild(miniCard({
        img: c.images.small,
        name: c.name,
        sub: `#${c.number} · ${c.rarity ?? ""}`,
        priceText: usd(pkBestPrice(c).market),
        onClick: () => pkModal(c),
      }))
    );

    const updated = cards.find((c) => c.tcgplayer?.updatedAt)?.tcgplayer.updatedAt;
    if (updated) {
      document.getElementById("freshness").textContent =
        `TCGplayer prices last updated ${updated}.`;
    }

    if (!moversRendered) renderCardmarketMovers(moversEl, cards);
  } catch (err) {
    label.textContent = "Pokémon data temporarily unavailable — please refresh.";
    console.error(err);
  }
}

function renderCardmarketMovers(moversEl, cards) {
    const movers = cards
      .map((c) => {
        const cm = c.cardmarket?.prices;
        if (!cm?.avg1 || !cm?.avg7 || cm.avg7 < 2) return null; // skip bulk noise
        return { card: c, pct: ((cm.avg1 - cm.avg7) / cm.avg7) * 100, avg1: cm.avg1, avg7: cm.avg7 };
      })
      .filter(Boolean)
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
      .slice(0, 9);

    moversEl.innerHTML = movers.length ? "" : "<p class='panel-sub'>No significant moves today.</p>";
    movers.forEach(({ card, pct, avg1, avg7 }) => {
      const div = document.createElement("div");
      div.className = "mover";
      div.innerHTML = `
        <img loading="lazy" src="${esc(card.images.small)}" alt="${esc(card.name)}" />
        <span class="m-name">${esc(card.name)}<small>${eurUsd(avg7)} → ${eurUsd(avg1)}</small></span>
        <span class="delta ${pct >= 0 ? "up" : "down"}">${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%</span>`;
      div.addEventListener("click", () => pkModal(card));
      moversEl.appendChild(div);
    });
}

async function loadOnePiecePanel(cache) {
  const featuredEl = document.getElementById("op-featured");
  const label = document.getElementById("op-set-label");
  if (cache) {
    label.textContent = `${cache.onepiece.set.name} (${cache.onepiece.set.id})`;
    renderCachedRow(featuredEl, cache.onepiece.cards, "onepiece");
    return;
  }
  try {
    const sets = await getJSON(`${OP_API}/allSets/`);
    const main = sets
      .filter((s) => /^OP-\d+/.test(s.set_id))
      .sort((a, b) => parseInt(b.set_id.slice(3)) - parseInt(a.set_id.slice(3)));
    const set = main[0];
    label.textContent = `${set.set_name} (${set.set_id})`;

    const cards = await getJSON(`${OP_API}/sets/${encodeURIComponent(set.set_id)}/`);
    const top = cards
      .map((c) => ({ c, p: parseFloat(c.market_price) }))
      .filter((x) => !isNaN(x.p))
      .sort((a, b) => b.p - a.p)
      .slice(0, 12);

    featuredEl.innerHTML = "";
    top.forEach(({ c, p }) =>
      featuredEl.appendChild(miniCard({
        img: c.card_image,
        name: c.card_name,
        sub: `${c.card_set_id} · ${c.rarity ?? ""}`,
        priceText: usd(p),
        onClick: () => opModal(c),
      }))
    );
  } catch (err) {
    label.textContent = "One Piece data temporarily unavailable — please refresh.";
    console.error(err);
  }
}

/* ---------- Watchlist panel ---------- */
function renderWatchlist() {
  const panel = document.getElementById("watchlist-panel");
  const box = document.getElementById("watchlist");
  if (!panel || typeof wlAll !== "function") return;
  const list = wlAll();
  panel.hidden = list.length === 0;
  box.innerHTML = list.map((w) => `
    <div class="wl-row" data-game="${esc(w.game)}" data-id="${esc(w.id)}">
      <img loading="lazy" src="${esc(w.image)}" alt="" />
      <span class="m-name">${esc(w.name)}<small>${esc(w.sub)} · added ${esc(w.added)}</small></span>
      <span class="price">${w.price != null ? usd(w.price) : "—"}</span>
      <button class="wl-remove" data-game="${esc(w.game)}" data-id="${esc(w.id)}" aria-label="Remove">✕</button>
    </div>`).join("");
  box.querySelectorAll(".wl-row").forEach((row, i) =>
    row.addEventListener("click", () => cachedCardModal({
      id: list[i].id,
      name: list[i].name,
      image: list[i].image,
      sub: list[i].sub,
      price: list[i].price,
    }, list[i].game)));
  box.querySelectorAll(".wl-remove").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      wlRemove(btn.dataset.game, btn.dataset.id);
      renderWatchlist();
    })
  );
}

document.addEventListener("watchlist-changed", renderWatchlist);

(async () => {
  renderWatchlist();
  const cache = await loadFeaturedCache();
  const sealed = await loadSealedCache();
  loadPokemonPanels(cache);
  loadOnePiecePanel(cache);
  renderSealedRow(sealed);
})();
