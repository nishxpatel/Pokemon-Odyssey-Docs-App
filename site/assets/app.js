// Pokédex grid — search, sort, multi-filter.

const SPRITE_URL = (slug) => `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`;

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const sortSel = document.getElementById("sort");
const abilitySel = document.getElementById("ability");
const variantsOnly = document.getElementById("variants-only");
const eventOnly = document.getElementById("event-only");
const wildOnly = document.getElementById("wild-only");
const finalOnly = document.getElementById("final-only");
const chips = document.getElementById("type-chips");
const empty = document.getElementById("empty");
const metaLine = document.getElementById("meta-line");
const hint = document.getElementById("active-hint");
const resetBtn = document.getElementById("reset-btn");

let DATA = [];
let activeTypes = new Set();

function escapeHTML(s) {
  return (s ?? "").toString().replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function typeBadge(t) {
  return `<span class="type sm ${typeClass(t)}">${escapeHTML(t)}</span>`;
}

function spriteFor(p) {
  // Local variant sprite first (extracted from the Excel file)
  if (p.variant_sprite && p.variant_sprite.normal) {
    return p.variant_sprite.normal;
  }
  return p.sprite_slug ? SPRITE_URL(p.sprite_slug) : null;
}

function cardHTML(p) {
  const src = spriteFor(p);
  const initial = (p.name || "?")[0];
  const spriteImg = src
    ? `<img class="sprite" loading="lazy" src="${src}" alt="${escapeHTML(p.name)}"
          onerror="this.outerHTML='<div class=\\'sprite-placeholder\\'>${escapeHTML(initial)}</div>'">`
    : `<div class="sprite-placeholder">${escapeHTML(initial)}</div>`;

  const starPrefix = p.is_variant ? `<span class="star">★</span>` : "";
  const dexText = p.dex ? `#${p.dex}` : "—";
  let ribbon = "";
  if (p.is_variant) ribbon = `<span class="variant-ribbon">Variant</span>`;
  else if (p.is_battle_bond) ribbon = `<span class="bb-ribbon">B.B.</span>`;
  else if (p.is_event) ribbon = `<span class="event-ribbon">Event</span>`;

  const total = p.stats && p.stats.total ? `<div class="card-total">BST ${p.stats.total}</div>` : "";

  return `
    <a class="dex-card" href="pokemon.html?slug=${encodeURIComponent(p.slug)}">
      ${ribbon}
      <div class="dex-num">${dexText}</div>
      ${spriteImg}
      <div class="name">${starPrefix}${escapeHTML(p.name)}</div>
      <div class="types">${(p.types || []).map(typeBadge).join("")}</div>
      ${total}
    </a>`;
}

function statKeyFromSort(value) {
  // returns [statKey, dir] or null
  const m = /^(hp|atk|def|spa|spd|spe|total)-(asc|desc)$/.exec(value);
  return m ? [m[1], m[2]] : null;
}

function applySort(arr) {
  const v = sortSel.value;
  if (v === "name") {
    return [...arr].sort((a, b) => a.name.localeCompare(b.name));
  }
  if (v === "dex") {
    return [...arr].sort((a, b) => {
      const da = a.dex ? parseInt(a.dex, 10) : 9999;
      const db = b.dex ? parseInt(b.dex, 10) : 9999;
      return da - db;
    });
  }
  const sk = statKeyFromSort(v);
  if (sk) {
    const [key, dir] = sk;
    const sign = dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const av = (a.stats && a.stats[key]) ?? -1;
      const bv = (b.stats && b.stats[key]) ?? -1;
      return sign * (av - bv);
    });
  }
  return arr;
}

function render() {
  const q = search.value.trim().toLowerCase();
  const ability = abilitySel.value;
  const filtered = DATA.filter(p => {
    if (variantsOnly.checked && !p.is_variant) return false;
    if (eventOnly.checked && !p.is_event) return false;
    if (wildOnly.checked && !p.has_wild) return false;
    if (finalOnly.checked && (p.evolution_targets || []).length > 0) return false;
    if (activeTypes.size && !(p.types || []).some(t => activeTypes.has(t))) return false;
    if (ability && !(p.abilities || []).some(a => (typeof a === "string" ? a : a.name) === ability)) return false;
    if (q) {
      const n = (p.name || "").toLowerCase();
      const d = p.dex || "";
      const an = (p.abilities || []).map(a => typeof a === "string" ? a : a.name).join(" ").toLowerCase();
      if (!n.includes(q) && !d.includes(q.replace(/^#/, "")) && !an.includes(q)) return false;
    }
    return true;
  });
  const sorted = applySort(filtered);
  grid.innerHTML = sorted.map(cardHTML).join("");
  empty.style.display = sorted.length ? "none" : "block";
  hint.textContent = `${sorted.length} of ${DATA.length} shown.`;
}

function buildChips() {
  chips.innerHTML = TYPE_LIST.map(t =>
    `<span class="type-chip type ${typeClass(t)}" data-type="${t}">${t}</span>`
  ).join("");
  chips.addEventListener("click", e => {
    const el = e.target.closest(".type-chip");
    if (!el) return;
    const t = el.dataset.type;
    if (activeTypes.has(t)) { activeTypes.delete(t); el.classList.remove("active"); }
    else { activeTypes.add(t); el.classList.add("active"); }
    render();
  });
}

function buildAbilityList() {
  const set = new Set();
  for (const p of DATA) for (const a of (p.abilities || [])) {
    const name = typeof a === "string" ? a : a.name;
    if (name) set.add(name);
  }
  const sorted = [...set].sort((a, b) => a.localeCompare(b));
  abilitySel.innerHTML = `<option value="">All abilities</option>` +
    sorted.map(a => `<option value="${escapeHTML(a)}">${escapeHTML(a)}</option>`).join("");
}

function reset() {
  search.value = "";
  sortSel.value = "dex";
  abilitySel.value = "";
  variantsOnly.checked = false;
  eventOnly.checked = false;
  wildOnly.checked = false;
  finalOnly.checked = false;
  activeTypes.clear();
  for (const c of chips.querySelectorAll(".type-chip.active")) c.classList.remove("active");
  render();
}

async function main() {
  try {
    const [pokedex, meta] = await Promise.all([
      fetch("data/pokedex.json").then(r => r.json()),
      fetch("data/meta.json").then(r => r.json()),
    ]);
    DATA = pokedex;
    metaLine.textContent =
      `${meta.game} ${meta.version} · ${meta.counts.species} species ` +
      `(${meta.counts.variants} Etrian variants, ${meta.counts.events} event-only). ` +
      `Default sprites via Pokémon Showdown; variant art extracted from the workbook.`;
    buildChips();
    buildAbilityList();
    [search, sortSel, abilitySel, variantsOnly, eventOnly, wildOnly, finalOnly]
      .forEach(el => el.addEventListener("input", render));
    resetBtn.addEventListener("click", reset);
    render();
  } catch (e) {
    grid.innerHTML = `<p class="empty-msg">Failed to load data: ${escapeHTML(e.message)}. ` +
                     `Run <code>python3 build_data.py</code>, then serve with <code>python3 -m http.server 8000</code>.</p>`;
  }
}
main();
