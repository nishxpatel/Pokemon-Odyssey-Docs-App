# Pokémon Odyssey Docs App

**Live site:** https://nishxpatel.github.io/Pokemon-Odyssey-Docs-App

An unofficial, fan-made interactive reference site for **Pokémon Odyssey v4.1.1** — a fan game blending Pokémon with Etrian Odyssey mechanics. This was built for personal use and for fun as a supplement to the original creator's existing documentation, to make looking things up faster and easier during a playthrough.

> **Disclaimer:** Pokémon Odyssey is a fan game. All Pokémon content belongs to Nintendo / Game Freak. This project has no affiliation with either the Pokémon Company or the Etrian Odyssey series (Atlus). This tool exists purely for personal, non-commercial enjoyment.

---

## What is Pokémon Odyssey?

Pokémon Odyssey is a fan-made ROM hack / fan game that fuses classic Pokémon gameplay with Etrian Odyssey systems — think dungeon strata, F.O.E. (overworld super-encounters), stratum-gated level caps, and a custom **Aether** type (replacing Fairy as the 18th type). It also introduces **Etrian Variants** (regional-form-style alternate Pokémon, marked with ⭐) and a large roster of custom moves and abilities.

---

## What this site does

The docs app is a fully static website that turns three Excel spreadsheets (the game's original documentation format) into a browsable, searchable reference. No account, no server, no framework — just HTML, CSS, and vanilla JS.

| Page | Description |
|---|---|
| **Pokédex** | 404 species with search, type filters, stat sort, and a "final forms only" toggle |
| **Pokémon detail** | Types, base stats, abilities, level-up moves, evolution chain, wild locations |
| **Moves** | 439 moves (124 custom) with power/accuracy/PP/type |
| **Move detail** | Full effect description, category, and which Pokémon learn it |
| **Abilities** | 112 abilities (17 custom) |
| **Ability detail** | Full effect text and Pokémon with that ability |
| **Items** | 225 items with their sources (shops, pickup, gathering/mining, TMs, move tutors) |
| **Item detail** | Full source list for a single item; links to evolution Pokémon where relevant |
| **Type Chart** | Full 18×18 matchup grid including the custom Aether type |

---

## Running locally

**Prerequisites:**

```bash
pip3 install openpyxl Pillow
```

**Rebuild the JSON data** (only needed if the spreadsheets change):

```bash
python3 scripts/build_data.py
```

This parses all three workbooks and writes JSON to `site/data/`. It also extracts Etrian Variant sprites and strips their backgrounds.

**Serve the site:**

```bash
python3 -m http.server 8000 --directory site
```

Then open [http://localhost:8000](http://localhost:8000).

> The site is fully static — there's no build step, no bundler, and no Node.js required.

---

## Project structure

```
.
├── docs/                                  # Source documentation
│   ├── Pokémon Stats, Learnset etc (v4.1.1).xlsx
│   ├── Wild encounters, Items and TMs (v4.1.1).xlsx
│   ├── Level Cap, Boss, Miniboss, Sea Map, Sidequests (v4.1.1).xlsx
│   └── Type_Chart.pdf
├── scripts/                               # Build and utility scripts
│   ├── build_data.py                      # Parses workbooks → site/data/*.json + variant sprites
│   └── clean_variant_backgrounds.py       # Re-runs only the sprite background-removal step
├── cache/
│   └── pokeapi_cache/                     # Cached PokeAPI responses (committed — do not delete)
├── site/                                  # Static website
│   ├── index.html                         # Landing page
│   ├── pokedex.html / pokemon.html        # Pokédex + species detail
│   ├── moves.html / move.html             # Move index + detail
│   ├── abilities.html / ability.html      # Ability index + detail
│   ├── items.html / item.html             # Item index + detail
│   ├── type-chart.html                    # Full 18×18 type effectiveness grid
│   ├── data/                              # Generated JSON (pokedex, moves, abilities, items, meta)
│   └── assets/
│       ├── style.css
│       ├── types.js                       # Shared type badge utility
│       ├── app.js, detail.js, ...         # Page-specific JS (one file per page)
│       ├── variants/                      # Background-stripped Etrian Variant sprites
│       └── variants_original/            # Raw extracted variant sprites
└── CLAUDE.md / README.md
```

---

## Data sources

- **Pokémon Odyssey spreadsheets (v4.1.1)** — the three `.xlsx` files in `docs/`, authored by the original game creator. These are the source of truth for everything Odyssey-specific.
- **PokeAPI** (`https://pokeapi.co`) — used to fill in baseline move/ability data (effect text, power, accuracy, PP, type) for non-custom entries. Responses are cached locally in `pokeapi_cache/`.
- **Pokémon Showdown sprites** — non-variant Pokémon sprites are loaded at runtime from Showdown's CDN (`play.pokemonshowdown.com/sprites/gen5/`).

---

## Notable Odyssey-specific features handled

- **Aether type** — custom 18th type (replacing Fairy); included in the full 18×18 type chart.
- **Etrian Variants (⭐)** — alternate forms with unique sprites, extracted directly from the spreadsheet's embedded images.
- **Stratum level caps** — gated progression system referenced in encounter and boss data.
- **F.O.E.s** — special overworld encounters parsed from the naval/encounter tables.
- **Excel date bug** — the original spreadsheet auto-formats level ranges like `4-2` as dates (`2022-04-02`). The parser reverses this to recover the correct level range.

---

## Contributing

This is a personal side project, but if you spot a data bug or want to suggest an improvement, feel free to open an issue or a PR. Just keep in mind the spreadsheets are the authoritative source — if data looks wrong here, check them first.

---

## License

This project contains no original game assets and makes no claim over any Pokémon or Etrian Odyssey intellectual property. The code (HTML/CSS/JS/Python) is provided as-is for personal, non-commercial use.
