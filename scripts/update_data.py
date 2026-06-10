#!/usr/bin/env python3
"""PokeSnipr data refresh — runs on a schedule via GitHub Actions (stdlib only).

Outputs (all in data/):
  news.json          headlines from PokeBeach / TCGplayer / Pokémon Center coverage
  featured.json      top cards of the newest priced Pokémon + One Piece sets
  price-history.json one snapshot per day of TCGplayer market prices, by set
  movers.json        day-over-day TCGplayer movers (+ Cardmarket interim list)
  analytics.json     set-level aggregates, trends, and value history for charts

Prices are TCGplayer market values via the Pokémon TCG API and OPTCG API.
Cardmarket 1/7/30-day averages come from the Pokémon TCG API in EUR and are
converted to USD with a live exchange rate so the whole site reads in USD.

If TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set in the environment, alerts
are sent to Telegram according to config/alerts.json.
"""

import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CONFIG = ROOT / "config"
UA = {"User-Agent": "Mozilla/5.0 (PokeSnipr data updater; github actions)"}

PK_API = "https://api.pokemontcg.io/v2"
OP_API = "https://optcgapi.com/api"
TCGCSV = "https://tcgcsv.com/tcgplayer"
FX_API = "https://open.er-api.com/v6/latest/EUR"

# Live EUR->USD rate, refreshed each run (see fetch_eur_usd). Fallback is a
# recent rate so a bad FX day still produces sane USD numbers.
EUR_USD = 1.08

FEEDS = [
    ("pokebeach", "PokeBeach",
     "https://news.google.com/rss/search?q=site:pokebeach.com&hl=en-US&gl=US&ceid=US:en"),
    ("tcgplayer", "TCGplayer",
     "https://news.google.com/rss/search?q=site:tcgplayer.com&hl=en-US&gl=US&ceid=US:en"),
    ("pokemoncenter", "Pokémon Center",
     "https://news.google.com/rss/search?q=%22pokemon+center%22&hl=en-US&gl=US&ceid=US:en"),
]

MAX_PER_FEED = 12
MAX_SNAPSHOT_DAYS = 180
PK_SETS_TO_SCAN = 8     # newest Pokémon sets fetched for analytics
OP_SETS_TO_SCAN = 6     # newest One Piece main sets fetched for analytics
SETS_TO_SNAPSHOT = 2    # newest priced sets per game tracked day-over-day
MOVERS_TOP_N = 20
SEALED_GROUPS_TO_SCAN = {"pokemon": 16, "onepiece": 18}
SEALED_TOP_N = 160
SEALED_PATTERNS = re.compile(
    r"booster|elite trainer|\betb\b|bundle|box|pack|display|case|blister|tin|"
    r"collection|premium|starter deck|deck set|double pack|gift|build & battle|"
    r"battle deck|trainer toolkit|league battle|dash pack|release event",
    re.I,
)
SEALED_EXCLUDE = re.compile(r"^code card|\bdon!! card \(|\bpromo card\b", re.I)


def get(url: str, retries: int = 2) -> bytes:
    last_err = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as res:
                return res.read()
        except Exception as e:
            last_err = e
            if attempt < retries:
                time.sleep(3 * (attempt + 1))
    raise last_err


def get_json(url: str):
    return json.loads(get(url))


def fetch_eur_usd() -> float:
    """Live EUR->USD rate; falls back to the module default on failure."""
    try:
        data = get_json(FX_API)
        rate = float(data["rates"]["USD"])
        if 0.5 < rate < 3:
            return rate
    except Exception as e:
        print(f"warn: FX rate fetch failed ({e}); using fallback {EUR_USD}", file=sys.stderr)
    return EUR_USD


def eur_to_usd(value):
    """Convert an EUR amount to USD using the current run's rate."""
    if value is None:
        return None
    return round(value * EUR_USD, 2)


# ---------------------------------------------------------------- news

def fetch_news() -> list[dict]:
    items = []
    for key, label, url in FEEDS:
        try:
            root = ET.fromstring(get(url))
            for item in list(root.iter("item"))[:MAX_PER_FEED]:
                title = (item.findtext("title") or "").strip()
                link = (item.findtext("link") or "").strip()
                pub = (item.findtext("pubDate") or "").strip()
                if title and link:
                    items.append({
                        "source": key,
                        "sourceLabel": label,
                        "title": title,
                        "link": link,
                        "pubDate": pub,
                    })
        except Exception as e:  # one dead feed must not break the rest
            print(f"warn: news feed {key} failed: {e}", file=sys.stderr)

    def sort_key(it):
        try:
            return parsedate_to_datetime(it["pubDate"])
        except Exception:
            return datetime(1970, 1, 1, tzinfo=timezone.utc)

    items.sort(key=sort_key, reverse=True)
    return items


# ---------------------------------------------------------------- cards

def pk_best_market(card) -> float:
    variants = ((card.get("tcgplayer") or {}).get("prices") or {}).values()
    return max((v.get("market") or 0 for v in variants), default=0)


def pk_best_variant(card):
    """(market, low) of the highest-market print variant, or None."""
    variants = [v for v in ((card.get("tcgplayer") or {}).get("prices") or {}).values()
                if v.get("market")]
    if not variants:
        return None
    best = max(variants, key=lambda v: v["market"])
    return (best["market"], best.get("low"))


def median(xs):
    xs = sorted(xs)
    n = len(xs)
    if not n:
        return None
    return xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2


def pk_card_meta(card) -> dict:
    return {
        "name": card["name"],
        "image": card["images"].get("large") or card["images"]["small"],
        "sub": f"{card['set']['name']} · #{card['number']}",
    }


def fetch_pokemon_sets():
    """Newest sets with their full card lists: [(set_info, cards), …]."""
    sets = get_json(f"{PK_API}/sets?orderBy=-releaseDate&pageSize={PK_SETS_TO_SCAN}")
    out = []
    for s in sets["data"]:
        q = urllib.parse.quote(f"set.id:{s['id']}")
        cards = get_json(
            f"{PK_API}/cards?q={q}&pageSize=250"
            "&select=id,name,number,rarity,images,set,tcgplayer,cardmarket"
        )["data"]
        out.append((s, cards))
    return out


def op_card_meta(card) -> dict:
    cid = card["card_set_id"]
    return {
        "name": card["card_name"],
        "image": card["card_image"],
        "sub": f"{card['set_name']} · {cid}",
    }


def op_price(card):
    try:
        return float(card.get("market_price"))
    except (TypeError, ValueError):
        return None


def fetch_onepiece_sets():
    sets = get_json(f"{OP_API}/allSets/")
    main = [s for s in sets if re.match(r"^OP-?\d+", s["set_id"])]
    main.sort(key=lambda s: int(re.search(r"\d+", s["set_id"]).group()), reverse=True)
    out = []
    for s in main[:OP_SETS_TO_SCAN]:
        cards = get_json(f"{OP_API}/sets/{urllib.parse.quote(s['set_id'])}/")
        out.append((s, cards))
    return out


# ---------------------------------------------------------------- aggregates

def pk_set_analytics(s, cards):
    priced = [(c, pk_best_market(c)) for c in cards]
    priced = [(c, p) for c, p in priced if p > 0]
    if not priced:
        return None
    total = sum(p for _, p in priced)
    top_card, top_price = max(priced, key=lambda x: x[1])
    cm = [c.get("cardmarket", {}).get("prices") or {} for c, _ in priced]
    cm = [p for p in cm if p.get("avg1") and p.get("avg7") and p.get("avg30")]
    out = {
        "id": s["id"],
        "name": s["name"],
        "releaseDate": s.get("releaseDate", ""),
        "pricedCards": len(priced),
        "totalValue": round(total, 2),
        "avgValue": round(total / len(priced), 2),
        "topCard": {"name": top_card["name"], "price": round(top_price, 2),
                    "image": top_card["images"]["small"]},
    }
    # Listing tightness: lowest active TCGplayer listing vs market price.
    spreads = []
    for c, p in priced:
        bv = pk_best_variant(c)
        if bv and bv[1] and p >= 2:  # skip bulk noise
            spreads.append((c, p, bv[1], bv[1] / p))
    if len(spreads) >= 10:
        tight = sorted(spreads, key=lambda x: x[3], reverse=True)[:8]
        out["spread"] = {
            "median": round(median([x[3] for x in spreads]), 3),
            "cards": len(spreads),
            "tightest": [{"name": c["name"], "image": c["images"]["small"],
                          "market": round(p, 2), "low": round(lo, 2),
                          "ratio": round(r, 2)}
                         for c, p, lo, r in tight],
        }
    # Cardmarket aggregate trend (only meaningful with broad coverage).
    # Cardmarket quotes EUR; convert to USD so the whole UI is one currency.
    if len(cm) >= len(priced) * 0.5:
        out["cardmarket"] = {
            "coverage": len(cm),
            "currency": "USD",
            "convertedFrom": "EUR",
            "avg30": eur_to_usd(sum(p["avg30"] for p in cm)),
            "avg7": eur_to_usd(sum(p["avg7"] for p in cm)),
            "avg1": eur_to_usd(sum(p["avg1"] for p in cm)),
        }
    return out


def op_set_analytics(s, cards):
    priced = [(c, op_price(c)) for c in cards]
    priced = [(c, p) for c, p in priced if p]
    if not priced:
        return None
    total = sum(p for _, p in priced)
    top_card, top_price = max(priced, key=lambda x: x[1])
    out = {
        "id": s["set_id"],
        "name": s["set_name"],
        "pricedCards": len(priced),
        "totalValue": round(total, 2),
        "avgValue": round(total / len(priced), 2),
        "topCard": {"name": top_card["card_name"], "price": round(top_price, 2),
                    "image": top_card["card_image"]},
    }
    spreads = []
    for c, p in priced:
        try:
            inv = float(c.get("inventory_price"))
        except (TypeError, ValueError):
            continue
        if inv and p >= 2:
            spreads.append((c, p, inv, inv / p))
    if len(spreads) >= 10:
        tight = sorted(spreads, key=lambda x: x[3], reverse=True)[:8]
        out["spread"] = {
            "median": round(median([x[3] for x in spreads]), 3),
            "cards": len(spreads),
            "tightest": [{"name": c["card_name"], "image": c["card_image"],
                          "market": round(p, 2), "low": round(inv, 2),
                          "ratio": round(r, 2)}
                         for c, p, inv, r in tight],
        }
    return out


def featured_block(set_label, set_id, rows, release=""):
    rows = sorted(rows, key=lambda r: r["price"], reverse=True)[:12]
    info = {"name": set_label, "id": set_id}
    if release:
        info["releaseDate"] = release
    return {"set": info, "cards": rows}


# ---------------------------------------------------------------- history

def update_history(pk_by_set, op_by_set):
    """price-history.json — per-day, per-set card price maps."""
    path = DATA / "price-history.json"
    history = {"snapshots": []}
    if path.exists():
        try:
            history = json.loads(path.read_text())
        except Exception:
            pass
    # migrate/drop old flat-schema snapshots (pre set-keyed format)
    history["snapshots"] = [
        s for s in history.get("snapshots", [])
        if isinstance(next(iter(s.get("pokemon", {"x": None}).values()), None), dict)
    ]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    snaps = [s for s in history["snapshots"] if s["date"] != today]
    snaps.append({"date": today, "pokemon": pk_by_set, "onepiece": op_by_set})
    snaps.sort(key=lambda s: s["date"])
    history["snapshots"] = snaps[-MAX_SNAPSHOT_DAYS:]
    path.write_text(json.dumps(history, separators=(",", ":")))
    return history


def compute_movers(history, meta, min_price=1.0):
    snaps = history["snapshots"]
    if len(snaps) < 2:
        return {"ready": False, "pokemon": [], "onepiece": []}
    prev, cur = snaps[-2], snaps[-1]

    def movers_for(game):
        out = []
        prev_flat = {cid: p for sid in prev.get(game, {})
                     for cid, p in prev[game][sid].items()}
        for sid, cards in cur.get(game, {}).items():
            for cid, new in cards.items():
                old = prev_flat.get(cid)
                if not old or old < min_price or cid not in meta[game]:
                    continue
                pct = (new - old) / old * 100
                if abs(pct) < 0.5:
                    continue
                out.append({"id": cid, "old": old, "new": new,
                            "pct": round(pct, 1), **meta[game][cid]})
        out.sort(key=lambda m: abs(m["pct"]), reverse=True)
        return out[:MOVERS_TOP_N]

    return {"ready": True, "from": prev["date"], "to": cur["date"],
            "pokemon": movers_for("pokemon"), "onepiece": movers_for("onepiece")}


def cardmarket_movers(pk_sets, top_n=MOVERS_TOP_N):
    """Interim movers from Cardmarket 1d vs 7d averages, converted EUR->USD."""
    for s, cards in pk_sets:
        rows = []
        for c in cards:
            cm = (c.get("cardmarket") or {}).get("prices") or {}
            a1, a7 = cm.get("avg1"), cm.get("avg7")
            if not a1 or not a7 or a7 < 2:  # skip bulk noise
                continue
            pct = (a1 - a7) / a7 * 100
            if abs(pct) < 0.5:
                continue
            rows.append({"id": c["id"], **pk_card_meta(c),
                         "old": eur_to_usd(a7), "new": eur_to_usd(a1),
                         "pct": round(pct, 1)})
        if rows:
            rows.sort(key=lambda r: abs(r["pct"]), reverse=True)
            return {"setName": s["name"], "currency": "USD",
                    "convertedFrom": "EUR",
                    "basis": "Cardmarket 1d vs 7d avg", "pokemon": rows[:top_n]}
    return None


# ---------------------------------------------------------------- sealed products

def tcgcsv_json(path: str):
    time.sleep(0.12)  # TCGCSV asks clients to avoid bursty pulls.
    return get_json(f"{TCGCSV}{path}")


def tcg_image_hi(url: str) -> str:
    if not url:
        return ""
    return re.sub(r"_200w(?=\.jpg)", "_in_1000x1000", url)


def ext_map(product: dict) -> dict:
    out = {}
    for row in product.get("extendedData") or []:
        key = row.get("displayName") or row.get("name")
        if key:
            out[key] = row.get("value", "")
    return out


def sealed_type(name: str) -> str:
    n = name.lower()
    checks = [
        ("Booster Box Case", "booster box case"),
        ("Booster Box", "booster box"),
        ("Elite Trainer Box", "elite trainer"),
        ("Booster Bundle", "booster bundle"),
        ("Build & Battle", "build & battle"),
        ("Blister", "blister"),
        ("Sleeved Booster", "sleeved booster"),
        ("Booster Pack", "booster pack"),
        ("Double Pack", "double pack"),
        ("Starter Deck", "starter deck"),
        ("Deck Set", "deck set"),
        ("Display", "display"),
        ("Case", "case"),
        ("Tin", "tin"),
        ("Collection", "collection"),
        ("Premium", "premium"),
        ("Gift", "gift"),
        ("Dash Pack", "dash pack"),
    ]
    for label, needle in checks:
        if needle in n:
            return label
    return "Sealed Product"


def is_sealed_product(product: dict) -> bool:
    name = product.get("name", "")
    if SEALED_EXCLUDE.search(name):
        return False
    extended = ext_map(product)
    # Singles usually expose card-specific fields. Sealed products expose
    # product copy and packaging contents instead.
    if extended.get("Rarity") and extended.get("Card Number"):
        return False
    return bool(SEALED_PATTERNS.search(name))


def best_price(prices: list[dict]) -> dict:
    normals = [p for p in prices if p.get("marketPrice") is not None
               and str(p.get("subTypeName", "")).lower() in ("normal", "unopened")]
    rows = normals or [p for p in prices if p.get("marketPrice") is not None]
    if not rows:
        return {}
    return max(rows, key=lambda p: p.get("marketPrice") or 0)


def fetch_sealed_products():
    cats = {"pokemon": 3, "onepiece": 68}
    labels = {"pokemon": "Pokémon", "onepiece": "One Piece"}
    out = {"updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "source": "TCGCSV daily TCGplayer catalog export",
           "pokemon": [], "onepiece": []}

    for game, category_id in cats.items():
        groups = tcgcsv_json(f"/{category_id}/groups")["results"]
        groups.sort(key=lambda g: g.get("publishedOn") or "", reverse=True)
        scanned = 0
        for group in groups:
            if scanned >= SEALED_GROUPS_TO_SCAN[game]:
                break
            products = tcgcsv_json(f"/{category_id}/{group['groupId']}/products")["results"]
            prices_raw = tcgcsv_json(f"/{category_id}/{group['groupId']}/prices")["results"]
            by_product = {}
            for p in prices_raw:
                by_product.setdefault(p["productId"], []).append(p)

            added_group_item = False
            for product in products:
                if not is_sealed_product(product):
                    continue
                p = best_price(by_product.get(product["productId"], []))
                if not p:
                    continue
                extended = ext_map(product)
                out[game].append({
                    "id": f"{category_id}-{product['productId']}",
                    "productId": product["productId"],
                    "game": labels[game],
                    "gameKey": game,
                    "name": product["name"],
                    "cleanName": product.get("cleanName") or product["name"],
                    "set": group["name"],
                    "setId": group["groupId"],
                    "abbreviation": group.get("abbreviation") or "",
                    "releaseDate": (group.get("publishedOn") or "")[:10],
                    "type": sealed_type(product["name"]),
                    "image": tcg_image_hi(product.get("imageUrl") or ""),
                    "imageThumb": product.get("imageUrl") or "",
                    "market": p.get("marketPrice"),
                    "low": p.get("lowPrice"),
                    "mid": p.get("midPrice"),
                    "high": p.get("highPrice"),
                    "priceType": p.get("subTypeName") or "Normal",
                    "modifiedOn": product.get("modifiedOn") or "",
                    "presale": (product.get("presaleInfo") or {}).get("isPresale", False),
                    "presaleNote": (product.get("presaleInfo") or {}).get("note") or "",
                    "description": extended.get("Card Text") or extended.get("CardText") or "",
                    "fields": extended,
                })
                added_group_item = True
            if added_group_item:
                scanned += 1

    for game in ("pokemon", "onepiece"):
        out[game].sort(key=lambda x: ((x.get("market") or 0), x.get("releaseDate", "")), reverse=True)
        out[game] = out[game][:SEALED_TOP_N]
    return out


def value_history(history):
    """Per-day set total values, for the value-over-time chart."""
    rows = []
    for snap in history["snapshots"]:
        row = {"date": snap["date"], "pokemon": {}, "onepiece": {}}
        for game in ("pokemon", "onepiece"):
            for sid, cards in snap.get(game, {}).items():
                row[game][sid] = round(sum(cards.values()), 2)
        rows.append(row)
    return rows


# ---------------------------------------------------------------- telegram alerts

DEFAULT_ALERTS = {
    "movers": {"enabled": True, "minPct": 15},
    "sealed": {"enabled": True, "minPct": 10},
    "news": {"enabled": True},
    "watchlist": {"enabled": True, "cards": []},
}


def load_alert_config() -> dict:
    path = CONFIG / "alerts.json"
    if path.exists():
        try:
            cfg = json.loads(path.read_text())
            return {**DEFAULT_ALERTS, **cfg}
        except Exception as e:
            print(f"warn: alerts.json unreadable ({e}); using defaults", file=sys.stderr)
    return DEFAULT_ALERTS


def load_alert_state() -> dict:
    path = DATA / "alert-state.json"
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            pass
    return {"newsSeen": [], "sealedPrices": {}, "moversSent": {}, "watchSent": {}}


def save_alert_state(state: dict):
    # keep the seen-news list bounded
    state["newsSeen"] = state.get("newsSeen", [])[:400]
    (DATA / "alert-state.json").write_text(json.dumps(state, ensure_ascii=False))


def tg_send(token: str, chat_id: str, text: str) -> bool:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = urllib.parse.urlencode({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": "true",
    }).encode()
    try:
        req = urllib.request.Request(url, data=payload, headers=UA)
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.loads(res.read()).get("ok", False)
    except Exception as e:
        print(f"warn: telegram send failed: {e}", file=sys.stderr)
        return False


def build_alerts(cfg, state, movers, sealed, news, today):
    """Returns a list of message strings to send, mutating state for dedup."""
    msgs = []

    # --- big movers (TCGplayer day-over-day, else Cardmarket interim) ---
    mv = cfg.get("movers", {})
    if mv.get("enabled"):
        thresh = float(mv.get("minPct", 15))
        if movers.get("ready"):
            pool = ([dict(m, game="Pokémon") for m in movers.get("pokemon", [])]
                    + [dict(m, game="One Piece") for m in movers.get("onepiece", [])])
        else:
            pool = [dict(m, game="Pokémon") for m in (movers.get("interim") or {}).get("pokemon", [])]
        hits = [m for m in pool if abs(m.get("pct", 0)) >= thresh]
        sent_today = set(state.get("moversSent", {}).get(today, []))
        fresh = [m for m in hits if m["id"] not in sent_today]
        if fresh:
            fresh.sort(key=lambda m: abs(m["pct"]), reverse=True)
            lines = ["📈 <b>Big market movers</b>"]
            for m in fresh[:12]:
                arrow = "🔺" if m["pct"] >= 0 else "🔻"
                lines.append(f"{arrow} <b>{m['name']}</b> ({m['game']}) "
                             f"${m['old']:.2f} → ${m['new']:.2f} ({m['pct']:+.1f}%)")
            msgs.append("\n".join(lines))
            state.setdefault("moversSent", {})[today] = list(
                sent_today | {m["id"] for m in fresh})
            # only keep today's dedup key
            state["moversSent"] = {today: state["moversSent"][today]}

    # --- sealed product moves (vs last recorded market price) ---
    sl = cfg.get("sealed", {})
    if sl.get("enabled") and sealed:
        thresh = float(sl.get("minPct", 10))
        last = state.get("sealedPrices", {})
        new_last = {}
        hits = []
        for game in ("pokemon", "onepiece"):
            for p in sealed.get(game, []):
                mkt = p.get("market")
                if mkt is None:
                    continue
                new_last[p["id"]] = round(mkt, 2)
                prev = last.get(p["id"])
                if prev and prev >= 5:
                    pct = (mkt - prev) / prev * 100
                    if abs(pct) >= thresh:
                        hits.append((p, prev, mkt, pct))
        if hits:
            hits.sort(key=lambda x: abs(x[3]), reverse=True)
            lines = ["📦 <b>Sealed product moves</b>"]
            for p, prev, mkt, pct in hits[:10]:
                arrow = "🔺" if pct >= 0 else "🔻"
                lines.append(f"{arrow} <b>{p['name']}</b> ({p['set']}) "
                             f"${prev:.2f} → ${mkt:.2f} ({pct:+.1f}%)")
            msgs.append("\n".join(lines))
        state["sealedPrices"] = new_last

    # --- watchlist price triggers ---
    wl = cfg.get("watchlist", {})
    if wl.get("enabled") and wl.get("cards"):
        # Look up current price from movers/sealed snapshots we already have.
        price_index = {}
        if movers.get("ready"):
            for m in movers.get("pokemon", []) + movers.get("onepiece", []):
                price_index[m["id"]] = m["new"]
        for game in ("pokemon", "onepiece"):
            for p in (sealed or {}).get(game, []):
                if p.get("market") is not None:
                    price_index[p["id"]] = p["market"]
        watch_sent = state.get("watchSent", {})
        new_watch_sent = dict(watch_sent)
        lines = ["⭐ <b>Watchlist triggers</b>"]
        triggered = False
        for w in wl["cards"]:
            cur = price_index.get(w.get("id"))
            if cur is None:
                continue
            above, below = w.get("above"), w.get("below")
            key = None
            if above is not None and cur >= above:
                key = f"{w['id']}:above:{above}"
                cond = f"≥ ${above:.2f}"
            elif below is not None and cur <= below:
                key = f"{w['id']}:below:{below}"
                cond = f"≤ ${below:.2f}"
            if key and new_watch_sent.get(key) != today:
                lines.append(f"• <b>{w.get('name', w['id'])}</b> hit {cond} (now ${cur:.2f})")
                new_watch_sent[key] = today
                triggered = True
        if triggered:
            msgs.append("\n".join(lines))
        state["watchSent"] = new_watch_sent

    # --- news ---
    nw = cfg.get("news", {})
    if nw.get("enabled") and news:
        seen = set(state.get("newsSeen", []))
        fresh = [n for n in news if n["link"] not in seen]
        if fresh:
            lines = ["📰 <b>New TCG headlines</b>"]
            for n in fresh[:8]:
                title = re.sub(r"\s+-\s+[^-]+$", "", n["title"])
                lines.append(f"• [{n['sourceLabel']}] <a href=\"{n['link']}\">{title}</a>")
            msgs.append("\n".join(lines))
            state["newsSeen"] = [n["link"] for n in fresh] + state.get("newsSeen", [])

    return msgs


def run_alerts(movers, sealed, news):
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    cfg = load_alert_config()
    state = load_alert_state()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    seeding = not (DATA / "alert-state.json").exists()
    msgs = build_alerts(cfg, state, movers, sealed, news, today)

    if not token or not chat_id:
        print(f"alerts: telegram not configured; would send {len(msgs)} message(s)")
        save_alert_state(state)
        return
    if seeding:
        # First run only records baselines so we don't blast every headline /
        # every sealed product on day one.
        print("alerts: seeding baseline state (no messages on first run)")
        save_alert_state(state)
        return
    sent = 0
    for m in msgs:
        if tg_send(token, chat_id, m):
            sent += 1
        time.sleep(0.5)
    print(f"alerts: sent {sent}/{len(msgs)} telegram message(s)")
    save_alert_state(state)


# ---------------------------------------------------------------- main

def main():
    global EUR_USD
    DATA.mkdir(exist_ok=True)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    EUR_USD = fetch_eur_usd()
    (DATA / "fx.json").write_text(json.dumps(
        {"eurUsd": EUR_USD, "updated": now, "base": "EUR", "quote": "USD"}))
    print(f"fx: EUR->USD = {EUR_USD}")

    news = fetch_news()
    (DATA / "news.json").write_text(
        json.dumps({"updated": now, "items": news}, ensure_ascii=False, indent=1)
    )
    print(f"news: {len(news)} items")

    try:
        pk_sets = fetch_pokemon_sets()
        op_sets = fetch_onepiece_sets()

        # --- per-set aggregates for analytics
        pk_stats = [a for a in (pk_set_analytics(s, c) for s, c in pk_sets) if a]
        op_stats = [a for a in (op_set_analytics(s, c) for s, c in op_sets) if a]

        # --- snapshots: newest N priced sets per game
        meta = {"pokemon": {}, "onepiece": {}}
        pk_by_set, op_by_set = {}, {}
        pk_priced = [(s, c) for s, c in pk_sets
                     if any(pk_best_market(x) > 0 for x in c)]
        for s, cards in pk_priced[:SETS_TO_SNAPSHOT]:
            prices = {}
            for c in cards:
                p = pk_best_market(c)
                if p > 0:
                    prices[c["id"]] = round(p, 2)
                    meta["pokemon"][c["id"]] = pk_card_meta(c)
            pk_by_set[s["id"]] = prices
        op_priced = [(s, c) for s, c in op_sets if any(op_price(x) for x in c)]
        for s, cards in op_priced[:SETS_TO_SNAPSHOT]:
            prices = {}
            for c in cards:
                p = op_price(c)
                if p:
                    prices[c["card_set_id"]] = round(p, 2)
                    meta["onepiece"][c["card_set_id"]] = op_card_meta(c)
            op_by_set[s["set_id"]] = prices

        if not pk_by_set or not op_by_set:
            raise RuntimeError("no priced sets found")

        history = update_history(pk_by_set, op_by_set)

        # --- featured: top cards of the newest priced set per game
        pk_top_set, pk_top_cards = pk_priced[0]
        op_top_set, op_top_cards = op_priced[0]
        featured = {
            "updated": now,
            "pokemon": featured_block(
                pk_top_set["name"], pk_top_set["id"],
                [{"id": c["id"], "price": round(pk_best_market(c), 2), **pk_card_meta(c)}
                 for c in pk_top_cards if pk_best_market(c) > 0],
                pk_top_set.get("releaseDate", "")),
            "onepiece": featured_block(
                op_top_set["set_name"], op_top_set["set_id"],
                [{"id": c["card_set_id"], "price": round(op_price(c), 2), **op_card_meta(c)}
                 for c in op_top_cards if op_price(c)]),
        }
        (DATA / "featured.json").write_text(json.dumps(featured, ensure_ascii=False))

        # --- movers
        movers = compute_movers(history, meta)
        movers["updated"] = now
        movers["sets"] = {"pokemon": pk_top_set["name"], "onepiece": op_top_set["set_name"]}
        if not movers["ready"]:
            try:
                movers["interim"] = cardmarket_movers(pk_sets)
            except Exception as e:
                print(f"warn: interim movers failed: {e}", file=sys.stderr)
                movers["interim"] = None
        (DATA / "movers.json").write_text(json.dumps(movers, ensure_ascii=False))

        # --- analytics
        analytics = {
            "updated": now,
            "pokemon": {"sets": pk_stats},
            "onepiece": {"sets": op_stats},
            "valueHistory": value_history(history),
        }
        (DATA / "analytics.json").write_text(json.dumps(analytics, ensure_ascii=False))

        sealed = None
        try:
            sealed = fetch_sealed_products()
            (DATA / "sealed.json").write_text(json.dumps(sealed, ensure_ascii=False))
            print(f"sealed: pk={len(sealed['pokemon'])} op={len(sealed['onepiece'])}")
        except Exception as e:
            print(f"warn: sealed refresh failed: {e}", file=sys.stderr)

        print(f"prices: pk {list(pk_by_set)} / op {list(op_by_set)} "
              f"/ movers ready={movers['ready']} "
              f"/ analytics sets pk={len(pk_stats)} op={len(op_stats)}")

        # Telegram alerts (no-op unless TELEGRAM_* env vars are set)
        try:
            run_alerts(movers, sealed, news)
        except Exception as e:
            print(f"warn: alerts failed: {e}", file=sys.stderr)
    except Exception as e:
        # News alone is still worth committing; price APIs can have bad days.
        print(f"warn: price/analytics refresh failed: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
