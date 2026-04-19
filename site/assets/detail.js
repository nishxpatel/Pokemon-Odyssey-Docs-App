// Per-Pokémon detail page. URL: pokemon.html?slug=<slug>

const SPRITE_URL      = (slug) => `https://play.pokemonshowdown.com/sprites/home/${slug}.png`;
const SPRITE_FALLBACK = (slug) => `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`;
const MAX_STAT_DISPLAY = 255;

function escapeHTML(s) {
  return (s ?? "").toString().replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function typeBadge(t, sm=false) {
  return `<span class="type ${sm ? "sm" : ""} ${typeClass(t)}">${escapeHTML(t)}</span>`;
}
function statName(key) {
  return ({hp:"HP", atk:"Attack", def:"Defense", spa:"Sp. Atk", spd:"Sp. Def", spe:"Speed"}[key]) || key;
}

function itemSlug(name) {
  return (name || "").toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function linkItem(name) {
  const slug = itemSlug(name);
  return `<a class="item-link" href="item.html?slug=${encodeURIComponent(slug)}">${escapeHTML(name)}</a>`;
}

function linkifyEvolutionCondition(condition, items) {
  if (!condition) return `<span class="empty-msg">—</span>`;
  let s = escapeHTML(condition);
  // Replace each known item mention with a link (longest first, case-insensitive)
  const sorted = [...(items || [])].sort((a, b) => b.length - a.length);
  for (const item of sorted) {
    const re = new RegExp(`\\b${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    s = s.replace(re, m => `<a class="item-link" href="item.html?slug=${encodeURIComponent(itemSlug(item))}">${escapeHTML(m)}</a>`);
  }
  return s;
}

function pokemonSpriteSrc(p) {
  // Use the species-level local variant sprite when it exists; otherwise Showdown.
  if (p.variant_sprite && p.variant_sprite.normal) {
    return p.variant_sprite.normal;
  }
  return SPRITE_URL(p.sprite_slug);
}

function renderStats(stats, vanilla) {
  if (!stats) return `<p class="empty-msg">No stats data.</p>`;
  const order = ["hp","atk","def","spa","spd","spe"];
  const rows = order.map(k => {
    const v = stats[k] ?? 0;
    const pct = Math.min(100, (v / MAX_STAT_DISPLAY) * 100);
    return `
      <tr>
        <td>${statName(k)}</td>
        <td>${v}</td>
        <td><div class="stats-bar"><div class="fill" style="width:${pct}%"></div></div></td>
      </tr>`;
  }).join("");
  const total = stats.total ?? order.reduce((s,k) => s + (stats[k] || 0), 0);
  const vanillaNote = vanilla ? `
    <p class="disclaimer">Vanilla totals:
      ${order.map(k => `${statName(k)} ${vanilla[k] ?? "—"}`).join(" · ")}
      (Total ${vanilla.total ?? "—"})</p>` : "";
  return `
    <table class="stats-table">
      ${rows}
      <tr><td>Total</td><td>${total}</td><td></td></tr>
    </table>${vanillaNote}`;
}

function renderMatchups(types) {
  if (!types.length) return `<p class="empty-msg">No type data.</p>`;
  const matchups = defensiveMatchups(types);
  const groups = { 0: [], 0.25: [], 0.5: [], 1: [], 2: [], 4: [] };
  for (const t of TYPE_LIST) {
    const m = matchups[t];
    if (groups[m] === undefined) groups[m] = [];
    groups[m].push(t);
  }
  const labelFor = m => ({0:"0×", 0.25:"¼×", 0.5:"½×", 1:"1×", 2:"2×", 4:"4×"}[m] || `${m}×`);
  const classFor = m => ({0:"x0", 0.25:"x025", 0.5:"x05", 1:"x1", 2:"x2", 4:"x4"}[m] || "x1");
  const keys = [4, 2, 0.5, 0.25, 0].filter(k => groups[k] && groups[k].length);
  if (!keys.length) return `<p class="empty-msg">Neutral to all types.</p>`;
  const sections = keys.map(k => `
    <h3>${labelFor(k)} damage from</h3>
    <div class="weakness-grid">
      ${groups[k].map(t => `
        <div class="weakness-cell ${classFor(k)}">
          ${typeBadge(t, true)}
          <span class="mult">${labelFor(k)}</span>
        </div>
      `).join("")}
    </div>`).join("");
  const hasAether = types.includes("Aether") || keys.some(k => groups[k].includes("Aether"));
  const note = hasAether
    ? `<p class="disclaimer">Aether is Pokémon Odyssey's custom type; effectiveness values aren't encoded in the source workbook (they're shown via cell fill color). Treated as neutral here.</p>`
    : "";
  return sections + note;
}

function renderMoves(moves, customMoveSlugs) {
  if (!moves || !moves.length) return `<p class="empty-msg">No learnset data.</p>`;
  const rows = moves.map(m => {
    const lvl = m.level === 1 ? "Start" : m.level;
    const isCustom = m.slug && customMoveSlugs.has(m.slug);
    const newTag = isCustom ? `<span class="new-move">NEW</span>` : "";
    const nameCell = m.slug
      ? `<a href="move.html?slug=${encodeURIComponent(m.slug)}">${escapeHTML(m.name)}</a>${newTag}`
      : `${escapeHTML(m.name)}${newTag}`;
    return `<tr>
      <td class="lv">${escapeHTML(String(lvl))}</td>
      <td class="move-name">${nameCell}</td>
    </tr>`;
  }).join("");
  return `
    <table class="learnset">
      <thead><tr><th>Lv.</th><th>Move</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderLocations(locs, isEvent) {
  if (!locs || !locs.length) {
    return `<p class="empty-msg">Not found in wild encounter tables.<br>
            <span class="dim">May be obtainable via trade, evolution only, or postgame content not yet indexed.</span></p>`;
  }
  const sorted = [...locs].sort((a, b) =>
    (a.location || "").localeCompare(b.location || "") ||
    (a.habitat  || "").localeCompare(b.habitat  || "")
  );
  const rows = sorted.map(l => {
    let pct;
    if (typeof l.percent === "number") pct = `${Math.round(l.percent * 100)}%`;
    else pct = l.percent || "—";
    const habitatBadge = l.habitat
      ? `<span class="habitat-badge habitat-${(l.habitat || "").toLowerCase().replace(/[^a-z]/g, "")}">${escapeHTML(l.habitat)}</span>`
      : "—";
    return `<tr>
      <td>${escapeHTML(l.location || "—")}</td>
      <td>${habitatBadge}</td>
      <td>${escapeHTML(l.level || "—")}</td>
      <td class="pct">${escapeHTML(pct)}</td>
    </tr>`;
  }).join("");
  return `
    <table class="locations">
      <thead><tr><th>Location</th><th>Method</th><th>Level</th><th>Rate</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderEvolutionChain(p, byKey) {
  // No targets and not a successor of anyone → standalone
  const family = p.family || [];
  if (family.length <= 1 && !(p.evolution_targets || []).length) {
    return `<p class="empty-msg">Does not evolve.</p>`;
  }

  // Build the chain: locate the root(s) (members with no incoming edges within family)
  const familyKeys = new Set(family.map(f => f.key));
  // Compute incoming edges for each family member by checking other family members' targets
  const incoming = {};
  for (const f of family) {
    const sp = byKey.get(f.key);
    if (!sp) continue;
    for (const t of (sp.evolution_targets || [])) {
      if (familyKeys.has(t.to_key)) {
        (incoming[t.to_key] ||= []).push({ from: f.key, condition: t.condition, items: t.items });
      }
    }
  }
  const roots = family.filter(f => !(incoming[f.key] && incoming[f.key].length));

  // Render as a tree of stages; each row = one stage
  const renderNode = (key) => {
    const f = family.find(x => x.key === key);
    if (!f) return "";
    const sp = byKey.get(key);
    const sprite = sp && sp.variant_sprite && sp.variant_sprite.normal
      ? sp.variant_sprite.normal
      : `https://play.pokemonshowdown.com/sprites/gen5/${f.sprite_slug}.png`;
    const variantTag = f.is_variant ? `<span class="variant-ribbon" style="position:static; display:inline-block; margin-left:.3rem;">Variant</span>` : "";
    const isCurrent = key === p.key;
    return `
      <div class="evo-node ${isCurrent ? "current" : ""}">
        <a href="pokemon.html?slug=${encodeURIComponent(f.slug)}">
          <img class="sprite" loading="lazy" src="${sprite}" alt="${escapeHTML(f.name)}"
               onerror="this.onerror=null; this.src='https://play.pokemonshowdown.com/sprites/gen5/${f.sprite_slug}.png';">
          <div class="name">${escapeHTML(f.name)}${variantTag}</div>
          <div class="dim">${f.dex ? "#" + escapeHTML(f.dex) : ""}</div>
        </a>
      </div>`;
  };

  const renderArrow = (cond, items) => `
    <div class="evo-arrow">
      <div class="arrow">→</div>
      <div class="cond">${linkifyEvolutionCondition(cond, items || [])}</div>
    </div>`;

  // BFS render
  const visited = new Set();
  const renderFromRoot = (rootKey) => {
    visited.add(rootKey);
    const sp = byKey.get(rootKey);
    const targets = sp ? (sp.evolution_targets || []).filter(t => familyKeys.has(t.to_key)) : [];
    if (!targets.length) return renderNode(rootKey);

    // Multi-branch row
    const branches = targets.map(t => `
      <div class="evo-branch">
        ${renderArrow(t.condition, t.items)}
        ${renderFromRoot(t.to_key)}
      </div>`).join("");
    return `
      <div class="evo-row">
        ${renderNode(rootKey)}
        <div class="evo-branches">${branches}</div>
      </div>`;
  };

  return `<div class="evo-chain">${roots.map(r => renderFromRoot(r.key)).join("")}</div>`;
}

function renderHeader(p) {
  const dex = p.dex ? `#${p.dex}` : "—";
  const name = (p.is_variant ? `<span class="star">★</span> ` : "") + escapeHTML(p.name || p.display_name);
  const initial = escapeHTML((p.name || "?")[0]);
  const localSpr = p.variant_sprite && p.variant_sprite.normal;
  let sprite;
  if (localSpr) {
    sprite = `<img class="detail-sprite" src="${escapeHTML(localSpr)}" alt="${escapeHTML(p.name)}">`;
  } else if (p.sprite_slug) {
    sprite = `<img class="detail-sprite" src="${SPRITE_URL(p.sprite_slug)}" alt="${escapeHTML(p.name)}"
        data-fallback="${SPRITE_FALLBACK(p.sprite_slug)}"
        onerror="if(!this.dataset.fallbackUsed){this.dataset.fallbackUsed=1;this.src=this.dataset.fallback;}else{this.outerHTML='<div class=\\'detail-sprite-placeholder\\'>${initial}</div>';}">`;
  } else {
    sprite = `<div class="detail-sprite-placeholder">${initial}</div>`;
  }

  // Shiny variant sprite preview
  let shinyPreview = "";
  if (p.variant_sprite && p.variant_sprite.shiny) {
    shinyPreview = `<img class="detail-sprite-shiny" src="${escapeHTML(p.variant_sprite.shiny)}" alt="Shiny ${escapeHTML(p.name)}" title="Shiny variant">`;
  }

  let badges = "";
  if (p.is_variant) badges += `<span class="detail-variant-tag">Etrian Variant${p.variant_sprite && p.variant_sprite.variant_name ? `: ${escapeHTML(p.variant_sprite.variant_name)}` : ""}</span>`;
  if (p.is_battle_bond) badges += `<span class="detail-bb-tag">Battle Bond form</span>`;
  if (p.is_event)   badges += `<span class="detail-event-tag">Event / Gift only</span>`;

  return `
    <section class="detail-header">
      <div class="sprite-wrap">${sprite}${shinyPreview}</div>
      <div class="detail-title">
        <div class="dex-num">${dex}</div>
        <div class="name">${name}</div>
        <div class="types">${(p.types || []).map(t => typeBadge(t)).join("")}</div>
        ${badges}
      </div>
    </section>`;
}

function renderInfo(p, customAbilitySlugs) {
  const abilityCell = (p.abilities || []).map(a => {
    if (typeof a === "string") return escapeHTML(a);
    const isCustom = a.slug && customAbilitySlugs && customAbilitySlugs.has(a.slug);
    const tag = isCustom ? `<span class="new-move">NEW</span>` : "";
    if (a.slug) {
      return `<a href="ability.html?slug=${encodeURIComponent(a.slug)}">${escapeHTML(a.name)}</a>${tag}`;
    }
    return escapeHTML(a.name) + tag;
  }).join(" <span style='color:var(--text-dim)'>/</span> ");
  const abilityRow = (p.abilities || []).length
    ? `<tr><td>Abilities</td><td>${abilityCell}</td></tr>`
    : `<tr><td>Abilities</td><td class="empty-msg">—</td></tr>`;

  let evoRow;
  if (p.evolves_at) {
    evoRow = `<tr><td>Evolves</td><td>${linkifyEvolutionCondition(p.evolves_at, p.evolution_items || [])}</td></tr>`;
  } else {
    evoRow = `<tr><td>Evolution</td><td class="empty-msg">Does not evolve (or final stage)</td></tr>`;
  }

  const eventRow = p.is_event
    ? `<tr><td>Availability</td><td><span class="detail-event-tag" style="margin:0">Event / Gift only</span></td></tr>`
    : "";
  const source = `<tr><td>Source sheet</td><td>${escapeHTML(p.source_sheet)}</td></tr>`;
  return `
    <table class="info-table">
      <tr><td>Dex №</td><td>${p.dex ? "#" + escapeHTML(p.dex) : '<span class="empty-msg">Not indexed (Paradox/new species)</span>'}</td></tr>
      <tr><td>Types</td><td>${(p.types || []).map(t => typeBadge(t)).join(" ")}</td></tr>
      ${abilityRow}
      ${evoRow}
      ${eventRow}
      ${source}
    </table>`;
}

async function main() {
  const params = new URLSearchParams(location.search);
  const slugQ = params.get("slug");
  const dexQ = params.get("dex");
  const root = document.getElementById("root");
  try {
    const [pokedex, movesFile, abilitiesFile] = await Promise.all([
      fetch("data/pokedex.json").then(r => r.json()),
      fetch("data/moves.json").then(r => r.json()),
      fetch("data/abilities.json").then(r => r.json()),
    ]);
    const customMoveSlugs = new Set(movesFile.moves.filter(m => m.is_custom).map(m => m.slug));
    const customAbilitySlugs = new Set(abilitiesFile.abilities.filter(a => a.is_custom).map(a => a.slug));
    const byKey = new Map(pokedex.map(p => [p.key, p]));

    let p = null;
    if (slugQ) p = pokedex.find(x => x.slug === slugQ);
    if (!p && dexQ) p = pokedex.find(x => x.dex === String(dexQ).padStart(3, "0"));
    if (!p) {
      root.innerHTML = `<p>Pokémon not found. <a href="index.html">← back to Pokédex</a></p>`;
      return;
    }
    document.title = `${p.name} — Pokémon Odyssey Pokédex`;
    root.innerHTML = `
      ${renderHeader(p)}
      <div class="panels">
        <div class="panel">
          <h2>Info</h2>
          ${renderInfo(p, customAbilitySlugs)}
        </div>
        <div class="panel">
          <h2>Base Stats (Odyssey)</h2>
          ${renderStats(p.stats, p.stats_vanilla)}
        </div>
      </div>
      <section>
        <h2>Evolution Chain</h2>
        ${renderEvolutionChain(p, byKey)}
      </section>
      <section>
        <h2>Type Defenses</h2>
        ${renderMatchups(p.types || [])}
      </section>
      <div class="panels">
        <div class="panel">
          <h2>Level-Up Moves</h2>
          ${renderMoves(p.moves, customMoveSlugs)}
        </div>
        <div class="panel">
          <h2>Wild Locations</h2>
          ${renderLocations(p.locations, p.is_event)}
        </div>
      </div>`;
  } catch (e) {
    root.innerHTML = `<p>Failed to load data: ${escapeHTML(e.message)}. Ensure you're serving via <code>python3 -m http.server</code>.</p>`;
  }
}
main();
