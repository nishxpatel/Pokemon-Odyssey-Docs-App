# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this directory is

Reference data for **Pokémon Odyssey v4.1.1**, a fan-made Pokémon game with Etrian Odyssey mechanics (Strata, F.O.E.s, Etrian Variants, a custom "Aether" type). It is **not a code repository** — it contains three Excel workbooks used as gameplay/strategy references. Any task here is a data lookup, extraction, or transformation task against these spreadsheets.

Files:
- `Pokémon Stats, Learnset etc (v4.1.1).xlsx` — species data (types, abilities, evolutions, level-up learnsets, base stats), type chart, Etrian Variants, new moves/abilities, Pokédex index.
- `Wild encounters, Items and TMs (v4.1.1).xlsx` — wild encounter tables by location, naval explorations, Wonder Trade, item spawns, shops, pickup table, gathering/mining, TM and Move Tutor locations.
- `Level Cap, Boss, Miniboss, Sea Map, Sidequests (v4.1.1).xlsx` — stratum level caps, boss/miniboss teams (Hard Mode + Postgame), Abyssal God guide, Lords of the Sea, Sea Bosses, Sidequests.

## Build pipeline & site architecture

### Dependencies

```bash
pip3 install openpyxl Pillow   # openpyxl for xlsx, Pillow for sprite bg removal
```

### Rebuilding JSON data

```bash
python3 build_data.py
```

Parses all three workbooks and writes to `site/data/`:
- `pokedex.json` — full species list (types, stats, abilities, moves, locations, evolution chains, variant sprites)
- `moves.json` / `abilities.json` — custom entries from the sheet + baseline data fetched from PokeAPI
- `items.json` — item sources (shops, pickup, gathering/mining, TMs, move tutors)
- `meta.json` — type list, type chart, summary counts

Also extracts variant sprites from `Etrian Variants` sheet → `site/assets/variants_original/` (raw), then strips solid backgrounds → `site/assets/variants/` (served by the site).

To re-run only background cleaning without re-parsing the workbooks:

```bash
python3 clean_variant_backgrounds.py
```

`clean_variant_backgrounds.py` reads every PNG in `variants_original/`, samples the corner pixel to determine the background color, and flood-fills that color to transparent. It uses strict equality (no tolerance) because the pixel-art sprites have no anti-aliasing, so the background color won't appear in the sprite body.

### Serving locally

```bash
python3 -m http.server 8000 --directory site
```

The site is fully static — no build step, no bundler. Open `http://localhost:8000`.

### Deployment (GitHub Pages)

The site is hosted at **https://nishxpatel.github.io/Pokemon-Odyssey-Docs-App** via GitHub Pages. Deployment is automated: `.github/workflows/pages.yml` triggers on any push to `main` that touches `site/**` or the workflow file itself, uploads `./site` as the Pages artifact, and deploys it. No manual steps required.

### Site architecture

`site/` contains plain HTML pages paired 1:1 with vanilla JS files in `site/assets/`:

| Page | JS file | Purpose |
|---|---|---|
| `index.html` | inline `<script>` | Landing page; fetches `meta.json` for summary counts |
| `pokedex.html` | `app.js` | Grid/table view, search, filters, sort, "final forms only" toggle |
| `pokemon.html` | `detail.js` | Single species detail (stats, moves, evolution chain, type matchups) |
| `moves.html` | `moves-list.js` | Move index with filter by type/category/source |
| `move.html` | `move.js` | Single move detail + Pokémon that learn it |
| `abilities.html` | `abilities-list.js` | Ability index |
| `ability.html` | `ability.js` | Single ability detail + Pokémon with that ability |
| `items.html` | `items-list.js` | Item index with filter by source kind |
| `item.html` | `item.js` | Single item detail (sources, evolution links) |

Each JS file fetches the relevant JSON from `site/data/` at runtime. `types.js` is a shared utility (type badge rendering, type class names, defensive matchup calculator). There is no framework — DOM manipulation is plain JS. View mode (grid vs. table) is persisted to `localStorage`.

Sprites for non-variant Pokémon are loaded from Pokémon Showdown's CDN (`play.pokemonshowdown.com/sprites/gen5/<slug>.png`). Variant and Battle Bond sprites are served from `site/assets/variants/`.

### JSON output schemas

All files live in `site/data/`. Quick field reference for frontend work:

**`pokedex.json`** — top-level array, one object per species:
```
key             string   canon-form name (uppercase, no accents) — internal join key
name            string   display name (title-case, Pokédex sheet)
slug            string   URL-safe slug used in pokemon.html?id=<slug>
sprite_slug     string   Pokémon Showdown CDN slug
dex             string   zero-padded dex number ("001")
is_variant      bool     true = Etrian Variant (⭐); excludes mainline regional forms
is_battle_bond  bool     true = Battle Bond form
types           string[] e.g. ["Grass", "Poison"]
abilities       [{name, slug}]
stats           {hp,atk,def,spa,spd,spe,total}  Odyssey BST (null if missing)
stats_vanilla   {hp,atk,def,spa,spd,spe,total}  Vanilla BST (null if missing)
moves           [{level, name, slug}]  level-up learnset; slug may be null
locations       [{display_name, location, habitat, level, percent}]
evolution_targets [{to_key, to_name, to_slug, condition, kind, items[]}]
family          [{key, name, slug, dex, sprite_slug, is_variant}]  all connected forms
evolution_items string[] item names referenced in this species' own evolves_at string
variant_sprite  {normal, shiny, variant_name} | null  paths relative to site/
is_event        bool     true if only found via EVENT/GIFT/TRADE (no wild encounter)
has_wild        bool     true if has at least one non-event wild location
```

**`moves.json`** — `{"moves": [...]}`:
```
name, slug, type, category, power, accuracy, pp, effect
kind       "new" | "aether" | "reworked" | "baseline"
is_custom  bool
used_by    [{key, slug, name, dex, level}]
```

**`abilities.json`** — `{"abilities": [...]}`:
```
name, slug, effect, kind ("new" | "reworked" | "baseline"), is_custom, used_by[]
```

**`items.json`** — `{"items": [...], "tutors": [...]}`:
```
items[]:  {name, slug, sources: [{kind, ...kind-specific fields}]}
  kind="location" → {location, habitat, note}
  kind="shop"     → {shop, level}
  kind="pickup"   → {percent}
  kind="gather"   → {stratum, method}
  kind="tm"       → {move, location}
tutors[]: [{move, location}]
```

**`meta.json`**:
```
game, version, types (19-element array), type_chart ({attacker: {defender: mult}}
for non-1× entries only), counts (species, with_stats, variants, items, moves, etc.)
```

### PokeAPI cache

Baseline move and ability data (effect text, power, accuracy, PP, type, category) is fetched from `https://pokeapi.co/api/v2` and cached in `pokeapi_cache/` on disk. **This directory is committed** — a full cold fetch takes several minutes, and committing the cache means any clone can rebuild the JSON data instantly. Do not delete it. Cache files are never invalidated automatically; if PokeAPI data needs refreshing for a specific entry, delete `pokeapi_cache/moves/<slug>.json` or `pokeapi_cache/abilitys/<slug>.json` and re-run `build_data.py`.

## Reading the workbooks

```bash
pip3 install openpyxl      # one-time
```

```python
import openpyxl
wb = openpyxl.load_workbook("<file>.xlsx", read_only=True, data_only=True)
ws = wb["<sheet>"]
dim = ws.calculate_dimension(force=True)   # NOTE: force=True required — sheets are unsized
for row in ws.iter_rows(values_only=True):
    ...
```

`data_only=True` returns cached values instead of formulas. `read_only=True` is faster for large sheets but requires the `force=True` dimension call above.

**Exception:** The `New Moves & Abilities` sheet must be opened **without** `read_only=True` to access embedded image objects (type/category icons). See `parse_moves_and_abilities()` in `build_data.py`.

## Layout conventions (read before writing any extractor)

These files are laid out for human eyes, not as relational tables. Expect:

- **Horizontal blocks with gutter columns.** Most sheets repeat a 3-column pattern `(label, value, blank)` across the row so multiple entities sit side by side. Example: in `#1-151`, Bulbasaur occupies cols A–B, Ivysaur D–E, Venusaur G–H, with empty gutters at C, F, I; base stats for the same three Pokémon live further right in cols J–Q (HP/ATK header row, then two stat rows per species).
- **Section headers as caps-rows, then a blank row, then a sub-header, then column labels, then data.** Typical wild-encounter block: `FIBERNIA WOODS` → blank → `TALL GRASS` → `POKÉMON | LEVEL | ENCOUNTER %` → rows. A single sheet interleaves many such blocks — split on location headers, not on row count.
- **Merged cells and blank cells are meaningful as visual grouping**, not data holes to fill.
- **Boss/miniboss sheets** use one block per trainer: a header like `OLYMPIA - ADVENTURERS GUILD` spanning several columns, then the team laid out with stats (Level, HP/ATK/DEF/SpA/SpD/Spe, moves, ability, item) stacked below. `Bosses (Hard Mode)` has many trainers across cols A–X; parse by fixed column stride, not by assuming a single header row.

## Known data gotchas

- **Wild-encounter levels are Excel-autoformatted as dates.** In `Wild encounters.../Pokémon`, the LEVEL column contains strings like `'2022-04-02 00:00:00'`, which is Excel misinterpreting `4-2` (i.e. level range 4–2, meaning levels 2–4) as a date. Any extractor must reverse this: pull month/day from the datetime and render as `LV.<day>-<month>` or the appropriate range. Do not trust the year.
- **Encounter percentages are stored as floats** where `0.2` means 20%.
- **Regional/Etrian Variant markers** appear in names as `⭐` (is a variant) or `(⭐)` (evolves into one). Preserve these when matching names across workbooks — the join key between workbooks is the Pokémon name string, so mis-stripping the star will break lookups.
- **"Aether"** is a custom 19th type (see last column/row of `Type Chart`). Include it in any type-effectiveness logic.
- The `Sea Map` sheet is effectively empty (`A1:A1`) — the map is presumably an embedded image, not cell data.
- **Type and category cells in `New Moves & Abilities` are embedded images, not text** — they read as `None` from openpyxl. `build_data.py` decodes them via MD5 hash of the image bytes (see `TYPE_ICON_HASHES` / `CATEGORY_ICON_HASHES` at the top of `parse_moves_and_abilities`). Any new extractor touching that sheet needs the same approach and must open the workbook without `read_only=True` to access image objects.
- **Some ⭐-flagged species are mainline regional forms, not Etrian Variants.** The `NOT_ETRIAN_VARIANT` set in `build_data.py` tracks these (Alolan Grimer/Muk, Hisuian Voltorb/Electrode/Typhlosion). They keep the ⭐ display marker but the `is_variant` flag is suppressed so the UI doesn't badge them as Etrian Variants.
- **Aether type effectiveness is unknown.** The type chart stores multipliers as cell fill colors; Aether's interactions with other types are not filled in the workbook. The `type_chart` in `meta.json` therefore has no entries for Aether matchups, and the UI shows a disclaimer for affected species.

## Sheet inventory (quick reference)

`Pokémon Stats, Learnset etc`:
- `Type Chart` — 19×19 effectiveness grid, attacker rows × defender cols.
- `Etrian Variants` — variant names with Normal/Shiny art references.
- `New Moves & Abilities` — custom moves and abilities introduced by Odyssey.
- `#1-151`, `#152-251`, `#252-386`, `4th Gen`, `Paradox` — species data blocks (Type/Ability/Evolution/Moves on the left; HP/ATK/DEF/SpA/SpD/Spe stat blocks on the right).
- `Pokédex` — flat `Dex ID | Pokémon` lookup table (the only truly tabular sheet in this file).

`Wild encounters, Items and TMs`:
- `Pokémon` — main-game wild encounters grouped by location → habitat (Tall Grass / Headbutt / Surf / Fishing / etc.).
- `Pokémon (Postgame)` — postgame encounters keyed by stratum/floor.
- `Naval Explorations` — encounters by sea route, including F.O.E. entries.
- `Wonder Trade` — offered Pokémon grouped by region (Kanto/Johto/Hoenn/…).
- `Items`, `Items (Shop)`, `Items (Pickup)`, `GatheringMining` — item sources by location/shop level/pickup percentage/gathering node.
- `TM Location` and `Move Tutors` — the two flat tabular sheets in this file (`Number | Move | Location`).

`Level Cap, Boss, Miniboss, Sea Map, Sidequests`:
- `Level Caps` — stratum → level cap.
- `Bosses (Hard Mode)` and `Bosses (Hard Mode) - Postgame` — full trainer teams with stats/moves.
- `Abyssal God - Bossfight guide`, `Lords of the sea`, `Sea Bosses` — one block per fight.
- `Sidequests` — `# | Name | Location | Description | Reward` (mostly tabular, with an unlock-chain column on the right).

## Version control workflow

This project is tracked at https://github.com/nishxpatel/Pokemon-Odyssey-Docs-App. As you complete work, commit it to git and push to GitHub so progress is never lost and changes are easy to revert.

- After finishing a logical unit of work (a feature, a bug fix, a parser change, a data regeneration), stage the relevant files and create a commit. Don't batch unrelated changes into one commit.
- Write clean, descriptive commit messages focused on the *why* of the change, not just the *what*. One-line subject under ~70 chars; add a body if context is needed.
- Push to `origin/main` after each commit (or after a small group of related commits) so the remote stays in sync.
- Never force-push, never rewrite published history, never `git add -A` blindly (the `.gitignore` already excludes `.claude/`, `__pycache__/`, `.DS_Store`, `*.pyc` — but stage explicit paths anyway to avoid accidentally committing regenerated junk).

## Glossary

- **Stratum** — Etrian Odyssey dungeon tier; progression gate for level caps and postgame content. Strata 1–8 exist.
- **F.O.E.** — Etrian Odyssey "Formido Oppugnatura Exsequens," used here for overworld super-encounters.
- **Etrian Variant** — Odyssey's equivalent of a regional form; denoted by ⭐.
- **Aether** — custom 19th type added by Odyssey.
- **Battle Bond** — a custom alternate form distinct from Etrian Variants; tagged `is_battle_bond` in the JSON and shown with its own UI badge.
- **canon()** — the internal normalization function: strips accents, uppercases, removes all non-alphanumeric characters. Used as the join key between workbooks and across parsers.
