// Pokédex grid + sortable table — search, sort, multi-filter, view toggle.

const SPRITE_URL = (slug) => `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`;

const grid = document.getElementById("grid");
const tableWrap = document.getElementById("dex-table-wrap");
const tableBody = document.getElementById("dex-table-body");
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
const viewToggle = document.getElementById("view-toggle");

let DATA = [];
let customAbilitySlugs = new Set();
let activeTypes = new Set();

// Sort state — single source of truth shared by the dropdown and the
// table headers. Either input mutates this and calls render().
let sortKey = "dex";
let sortDir = "asc";

// View mode persists across sessions.
const VIEW_KEY = "podx_view_mode";
let viewMode = (localStorage.getItem(VIEW_KEY) === "table") ? "table" : "cards";

function typeBadge(t) {
  return `<span class="type sm ${typeClass(t)}">${escapeHTML(t)}</span>`;
}

function spriteFor(p) {
  if (p.variant_sprite && p.variant_sprite.normal) {
    return p.variant_sprite.normal;
  }
  return p.sprite_slug ? SPRITE_URL(p.sprite_slug) : null;
}

function abilityName(a) {
  return typeof a === "string" ? a : (a && a.name) || "";
}

function abilityLink(a) {
  const name = abilityName(a);
  if (!name) return "";
  const slug = (typeof a === "object" && a) ? a.slug : null;
  const isCustom = slug && customAbilitySlugs.has(slug);
  const nameHtml = isCustom ? `<span class="odyssey">${escapeHTML(name)}</span>` : escapeHTML(name);
  return slug
    ? `<a href="ability.html?slug=${encodeURIComponent(slug)}">${nameHtml}</a>`
    : nameHtml;
}

/* ---------- Card view ---------- */

function cardHTML(p) {
  const src = spriteFor(p);
  const initial = (p.name || "?")[0];
  const spriteImg = src
    ? `<img class="sprite" loading="lazy" src="${src}" alt="${escapeHTML(p.name)}"
          onerror="this.outerHTML='<div class=\\'sprite-placeholder\\'>${escapeHTML(initial)}</div>'">`
    : `<div class="sprite-placeholder">${escapeHTML(initial)}</div>`;

  const nameHtml = p.is_variant ? `<span class="odyssey">${escapeHTML(p.name)}</span>` : escapeHTML(p.name);
  const dexText = p.dex ? `#${p.dex}` : "—";
  let ribbon = "";
  if (p.is_battle_bond) ribbon = `<span class="bb-ribbon">B.B.</span>`;
  else if (p.is_event) ribbon = `<span class="event-ribbon">Event</span>`;

  const total = p.stats && p.stats.total ? `<div class="card-total">BST ${p.stats.total}</div>` : "";

  return `
    <a class="dex-card${p.is_variant ? " odyssey-bg" : ""}" href="pokemon.html?slug=${encodeURIComponent(p.slug)}">
      ${ribbon}
      <div class="dex-num">${dexText}</div>
      ${spriteImg}
      <div class="name">${nameHtml}</div>
      <div class="types">${(p.types || []).map(typeBadge).join("")}</div>
      ${total}
    </a>`;
}

/* ---------- Table view ---------- */

function rowHTML(p) {
  const src = spriteFor(p);
  const initial = (p.name || "?")[0];
  const sprite = src
    ? `<img class="row-sprite" loading="lazy" src="${src}" alt=""
        onerror="this.outerHTML='<div class=\\'row-sprite-placeholder\\'>${escapeHTML(initial)}</div>'">`
    : `<div class="row-sprite-placeholder">${escapeHTML(initial)}</div>`;

  const types = (p.types || []).map(typeBadge).join(" ");
  const abilities = (p.abilities || []).map(abilityLink).join(" <span class='dim'>/</span> ") || `<span class="empty-msg">—</span>`;
  const stats = p.stats || {};
  const cell = (k) => `<td class="num">${stats[k] ?? "—"}</td>`;

  const rowNameHtml = p.is_variant ? `<span class="odyssey">${escapeHTML(p.name)}</span>` : escapeHTML(p.name);
  let badge = "";
  if (p.is_battle_bond) badge = `<span class="row-tag tag-bb">B.B.</span>`;
  else if (p.is_event) badge = `<span class="row-tag tag-event">Event</span>`;

  return `<tr${p.is_variant ? ' class="odyssey-bg"' : ''}>
    <td class="row-sprite-cell"><a href="pokemon.html?slug=${encodeURIComponent(p.slug)}" tabindex="-1">${sprite}</a></td>
    <td class="num dim">${p.dex ? "#" + escapeHTML(p.dex) : "—"}</td>
    <td class="row-name"><a href="pokemon.html?slug=${encodeURIComponent(p.slug)}">${rowNameHtml}</a>${badge}</td>
    <td class="row-types">${types}</td>
    <td class="row-ab">${abilities}</td>
    ${cell("hp")}${cell("atk")}${cell("def")}${cell("spa")}${cell("spd")}${cell("spe")}
    <td class="num bst">${stats.total ?? "—"}</td>
  </tr>`;
}

/* ---------- Sort ---------- */

const STAT_KEYS = new Set(["hp","atk","def","spa","spd","spe","total"]);

function applySort(arr) {
  const sign = sortDir === "asc" ? 1 : -1;
  if (sortKey === "name") {
    return [...arr].sort((a, b) => sign * a.name.localeCompare(b.name));
  }
  if (sortKey === "dex") {
    return [...arr].sort((a, b) => {
      const da = a.dex ? parseInt(a.dex, 10) : 9999;
      const db = b.dex ? parseInt(b.dex, 10) : 9999;
      return sign * (da - db);
    });
  }
  if (sortKey === "types") {
    return [...arr].sort((a, b) =>
      sign * ((a.types?.[0] || "zzz").localeCompare(b.types?.[0] || "zzz")));
  }
  if (sortKey === "abilities") {
    return [...arr].sort((a, b) =>
      sign * ((abilityName((a.abilities || [])[0]) || "zzz")
        .localeCompare(abilityName((b.abilities || [])[0]) || "zzz")));
  }
  if (STAT_KEYS.has(sortKey)) {
    return [...arr].sort((a, b) => {
      const av = (a.stats && a.stats[sortKey]) ?? -1;
      const bv = (b.stats && b.stats[sortKey]) ?? -1;
      return sign * (av - bv);
    });
  }
  return arr;
}

function dropdownValueForState() {
  if (sortKey === "name" && sortDir === "asc") return "name";
  if (sortKey === "dex"  && sortDir === "asc") return "dex";
  if (STAT_KEYS.has(sortKey)) return `${sortKey}-${sortDir}`;
  return "";
}

function syncDropdownFromState() {
  const v = dropdownValueForState();
  // Only set if there's a matching option, else leave unchanged so we
  // don't blank the visible label when sorting by types/abilities/etc.
  if (v && [...sortSel.options].some(o => o.value === v)) {
    sortSel.value = v;
  }
}

function applyDropdownToState() {
  const v = sortSel.value;
  if (v === "name") { sortKey = "name"; sortDir = "asc"; return; }
  if (v === "dex")  { sortKey = "dex";  sortDir = "asc"; return; }
  const m = /^(hp|atk|def|spa|spd|spe|total)-(asc|desc)$/.exec(v);
  if (m) { sortKey = m[1]; sortDir = m[2]; }
}

function updateSortIndicators() {
  for (const th of document.querySelectorAll(".dex-table th[data-sort-key]")) {
    const k = th.dataset.sortKey;
    th.classList.toggle("sort-asc",  k === sortKey && sortDir === "asc");
    th.classList.toggle("sort-desc", k === sortKey && sortDir === "desc");
  }
}

function onHeaderClick(e) {
  const th = e.target.closest("th[data-sort-key]");
  if (!th) return;
  const key = th.dataset.sortKey;
  if (sortKey === key) {
    sortDir = sortDir === "asc" ? "desc" : "asc";
  } else {
    sortKey = key;
    // Numeric columns default to high→low; text columns default to A→Z.
    sortDir = STAT_KEYS.has(key) ? "desc" : "asc";
  }
  syncDropdownFromState();
  render();
}

/* ---------- View mode ---------- */

function setViewMode(mode) {
  viewMode = mode === "table" ? "table" : "cards";
  localStorage.setItem(VIEW_KEY, viewMode);
  for (const btn of viewToggle.querySelectorAll("button")) {
    btn.classList.toggle("active", btn.dataset.view === viewMode);
  }
  grid.style.display      = viewMode === "cards" ? "" : "none";
  tableWrap.style.display = viewMode === "table" ? "" : "none";
  render();
}

/* ---------- Render ---------- */

function render() {
  const q = search.value.trim().toLowerCase();
  const ability = abilitySel.value;
  const filtered = DATA.filter(p => {
    if (variantsOnly.checked && !p.is_variant && !p.is_battle_bond && !p.is_custom_form) return false;
    if (eventOnly.checked && !p.is_event) return false;
    if (wildOnly.checked && !p.has_wild) return false;
    if (finalOnly.checked && (p.evolution_targets || []).length > 0) return false;
    if (activeTypes.size && !(p.types || []).some(t => activeTypes.has(t))) return false;
    if (ability && !(p.abilities || []).some(a => abilityName(a) === ability)) return false;
    if (q) {
      const n = (p.name || "").toLowerCase();
      const d = p.dex || "";
      const an = (p.abilities || []).map(abilityName).join(" ").toLowerCase();
      if (!n.includes(q) && !d.includes(q.replace(/^#/, "")) && !an.includes(q)) return false;
    }
    return true;
  });
  const sorted = applySort(filtered);

  if (viewMode === "cards") {
    grid.innerHTML = sorted.map(cardHTML).join("");
  } else {
    tableBody.innerHTML = sorted.map(rowHTML).join("");
  }
  empty.style.display = sorted.length ? "none" : "block";
  hint.textContent = `${sorted.length} of ${DATA.length} shown.`;
  updateSortIndicators();
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
    const name = abilityName(a);
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
  applyDropdownToState();
  render();
}

async function main() {
  try {
    const [pokedex, meta, abilitiesFile] = await Promise.all([
      fetch("data/pokedex.json").then(r => r.json()),
      fetch("data/meta.json").then(r => r.json()),
      fetch("data/abilities.json").then(r => r.json()),
    ]);
    DATA = pokedex;
    customAbilitySlugs = new Set(abilitiesFile.abilities.filter(a => a.is_custom).map(a => a.slug));
    metaLine.textContent =
      `${meta.game} ${meta.version} · ${meta.counts.species} species ` +
      `(${meta.counts.variants} Etrian variants, ${meta.counts.events} event-only). ` +
      `Default sprites via Pokémon Showdown; variant art extracted from the workbook.`;
    buildChips();
    buildAbilityList();

    sortSel.addEventListener("input", () => { applyDropdownToState(); render(); });
    [search, abilitySel, variantsOnly, eventOnly, wildOnly, finalOnly]
      .forEach(el => el.addEventListener("input", render));
    resetBtn.addEventListener("click", reset);

    // Table header sorting
    document.querySelector(".dex-table thead").addEventListener("click", onHeaderClick);

    // View toggle
    viewToggle.addEventListener("click", e => {
      const btn = e.target.closest("button[data-view]");
      if (!btn) return;
      setViewMode(btn.dataset.view);
    });

    // Initialize from persisted view mode
    setViewMode(viewMode);
  } catch (e) {
    grid.innerHTML = `<p class="empty-msg">Failed to load data: ${escapeHTML(e.message)}. ` +
                     `Run <code>python3 scripts/build_data.py</code>, then serve with <code>python3 -m http.server 8000 --directory site</code>. ` +
                     `<a href="index.html">← back to Home</a></p>`;
  }
}
main();
