# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## What this directory is

Reference data for **Pokémon Odyssey v4.1.1**, a fan-made Pokémon game with Etrian Odyssey mechanics. It is **not a code repository** — it contains three Excel workbooks used as gameplay/strategy references. Any task here is a data lookup, extraction, or transformation task against these spreadsheets.

Files:
- `Pokémon Stats, Learnset etc (v4.1.1).xlsx` — species data (types, abilities, evolutions, level-up learnsets, base stats), type chart, Etrian Variants, new moves/abilities.
- `Wild encounters, Items and TMs (v4.1.1).xlsx` — wild encounter tables by location, naval explorations, Wonder Trade, item spawns, shops, pickup, gathering/mining, TM and Move Tutor locations.
- `Level Cap, Boss, Miniboss, Sea Map, Sidequests (v4.1.1).xlsx` — stratum level caps, boss/miniboss teams, Abyssal God guide, Lords of the Sea, Sea Bosses, Sidequests.

The build pipeline (`build_data.py`) parses these workbooks and outputs JSON to `site/data/`, which powers a static HTML/JS site hosted on GitHub Pages.

## Version control workflow

This project is tracked at https://github.com/nishxpatel/Pokemon-Odyssey-Docs-App.

- After finishing a logical unit of work (a feature, a bug fix, a parser change, a data regeneration), stage the relevant files and create a commit. Don't batch unrelated changes into one commit.
- Write clean, descriptive commit messages focused on the *why* of the change, not just the *what*. One-line subject under ~70 chars; add a body if context is needed.
- Push to `origin/main` after each commit (or after a small group of related commits) so the remote stays in sync.
- Never force-push, never rewrite published history, never `git add -A` blindly (the `.gitignore` already excludes `.claude/`, `__pycache__/`, `.DS_Store`, `*.pyc` — but stage explicit paths anyway to avoid accidentally committing regenerated junk).

## Glossary

- **Stratum** — Etrian Odyssey dungeon tier; progression gate for level caps and postgame content. Strata 1–8 exist.
- **F.O.E.** — Etrian Odyssey "Formido Oppugnatura Exsequens," used here for overworld super-encounters.
- **Etrian Variant** — Odyssey's equivalent of a regional form; denoted by ⭐.
- **Aether** — custom 19th type added by Odyssey.
- **Battle Bond** — a custom alternate form distinct from Etrian Variants; tagged `is_battle_bond` in the JSON.
- **canon()** — the internal normalization function: strips accents, uppercases, removes all non-alphanumeric characters. Used as the join key between workbooks and across parsers.
