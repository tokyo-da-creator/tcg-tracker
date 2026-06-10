/* Pokémon browser — data: api.pokemontcg.io v2 (TCGplayer prices + Cardmarket averages). */

const PK_API = "https://api.pokemontcg.io/v2";
const PAGE_SIZE = 24;

const setSelect = document.getElementById("set-select");
const searchEl = document.getElementById("search");
const sortSelect = document.getElementById("sort-select");
const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const updatedEl = document.getElementById("price-updated");
const loadMoreBtn = document.getElementById("load-more");

let mode = "set"; // "set" | "search"
let page = 1;
let totalCount = 0;
let cards = [];

async function pkFetch(path) {
  const res = await fetch(`${PK_API}${path}`);
  if (!res.ok) throw new Error(`Pokémon TCG API error ${res.status}`);
  return res.json();
}

/* Best available TCGplayer price block for a card. */
function bestPrice(card) {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;
  const variants = Object.entries(prices);
  if (!variants.length) return null;
  // Prefer the variant with the highest market price (usually the holo/special print).
  variants.sort((a, b) => (b[1].market ?? 0) - (a[1].market ?? 0));
  const [variant, p] = variants[0];
  return { variant, ...p };
}

function cardLi(card) {
  const p = bestPrice(card);
  const li = document.createElement("li");
  li.className = "tcard";
  li.innerHTML = `
    <img loading="lazy" src="${esc(card.images.small)}" alt="${esc(card.name)}" />
    <div class="name">${esc(card.name)}</div>
    <div class="meta">${esc(card.set.name)} · #${esc(card.number)}/${esc(card.set.printedTotal)}</div>
    <div class="pricebar">
      <span class="price">${p ? usd(p.market ?? p.mid) : "—"}</span>
      <span class="rarity">${esc(card.rarity ?? "—")}</span>
    </div>`;
  li.appendChild(wlStarButton({
    game: "pokemon",
    id: card.id,
    name: card.name,
    image: card.images.small,
    sub: `${card.set.name} · #${card.number}`,
    buy: card.tcgplayer?.url || TCGP_SEARCH.pokemon(`${card.name} ${card.set.name}`),
    price: p ? (p.market ?? p.mid) : null,
  }));
  li.addEventListener("click", () => openCard(card));
  return li;
}

function render() {
  grid.innerHTML = "";
  const sorted = [...cards];
  const sort = sortSelect.value;
  if (sort === "price-desc" || sort === "price-asc") {
    sorted.sort((a, b) => {
      const pa = bestPrice(a)?.market ?? -1;
      const pb = bestPrice(b)?.market ?? -1;
      return sort === "price-desc" ? pb - pa : pa - pb;
    });
  } else if (sort === "number") {
    sorted.sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));
  } else if (sort === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  sorted.forEach((c) => grid.appendChild(cardLi(c)));
  loadMoreBtn.hidden = cards.length >= totalCount;

  const updated = cards.find((c) => c.tcgplayer?.updatedAt)?.tcgplayer.updatedAt;
  updatedEl.textContent = updated
    ? `TCGplayer prices updated ${updated} · ${totalCount} cards`
    : "";
}

async function loadPage(reset) {
  if (reset) {
    page = 1;
    cards = [];
    grid.innerHTML = "";
  }
  statusEl.textContent = "Loading cards…";
  loadMoreBtn.hidden = true;
  try {
    // Strip Lucene-special characters the API rejects (parentheses, brackets,
    // colons, …) — keep letters/digits/space/apostrophe/period/hyphen.
    const clean = searchEl.value.trim()
      .replace(/[^\p{L}\p{N}\s.'-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    const q = mode === "search" && clean
      ? `name:"*${clean}*"`
      : `set.id:${setSelect.value}`;
    const order = mode === "search" ? "&orderBy=-set.releaseDate" : "";
    const data = await pkFetch(
      `/cards?q=${encodeURIComponent(q)}&page=${page}&pageSize=${PAGE_SIZE}${order}`
    );
    totalCount = data.totalCount;
    cards = cards.concat(data.data);
    statusEl.textContent = totalCount === 0 ? "No cards found." : "";
    render();
  } catch (err) {
    statusEl.textContent = "Couldn't reach the Pokémon TCG API — please try again in a moment.";
    console.error(err);
  }
}

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
      <span class="t">Cardmarket trend<b>${eur(cm.trendPrice)}</b></span>
      <span class="t">1-day avg<b>${eur(cm.avg1)}</b></span>
      <span class="t">7-day avg<b>${eur(cm.avg7)}</b></span>
      <span class="t">30-day avg<b>${eur(cm.avg30)}</b></span>
    </div>` : "";

  const buyUrl = card.tcgplayer?.url || TCGP_SEARCH.pokemon(`${card.name} ${card.set.name}`);

  openModal(`
    <div><img class="art" src="${esc(card.images.large)}" alt="${esc(card.name)}" /></div>
    <div>
      <h2>${esc(card.name)}</h2>
      <div class="meta">
        ${esc(card.set.name)} · #${esc(card.number)}/${esc(card.set.printedTotal)} ·
        ${esc(card.rarity ?? "Unknown rarity")} ${card.artist ? "· Illus. " + esc(card.artist) : ""}
      </div>
      ${rows ? `
        <table class="price-table">
          <thead><tr><th>TCGplayer (USD)</th><th>Low</th><th>Market</th><th>High</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="note">Updated ${esc(card.tcgplayer?.updatedAt ?? "")} · source: TCGplayer via Pokémon TCG API</div>`
        : `<p class="note">No TCGplayer price listed for this card.</p>`}
      ${trendHtml}
      <div class="card-history" id="card-history"></div>
      <div class="buy-row">
        <a class="btn btn-buy" href="${esc(buyUrl)}" target="_blank" rel="noopener">Buy on TCGplayer</a>
        <a class="btn btn-ghost" href="https://mycollectrics.com" target="_blank" rel="noopener">Collectrics analytics</a>
      </div>
    </div>
  `);
  renderCardHistory("pokemon", card.id, document.getElementById("card-history"));
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
