/* One Piece browser — data: optcgapi.com (TCGplayer market prices, updated daily). */

const OP_API = "https://optcgapi.com/api";

const setSelect = document.getElementById("set-select");
const searchEl = document.getElementById("search");
const sortSelect = document.getElementById("sort-select");
const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const updatedEl = document.getElementById("price-updated");

let cards = [];

async function opFetch(path) {
  const res = await fetch(`${OP_API}${path}`);
  if (!res.ok) throw new Error(`OPTCG API error ${res.status}`);
  return res.json();
}

function price(card) {
  const n = parseFloat(card.market_price);
  return isNaN(n) ? null : n;
}

function cardLi(card) {
  const p = price(card);
  const li = document.createElement("li");
  li.className = "tcard";
  li.innerHTML = `
    <img loading="lazy" src="${esc(card.card_image)}" alt="${esc(card.card_name)}" />
    <div class="name">${esc(card.card_name)}</div>
    <div class="meta">${esc(card.set_name)} · ${esc(card.card_set_id)} · ${esc(card.card_color ?? "")}</div>
    <div class="pricebar">
      <span class="price">${usd(p)}</span>
      <span class="rarity">${esc(card.rarity ?? "—")}</span>
    </div>`;
  li.addEventListener("click", () => openCard(card));
  return li;
}

function render() {
  grid.innerHTML = "";
  const q = searchEl.value.trim().toLowerCase();
  let view = cards.filter(
    (c) =>
      !q ||
      c.card_name.toLowerCase().includes(q) ||
      (c.card_set_id ?? "").toLowerCase().includes(q)
  );

  const sort = sortSelect.value;
  if (sort === "price-desc") view.sort((a, b) => (price(b) ?? -1) - (price(a) ?? -1));
  else if (sort === "price-asc") view.sort((a, b) => (price(a) ?? 1e9) - (price(b) ?? 1e9));
  else if (sort === "name") view.sort((a, b) => a.card_name.localeCompare(b.card_name));
  else view.sort((a, b) => (a.card_set_id ?? "").localeCompare(b.card_set_id ?? ""));

  view.forEach((c) => grid.appendChild(cardLi(c)));
  statusEl.textContent = view.length === 0 ? "No cards match." : "";

  const scraped = cards.find((c) => c.date_scraped)?.date_scraped;
  updatedEl.textContent = scraped
    ? `TCGplayer market prices updated ${scraped} · ${cards.length} cards in set`
    : "";
}

function openCard(card) {
  const p = price(card);
  const inv = parseFloat(card.inventory_price);
  // Names embed suffixes like "(OP15-118) (Manga)" — strip them so the
  // TCGplayer search query stays clean.
  const cleanName = card.card_name.replace(/\s*\([^)]*\)/g, "").trim();
  const buyUrl = TCGP_SEARCH.onepiece(`${cleanName} ${card.card_set_id}`);

  openModal(`
    <div><img class="art" src="${esc(card.card_image)}" alt="${esc(card.card_name)}" /></div>
    <div>
      <h2>${esc(card.card_name)}</h2>
      <div class="meta">
        ${esc(card.set_name)} · ${esc(card.card_set_id)} · ${esc(card.rarity ?? "")} ·
        ${esc(card.card_type ?? "")} ${card.card_color ? "· " + esc(card.card_color) : ""}
      </div>
      <table class="price-table">
        <thead><tr><th>TCGplayer (USD)</th><th>Market</th><th>Listed (low)</th></tr></thead>
        <tbody><tr>
          <td>${esc(card.card_set_id)}</td>
          <td class="mkt">${usd(p)}</td>
          <td>${isNaN(inv) ? "—" : usd(inv)}</td>
        </tr></tbody>
      </table>
      <div class="note">Updated ${esc(card.date_scraped ?? "")} · source: TCGplayer via OPTCG API</div>
      ${card.card_text ? `<p style="font-size:0.85rem">${esc(card.card_text)}</p>` : ""}
      <div class="trend-row">
        ${card.card_cost != null ? `<span class="t">Cost<b>${esc(card.card_cost)}</b></span>` : ""}
        ${card.card_power ? `<span class="t">Power<b>${esc(card.card_power)}</b></span>` : ""}
        ${card.counter_amount != null ? `<span class="t">Counter<b>${esc(card.counter_amount)}</b></span>` : ""}
        ${card.attribute ? `<span class="t">Attribute<b>${esc(card.attribute)}</b></span>` : ""}
      </div>
      <div class="buy-row">
        <a class="btn btn-buy" href="${esc(buyUrl)}" target="_blank" rel="noopener">Buy on TCGplayer</a>
      </div>
    </div>
  `);
}

async function loadSet(setId) {
  statusEl.textContent = "Loading cards…";
  grid.innerHTML = "";
  updatedEl.textContent = "";
  try {
    cards = await opFetch(`/sets/${encodeURIComponent(setId)}/`);
    render();
  } catch (err) {
    statusEl.textContent = "Couldn't reach the OPTCG API — please try again in a moment.";
    console.error(err);
  }
}

async function init() {
  try {
    const sets = await opFetch("/allSets/");
    // Newest main sets first: OP-XX descending, then EB/PRB/starter decks.
    const rank = (s) => {
      const m = s.set_id.match(/^([A-Z]+)-?(\d+)/) ?? [];
      const family = { OP: 3, EB: 2, PRB: 2, ST: 1 }[m[1]] ?? 0;
      return family * 1000 + (parseInt(m[2]) || 0);
    };
    sets.sort((a, b) => rank(b) - rank(a));
    setSelect.innerHTML = sets
      .map((s) => `<option value="${esc(s.set_id)}">${esc(s.set_name)} (${esc(s.set_id)})</option>`)
      .join("");
    await loadSet(sets[0].set_id);
  } catch (err) {
    statusEl.textContent = "Couldn't load sets — please refresh.";
    console.error(err);
  }
}

setSelect.addEventListener("change", () => loadSet(setSelect.value));
searchEl.addEventListener("input", debounce(render, 200));
sortSelect.addEventListener("change", render);

init();
