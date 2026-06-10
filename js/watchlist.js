/* Watchlist — starred cards stored in localStorage, shared across pages. */

const WL_KEY = "pokesnipr-watchlist";

function wlAll() {
  try {
    return JSON.parse(localStorage.getItem(WL_KEY)) ?? [];
  } catch {
    return [];
  }
}

function wlSave(list) {
  localStorage.setItem(WL_KEY, JSON.stringify(list.slice(0, 100)));
}

function wlHas(game, id) {
  return wlAll().some((w) => w.game === game && w.id === id);
}

/* item: { game, id, name, image, sub, buy, price } */
function wlToggle(item) {
  let list = wlAll();
  if (wlHas(item.game, item.id)) {
    list = list.filter((w) => !(w.game === item.game && w.id === item.id));
  } else {
    list.unshift({ ...item, added: new Date().toISOString().slice(0, 10) });
  }
  wlSave(list);
  return wlHas(item.game, item.id);
}

function wlRemove(game, id) {
  wlSave(wlAll().filter((w) => !(w.game === game && w.id === id)));
}

/* Star button for a card tile. Stops click bubbling so the modal doesn't open. */
function wlStarButton(item) {
  const btn = document.createElement("button");
  btn.className = "star" + (wlHas(item.game, item.id) ? " on" : "");
  btn.title = "Watchlist";
  btn.setAttribute("aria-label", "Toggle watchlist");
  btn.textContent = "★";
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const on = wlToggle(item);
    btn.classList.toggle("on", on);
    document.dispatchEvent(new CustomEvent("watchlist-changed"));
  });
  return btn;
}
