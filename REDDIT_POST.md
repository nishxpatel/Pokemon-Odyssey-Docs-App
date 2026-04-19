# I built an interactive docs site for Pokémon Odyssey—just started the game and wanted a better reference experience

Hey everyone! I just picked up **Pokémon Odyssey** and fell in love with it immediately. The Etrian Odyssey mechanics mixed with Pokémon are so good. But honestly? Looking things up in the Excel spreadsheets felt clunky, especially mid-playthrough when I wanted quick answers about type matchups, move pools, or where to find an item.

I'd been using PokémonDB for vanilla games, so I thought: *why not build that experience for Odyssey?* That's how this happened.

## What I built

**[Pokémon Odyssey Docs App](https://nishxpatel.github.io/Pokemon-Odyssey-Docs-App)** — a fully static, searchable reference site powered by the official spreadsheets. It's totally free, no ads, no tracking, and works offline once it loads.

### Features:
- **Pokédex** — Search by name, filter by type, sort by stats, toggle "final forms only"
- **Type Chart** — Full 19×19 effectiveness table including the custom **Aether type**
- **Moves** — Browse all custom Odyssey moves + vanilla ones with their learnable Pokémon
- **Abilities** — Search all abilities and see which Pokémon get them
- **Items** — See sources (shops, pickup, gathering, TMs, move tutors) for every item
- **Wild Encounters** — Find Pokémon by location and stratum
- **Etrian Variants** — Mark all the ⭐-flagged alternate forms with their unique sprites

It's built with vanilla HTML/CSS/JS—no frameworks, no build steps, just pure static goodness.

## Why I'm sharing it

This is a personal project, but it's genuinely useful, and I'd love feedback from the community. If you spot data bugs, have feature ideas, or just want to tell me what would make it better, I'm all ears.

Also—full credit where it's due: I leaned **heavily** on Claude (AI) while building this. From parsing spreadsheets to stripping Etrian Variant backgrounds to the whole UI, Claude was my pair programmer. Huge thanks to that tool.

---

**GitHub:** https://github.com/nishxpatel/Pokemon-Odyssey-Docs-App  
**Live Site:** https://nishxpatel.github.io/Pokemon-Odyssey-Docs-App

Open to issues, PRs, and feedback! Enjoy, and thanks for making Odyssey so cool to play.
