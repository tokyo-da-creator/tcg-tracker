/* Portfolio holdings — persisted in localStorage. Mirror of watchlist.js. */

const PF_KEY = "ps_holdings";

function pfAll() {
  try { return JSON.parse(localStorage.getItem(PF_KEY)) ?? []; }
  catch { return []; }
}

function pfSave(list) {
  localStorage.setItem(PF_KEY, JSON.stringify(list));
}

function pfHas(id) {
  return pfAll().some(h => h.id === id);
}

function pfGet(id) {
  return pfAll().find(h => h.id === id) ?? null;
}

/* meta: { game, name, image, set, rarity }
   qty=0 removes the holding. */
function setHolding(id, qty, cost, meta) {
  const list = pfAll().filter(h => h.id !== id);
  if (qty > 0) {
    list.unshift({
      id,
      qty: Math.max(1, Number(qty)),
      cost: Math.max(0, Number(cost)),
      ...meta,
      updated: new Date().toISOString().slice(0, 10),
    });
  }
  pfSave(list);
  document.dispatchEvent(new CustomEvent("portfolio-changed"));
}

function removeHolding(id) {
  pfSave(pfAll().filter(h => h.id !== id));
  document.dispatchEvent(new CustomEvent("portfolio-changed"));
}

/* Cache the latest market price without touching qty/cost. */
function pfUpdatePrice(id, price) {
  const list = pfAll().map(h =>
    h.id === id ? { ...h, lastPrice: Number(price) } : h
  );
  pfSave(list);
}

/* Quick total using cached prices (no API call). */
function pfQuickTotal() {
  return pfAll().reduce((s, h) => s + (h.lastPrice ?? h.cost) * h.qty, 0);
}
