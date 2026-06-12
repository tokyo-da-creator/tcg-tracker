/* Client-side alerts — price targets, % moves.  Persisted in localStorage. */

const PA_KEY      = "ps_alerts";
const PA_READ_KEY = "ps_alerts_read";

function alertsAll() {
  try { return JSON.parse(localStorage.getItem(PA_KEY)) ?? []; }
  catch { return []; }
}

function alertsSave(list) {
  localStorage.setItem(PA_KEY, JSON.stringify(list));
}

/* a: { kind, cardId, cardName, cardImage, target }
   kind: "price-below" | "price-above" | "pct-move" */
function addAlert(a) {
  const list = alertsAll().filter(
    x => !(x.cardId === a.cardId && x.kind === a.kind)
  );
  list.unshift({
    ...a,
    id: `a${Date.now()}`,
    status: "active",
    created: new Date().toISOString().slice(0, 10),
  });
  alertsSave(list);
  document.dispatchEvent(new CustomEvent("alerts-changed"));
}

function removeAlert(id) {
  alertsSave(alertsAll().filter(a => a.id !== id));
  document.dispatchEvent(new CustomEvent("alerts-changed"));
}

function dismissAlert(id) {
  alertsSave(alertsAll().map(a =>
    a.id === id ? { ...a, status: "dismissed" } : a
  ));
  document.dispatchEvent(new CustomEvent("alerts-changed"));
}

/* Returns active alerts for a specific card. */
function alertsForCard(cardId) {
  return alertsAll().filter(a => a.cardId === cardId && a.status === "active");
}

/* Count triggered alerts not yet read. */
function alertsUnreadCount() {
  const lastRead = localStorage.getItem(PA_READ_KEY) ?? "";
  return alertsAll().filter(
    a => a.status === "triggered" && (a.when ?? "") > lastRead
  ).length;
}

function alertsMarkRead() {
  localStorage.setItem(PA_READ_KEY, new Date().toISOString());
}

/* Evaluate active alerts against a Map<cardId, { market, pct7d }>.
   Flips matched alerts to triggered and fires alerts-changed. */
function evaluateAlerts(prices) {
  let changed = false;
  const list = alertsAll().map(a => {
    if (a.status !== "active" || !prices.has(a.cardId)) return a;
    const { market, pct7d } = prices.get(a.cardId);
    let hit = false;
    if (a.kind === "price-below" && market != null && market <= a.target) hit = true;
    if (a.kind === "price-above" && market != null && market >= a.target) hit = true;
    if (a.kind === "pct-move"   && pct7d  != null && Math.abs(pct7d) >= a.target) hit = true;
    if (hit) {
      changed = true;
      return { ...a, status: "triggered", price: market, pct: pct7d, when: new Date().toISOString() };
    }
    return a;
  });
  if (changed) {
    alertsSave(list);
    document.dispatchEvent(new CustomEvent("alerts-changed"));
  }
  return alertsAll();
}

/* Human-readable alert description. */
function alertText(a) {
  if (a.kind === "price-below") return `${a.cardName} drops below $${a.target.toFixed(2)}`;
  if (a.kind === "price-above") return `${a.cardName} rises above $${a.target.toFixed(2)}`;
  if (a.kind === "pct-move")   return `${a.cardName} moves ≥${a.target}% in 7 days`;
  return a.cardName ?? a.cardId;
}
