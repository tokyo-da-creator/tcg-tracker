/* Sealed products — cached TCGCSV/TCGplayer catalog data. */

const grid = document.getElementById("sealed-grid");
const statusEl = document.getElementById("status");
const updatedEl = document.getElementById("sealed-updated");
const gameSelect = document.getElementById("game-select");
const typeSelect = document.getElementById("type-select");
const searchEl = document.getElementById("sealed-search");
const sortSelect = document.getElementById("sealed-sort");

let products = [];

function cleanHtmlText(html) {
  const doc = new DOMParser().parseFromString(String(html ?? ""), "text/html");
  return doc.body.textContent.replace(/\s+/g, " ").trim();
}

function sealedImage(product) {
  return product.image || product.imageThumb || "";
}

function productCard(product) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `sealed-card ${product.gameKey === "onepiece" ? "rarity-glow-super" : "rarity-glow-ultra"}`;
  el.innerHTML = `
    <span class="sealed-img-wrap">
      ${sealedImage(product)
        ? `<img loading="lazy" decoding="async" src="${esc(sealedImage(product))}" alt="${esc(product.name)}" />`
        : `<span class="no-img">No image</span>`}
    </span>
    <span class="sealed-name">${esc(product.name)}</span>
    <span class="meta">${esc(product.set)} · ${esc(product.type)}</span>
    <span class="pricebar">
      <b class="price">${usd(product.market)}</b>
      <span class="rarity">${esc(product.game)}</span>
    </span>`;
  el.addEventListener("click", () => openProduct(product));
  return el;
}

function openProduct(product) {
  const details = [
    detailStat("Game", product.game),
    detailStat("Product type", product.type),
    detailStat("Set", product.set),
    detailStat("Set code", product.abbreviation),
    detailStat("Release", product.releaseDate),
    detailStat("Market", usd(product.market)),
    detailStat("Low", usd(product.low)),
    detailStat("Mid", usd(product.mid)),
    detailStat("High", usd(product.high)),
    detailStat("Price type", product.priceType),
    detailStat("Presale", product.presale ? "Yes" : "No"),
  ].join("");
  const description = cleanHtmlText(product.description);
  const extra = Object.entries(product.fields ?? {})
    .filter(([key]) => !/card text/i.test(key))
    .slice(0, 10)
    .map(([key, value]) => detailStat(key, cleanHtmlText(value)))
    .join("");
  openModal(`
    <div>
      ${sealedImage(product)
        ? `<img class="art sealed-art" src="${esc(sealedImage(product))}" alt="${esc(product.name)}" />`
        : `<div class="sealed-art no-img">No image</div>`}
    </div>
    <div>
      <h2>${esc(product.name)}</h2>
      <div class="meta">${esc(product.set)} · ${esc(product.type)}</div>
      <div class="detail-grid">${details}${extra}</div>
      ${description ? `<p class="card-text">${esc(description)}</p>` : ""}
      ${product.presaleNote ? `<p class="note">${esc(product.presaleNote)}</p>` : ""}
      ${localMarketNote("TCGCSV daily TCGplayer catalog export", product.modifiedOn?.slice(0, 10))}
    </div>`);
}

function populateTypes() {
  const current = typeSelect.value;
  const types = [...new Set(products.map((p) => p.type).filter(Boolean))].sort();
  typeSelect.innerHTML = `<option value="">All product types</option>` +
    types.map((type) => `<option value="${esc(type)}">${esc(type)}</option>`).join("");
  typeSelect.value = types.includes(current) ? current : "";
}

function filteredProducts() {
  const q = searchEl.value.trim().toLowerCase();
  let rows = products.filter((p) => {
    const gameOk = gameSelect.value === "all" || p.gameKey === gameSelect.value;
    const typeOk = !typeSelect.value || p.type === typeSelect.value;
    const text = `${p.name} ${p.set} ${p.abbreviation} ${p.type}`.toLowerCase();
    return gameOk && typeOk && (!q || text.includes(q));
  });
  const sort = sortSelect.value;
  if (sort === "market-desc") rows.sort((a, b) => (b.market ?? -1) - (a.market ?? -1));
  else if (sort === "market-asc") rows.sort((a, b) => (a.market ?? 1e9) - (b.market ?? 1e9));
  else if (sort === "release-desc") rows.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  else rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

function render() {
  const rows = filteredProducts();
  statusEl.textContent = rows.length ? `${rows.length} sealed products` : "No sealed products match.";
  grid.innerHTML = "";
  rows.forEach((p) => grid.appendChild(productCard(p)));
}

async function init() {
  try {
    const res = await fetch("data/sealed.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`sealed.json ${res.status}`);
    const data = await res.json();
    products = [...(data.pokemon ?? []), ...(data.onepiece ?? [])];
    updatedEl.textContent = `Data refreshed ${String(data.updated ?? "").replace("T", " ").slice(0, 16)} UTC · ${products.length} products cached.`;
    populateTypes();
    render();
  } catch (err) {
    statusEl.textContent = "Sealed product data is not available yet.";
    console.error(err);
  }
}

[gameSelect, typeSelect, sortSelect].forEach((el) => el.addEventListener("change", render));
searchEl.addEventListener("input", debounce(render, 200));

init();
