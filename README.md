# PokeSnipr

Pokémon & One Piece TCG market tracker — live at [pokesnipr.com](https://pokesnipr.com) — card prices, price changes, buy links, and a live news ticker. Plain HTML/CSS/JS; runs on GitHub Pages with no build step.

## Pages

- **Dashboard** (`index.html`) — news ticker, chase cards from the newest Pokémon and One Piece sets, biggest price movers
- **Pokémon** (`pokemon.html`) — every set, full-name search, TCGplayer market/low/high per print variant, Cardmarket 1/7/30-day averages, direct TCGplayer buy links
- **One Piece** (`onepiece.html`) — every set OP-01 onward plus starter decks, TCGplayer market prices, buy links

## Data sources

| What | Source | Freshness |
|---|---|---|
| Pokémon cards & prices | TCGplayer prices via [Pokémon TCG API](https://pokemontcg.io) | updated daily |
| Pokémon price trends | Cardmarket 1/7/30-day averages (same API) | updated daily |
| One Piece cards & prices | TCGplayer prices via [OPTCG API](https://optcgapi.com) | updated daily |
| News ticker | PokeBeach / TCGplayer / Pokémon Center coverage via Google News RSS | every 6 hours |
| Day-over-day movers | Daily snapshots recorded by this repo's GitHub Action | ready after 2 days |

A scheduled GitHub Action ([update-data.yml](.github/workflows/update-data.yml)) refreshes `data/news.json` and records a daily price snapshot in `data/price-history.json`; once two days exist, `data/movers.json` powers true TCGplayer day-over-day movers on the dashboard. Until then the dashboard shows Cardmarket rolling-average moves (real historical data, in EUR).

[Collectrics](https://mycollectrics.com) is linked for pack-value and grading analytics; it has no public data feed, so its modeled prices are not embedded.

## Run locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. To refresh news/prices locally: `python3 scripts/update_data.py`.

## Disclaimers

Prices are market estimates, not offers. Pokémon is a trademark of Nintendo / Creatures / GAME FREAK. One Piece is a trademark of Eiichiro Oda / Shueisha, Toei Animation, and Bandai. This site is unaffiliated fan tooling.
