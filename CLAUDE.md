# CLAUDE.md

## What this is

Reference data for **Pokémon Odyssey v4.1.1**, a fan-made Pokémon game with Etrian Odyssey mechanics. Three Excel workbooks are the source of truth; `build_data.py` parses them into JSON in `site/data/`, which a static HTML/JS site consumes.

## Critical data gotchas

These are non-obvious and will cause real bugs if missed:

- **Wild-encounter levels are Excel-autoformatted as dates.** The LEVEL column in the `Pokémon` sheet contains strings like `'2022-04-02 00:00:00'` — Excel misinterpreting `4-2` (level range 4–2) as April 2nd. Reverse this by pulling month/day and rendering as `LV.<day>-<month>`. Do not trust the year.
- **Encounter percentages are floats** where `0.2` means 20%.
- **⭐ must be preserved in names used as cross-workbook join keys.** Names like `Pikachu ⭐` or `Raichu (⭐)` must match exactly across workbooks — stripping the star breaks lookups.
- **Type and category cells in `New Moves & Abilities` are embedded images, not text** — they read as `None` from openpyxl. `build_data.py` identifies them via MD5 hash of the image bytes (`TYPE_ICON_HASHES` / `CATEGORY_ICON_HASHES`). That sheet must be opened **without** `read_only=True` to access image objects.
- **Some ⭐-flagged species are mainline regional forms, not Etrian Variants.** The `NOT_ETRIAN_VARIANT` set in `build_data.py` tracks these (Alolan Grimer/Muk, Hisuian Voltorb/Electrode/Typhlosion). They keep the ⭐ marker but `is_variant` is suppressed.
- **Fairy type does not exist in this game.** The type chart has 18 types; Aether is the 18th, replacing Fairy. No Pokémon have Fairy type. Do not add Fairy to `TYPE_LIST` or the types array in `meta.json`.
- **Aether type effectiveness is fully known** (parsed from cell fill colors in the Type Chart sheet). Key interactions: Poison→Aether 2×, Dark→Aether 2×, Aether→Dark 0.5×, Aether→Poison 0.5×, Aether→Aether 0.5×, Flying/Ground/Fire/Water→Aether 0.5×.
- **This game has custom non-Aether interactions** that differ from vanilla Gen 6+: Poison→Water 2×, Psychic→Ice 0.5×, Dark→Ice 0.5×. These are intentional — do not "correct" them to vanilla.
- **openpyxl on read-only sheets requires `force=True`:** call `ws.calculate_dimension(force=True)` — sheets are unsized without it. Exception: `New Moves & Abilities` must be opened without `read_only=True` (see above).

## Layout conventions

These workbooks are laid out for human eyes, not as relational tables:

- **Horizontal blocks with gutter columns.** Most sheets repeat a 3-column `(label, value, blank)` pattern across the row so multiple entities sit side by side (e.g. Bulbasaur in cols A–B, Ivysaur in D–E, Venusaur in G–H, with empty gutters at C, F, I).
- **Section headers → blank → sub-header → column labels → data.** Wild-encounter example: `FIBERNIA WOODS` → blank → `TALL GRASS` → `POKÉMON | LEVEL | %` → data rows. Split on location headers, not on row count.
- **Boss/miniboss sheets use fixed column stride**, not a single header row. Parse `Bosses (Hard Mode)` by stride — many trainers run across cols A–X.

## Glossary

- **Stratum** — Etrian Odyssey dungeon tier; progression gate for level caps and postgame content. Strata 1–8.
- **F.O.E.** — overworld super-encounter ("Formido Oppugnatura Exsequens").
- **Etrian Variant** — Odyssey's regional-form equivalent; denoted by ⭐.
- **Aether** — custom 18th type; replaces Fairy (which does not exist in this game).
- **Battle Bond** — custom alternate form distinct from Etrian Variants; tagged `is_battle_bond` in JSON.
- **canon()** — internal normalization: strips accents, uppercases, removes all non-alphanumeric characters. Used as the join key between workbooks.

## Version control

Repo: https://github.com/nishxpatel/Pokemon-Odyssey-Docs-App

- Commit after each logical unit of work; don't batch unrelated changes.
- Push to `origin/main` after each commit so the remote stays in sync.
- Stage explicit file paths — never `git add -A` blindly.
