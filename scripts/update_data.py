#!/usr/bin/env python3
"""PokeSnipr data refresh — runs on a schedule via GitHub Actions (stdlib only).

Outputs (all in data/):
  news.json          headlines from PokeBeach / TCGplayer / Pokémon Center coverage
  featured.json      top cards of the newest priced Pokémon + One Piece sets
  price-history.json one snapshot per day of TCGplayer market prices, by set
  movers.json        day-over-day TCGplayer movers (+ Cardmarket interim list)
  analytics.json     set-level aggregates, trends, and value history for charts

Prices are TCGplayer market values via the Pokémon TCG API and OPTCG API.
Cardmarket 1/7/30-day averages (EUR) come from the Pokémon TCG API.
"""

import json
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
UA = {"User-Agent": "Mozilla/5.0 (PokeSnipr data updater; github actions)"}

PK_API = "https://api.pokemontcg.io/v2"
OP_API = "https://optcgapi.com/api"

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
        "image": card["images"]["small"],
        "sub": f"{card['set']['name']} · #{card['number']}",
        "buy": (card.get("tcgplayer") or {}).get("url")
        or "https://www.tcgplayer.com/search/pokemon/product?q="
        + urllib.parse.quote(card["name"]),
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
    clean = re.sub(r"\s*\([^)]*\)", "", card["card_name"]).strip()
    return {
        "name": card["card_name"],
        "image": card["card_image"],
        "sub": f"{card['set_name']} · {cid}",
        "buy": "https://www.tcgplayer.com/search/one-piece-card-game/product?q="
        + urllib.parse.quote(f"{clean} {cid}"),
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
                          "ratio": round(r, 2),
                          "buy": (c.get("tcgplayer") or {}).get("url") or ""}
                         for c, p, lo, r in tight],
        }
    # Cardmarket aggregate trend (only meaningful with broad coverage)
    if len(cm) >= len(priced) * 0.5:
        out["cardmarket"] = {
            "coverage": len(cm),
            "avg30": round(sum(p["avg30"] for p in cm), 2),
            "avg7": round(sum(p["avg7"] for p in cm), 2),
            "avg1": round(sum(p["avg1"] for p in cm), 2),
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
                          "ratio": round(r, 2),
                          "buy": op_card_meta(c)["buy"]}
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
    """Interim movers from Cardmarket 1d vs 7d averages (EUR)."""
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
                         "old": round(a7, 2), "new": round(a1, 2),
                         "pct": round(pct, 1)})
        if rows:
            rows.sort(key=lambda r: abs(r["pct"]), reverse=True)
            return {"setName": s["name"], "currency": "EUR",
                    "basis": "Cardmarket 1d vs 7d avg", "pokemon": rows[:top_n]}
    return None


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


# ---------------------------------------------------------------- main

def main():
    DATA.mkdir(exist_ok=True)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

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

        print(f"prices: pk {list(pk_by_set)} / op {list(op_by_set)} "
              f"/ movers ready={movers['ready']} "
              f"/ analytics sets pk={len(pk_stats)} op={len(op_stats)}")
    except Exception as e:
        # News alone is still worth committing; price APIs can have bad days.
        print(f"warn: price/analytics refresh failed: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
