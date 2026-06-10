#!/usr/bin/env python3
"""Refresh data/news.json, data/price-history.json, and data/movers.json.

Runs on a schedule via GitHub Actions (stdlib only, no pip installs).
News comes from Google News RSS (PokeBeach / TCGplayer / Pokémon Center
coverage). Prices are TCGplayer market values for the newest Pokémon and
One Piece sets; one snapshot per day, movers computed from the last two
distinct days.
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
UA = {"User-Agent": "Mozilla/5.0 (TCGPulse data updater; github actions)"}

FEEDS = [
    ("pokebeach", "PokeBeach",
     "https://news.google.com/rss/search?q=site:pokebeach.com&hl=en-US&gl=US&ceid=US:en"),
    ("tcgplayer", "TCGplayer",
     "https://news.google.com/rss/search?q=site:tcgplayer.com&hl=en-US&gl=US&ceid=US:en"),
    ("pokemoncenter", "Pokémon Center",
     "https://news.google.com/rss/search?q=%22pokemon+center%22&hl=en-US&gl=US&ceid=US:en"),
]

MAX_PER_FEED = 8
MAX_SNAPSHOT_DAYS = 120


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


def pokemon_snapshot():
    """Newest set that already has TCGplayer market prices (brand-new sets
    appear in the API days before TCGplayer publishes prices for them)."""
    sets = get_json("https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=5")
    for s in sets["data"]:
        q = urllib.parse.quote(f"set.id:{s['id']}")
        cards = get_json(
            "https://api.pokemontcg.io/v2/cards"
            f"?q={q}&pageSize=250&select=id,name,number,rarity,images,set,tcgplayer"
        )["data"]
        prices, meta = {}, {}
        for c in cards:
            variants = ((c.get("tcgplayer") or {}).get("prices") or {}).values()
            best = max((v.get("market") or 0 for v in variants), default=0)
            if best > 0:
                prices[c["id"]] = round(best, 2)
                meta[c["id"]] = {
                    "name": c["name"],
                    "image": c["images"]["small"],
                    "sub": f"{c['set']['name']} · #{c['number']}",
                    "buy": (c.get("tcgplayer") or {}).get("url")
                    or "https://www.tcgplayer.com/search/pokemon/product?q="
                    + urllib.parse.quote(c["name"]),
                }
        if prices:
            return {"name": s["name"], "id": s["id"],
                    "releaseDate": s.get("releaseDate", "")}, prices, meta
    raise RuntimeError("no recent Pokémon set has TCGplayer prices")


def onepiece_snapshot():
    """Newest main OP set with TCGplayer market price per card."""
    sets = get_json("https://optcgapi.com/api/allSets/")
    main = [s for s in sets if s["set_id"].startswith("OP-")]
    main.sort(key=lambda s: int(s["set_id"].split("-")[1]), reverse=True)
    s = main[0]
    cards = get_json(f"https://optcgapi.com/api/sets/{urllib.parse.quote(s['set_id'])}/")
    prices, meta = {}, {}
    for c in cards:
        try:
            p = float(c.get("market_price"))
        except (TypeError, ValueError):
            continue
        cid = c["card_set_id"]
        # Names embed suffixes like "(OP15-118) (Manga)" — strip for search.
        clean = re.sub(r"\s*\([^)]*\)", "", c["card_name"]).strip()
        prices[cid] = round(p, 2)
        meta[cid] = {
            "name": c["card_name"],
            "image": c["card_image"],
            "sub": f"{c['set_name']} · {cid}",
            "buy": "https://www.tcgplayer.com/search/one-piece-card-game/product?q="
            + urllib.parse.quote(f"{clean} {cid}"),
        }
    return {"name": s["set_name"], "id": s["set_id"]}, prices, meta


def cardmarket_movers(top_n=9):
    """Interim movers from Cardmarket 1-day vs 7-day averages (EUR), used
    until two TCGplayer snapshots exist. The very newest sets often lack
    Cardmarket data, so probe until one has it."""
    sets = get_json("https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=10")
    for s in sets["data"]:
        q = urllib.parse.quote(f"set.id:{s['id']}")
        cards = get_json(
            "https://api.pokemontcg.io/v2/cards"
            f"?q={q}&pageSize=250&select=id,name,number,images,set,tcgplayer,cardmarket"
        )["data"]
        rows = []
        for c in cards:
            cm = (c.get("cardmarket") or {}).get("prices") or {}
            a1, a7 = cm.get("avg1"), cm.get("avg7")
            if not a1 or not a7 or a7 < 2:  # skip bulk noise
                continue
            pct = (a1 - a7) / a7 * 100
            if abs(pct) < 0.5:
                continue
            rows.append({
                "id": c["id"],
                "name": c["name"],
                "image": c["images"]["small"],
                "sub": f"{c['set']['name']} · #{c['number']}",
                "buy": (c.get("tcgplayer") or {}).get("url")
                or "https://www.tcgplayer.com/search/pokemon/product?q="
                + urllib.parse.quote(c["name"]),
                "old": round(a7, 2),
                "new": round(a1, 2),
                "pct": round(pct, 1),
            })
        if rows:
            rows.sort(key=lambda r: abs(r["pct"]), reverse=True)
            return {"setName": s["name"], "currency": "EUR",
                    "basis": "Cardmarket 1d vs 7d avg", "pokemon": rows[:top_n]}
    return None


def featured_block(set_info, prices, meta, top_n=12):
    top = sorted(prices.items(), key=lambda kv: kv[1], reverse=True)[:top_n]
    return {
        "set": set_info,
        "cards": [{"id": cid, "price": price, **meta[cid]} for cid, price in top],
    }


def update_history(pk, op):
    path = DATA / "price-history.json"
    history = {"snapshots": []}
    if path.exists():
        history = json.loads(path.read_text())
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    snaps = [s for s in history["snapshots"] if s["date"] != today]
    snaps.append({"date": today, "pokemon": pk, "onepiece": op})
    snaps.sort(key=lambda s: s["date"])
    history["snapshots"] = snaps[-MAX_SNAPSHOT_DAYS:]
    path.write_text(json.dumps(history, separators=(",", ":")))
    return history


def compute_movers(history, meta_pk, meta_op, min_price=1.0, top_n=9):
    snaps = history["snapshots"]
    if len(snaps) < 2:
        return {"ready": False, "pokemon": [], "onepiece": []}
    prev, cur = snaps[-2], snaps[-1]

    def movers_for(game, meta):
        out = []
        for cid, new in cur[game].items():
            old = prev[game].get(cid)
            if not old or old < min_price or cid not in meta:
                continue
            pct = (new - old) / old * 100
            if abs(pct) < 0.5:
                continue
            out.append({"id": cid, "old": old, "new": new,
                        "pct": round(pct, 1), **meta[cid]})
        out.sort(key=lambda m: abs(m["pct"]), reverse=True)
        return out[:top_n]

    return {
        "ready": True,
        "from": prev["date"],
        "to": cur["date"],
        "pokemon": movers_for("pokemon", meta_pk),
        "onepiece": movers_for("onepiece", meta_op),
    }


def main():
    DATA.mkdir(exist_ok=True)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    news = fetch_news()
    (DATA / "news.json").write_text(
        json.dumps({"updated": now, "items": news}, ensure_ascii=False, indent=1)
    )
    print(f"news: {len(news)} items")

    try:
        pk_set, pk_prices, pk_meta = pokemon_snapshot()
        op_set, op_prices, op_meta = onepiece_snapshot()
        history = update_history(pk_prices, op_prices)
        movers = compute_movers(history, pk_meta, op_meta)
        movers["updated"] = now
        movers["sets"] = {"pokemon": pk_set["name"], "onepiece": op_set["name"]}
        if not movers["ready"]:
            try:
                movers["interim"] = cardmarket_movers()
            except Exception as e:
                print(f"warn: interim movers failed: {e}", file=sys.stderr)
                movers["interim"] = None
        (DATA / "movers.json").write_text(json.dumps(movers, ensure_ascii=False))
        featured = {
            "updated": now,
            "pokemon": featured_block(pk_set, pk_prices, pk_meta),
            "onepiece": featured_block(op_set, op_prices, op_meta),
        }
        (DATA / "featured.json").write_text(json.dumps(featured, ensure_ascii=False))
        print(f"prices: {pk_set['name']} {len(pk_prices)} cards / "
              f"{op_set['name']} {len(op_prices)} cards / movers ready={movers['ready']}")
    except Exception as e:
        # News alone is still worth committing; price APIs can have bad days.
        print(f"warn: price snapshot failed: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
