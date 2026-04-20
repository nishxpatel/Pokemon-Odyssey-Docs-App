// Team Builder — build a team of up to 6 Pokémon and see live coverage
// calculated against the Odyssey type chart (see types.js for TYPE_CHART,
// TYPE_LIST, defensiveMatchups, offensiveMatchups). State is persisted in
// localStorage and can be shared via a ?team=slug1,slug2,… URL parameter.

const SPRITE_URL = (slug) => `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`;
const TEAM_SIZE = 6;
const STORAGE_KEY = "podx_team_v1";

// --- DOM refs --------------------------------------------------------------

const teamEl        = document.getElementById("tb-team");
const metaEl        = document.getElementById("tb-meta");
const countEl       = document.getElementById("tb-count");
const clearBtn      = document.getElementById("tb-clear");
const shareBtn      = document.getElementById("tb-share");
const shareStatusEl = document.getElementById("tb-share-status");

const defMatrixEl   = document.getElementById("tb-def-matrix");
const defSummaryEl  = document.getElementById("tb-def-summary");
const offCoverageEl = document.getElementById("tb-off-coverage");
const gapsEl        = document.getElementById("tb-strengths-gaps");
const typeDistEl    = document.getElementById("tb-type-dist");

const pickerEl      = document.getElementById("tb-picker");
const pickerSearch  = document.getElementById("tb-picker-search");
const pickerChips   = document.getElementById("tb-picker-chips");
const pickerList    = document.getElementById("tb-picker-list");
const pickerEmpty   = document.getElementById("tb-picker-empty");
const pickerClose   = document.getElementById("tb-picker-close");

// --- State ----------------------------------------------------------------

/** @type {Array<object|null>} */
let team = new Array(TEAM_SIZE).fill(null);
/** @type {Array<object>} */
let POKEDEX = [];
/** @type {Map<string, object>} */
let POKEDEX_BY_SLUG = new Map();

// Picker state — which slot is currently being filled, plus its filters.
let pickerSlotIdx = -1;
let pickerTypeFilter = new Set();

// --- Helpers --------------------------------------------------------------

function spriteFor(p) {
  if (!p) return null;
  if (p.variant_sprite && p.variant_sprite.normal) return p.variant_sprite.normal;
  return p.sprite_slug ? SPRITE_URL(p.sprite_slug) : null;
}

function typeBadge(t, sm = true) {
  return `<span class="type ${sm ? "sm" : ""} ${typeClass(t)}">${escapeHTML(t)}</span>`;
}

function abilityName(a) {
  return typeof a === "string" ? a : (a && a.name) || "";
}

function multLabel(m) {
  if (m === 0)    return "0×";
  if (m === 0.25) return "¼×";
  if (m === 0.5)  return "½×";
  if (m === 1)    return "1×";
  if (m === 1.5)  return "1½×";
  if (m === 2)    return "2×";
  if (m === 3)    return "3×";
  if (m === 4)    return "4×";
  return `${m}×`;
}

function multClass(m) {
  if (m === 0)    return "x0";
  if (m === 0.25) return "x025";
  if (m === 0.5)  return "x05";
  if (m === 1.5)  return "x15";
  if (m === 2)    return "x2";
  if (m === 3)    return "x3";
  if (m === 4)    return "x4";
  return "x1";
}

function bucketOf(m) {
  if (m === 0)   return "immune";
  if (m < 1)     return "resist";
  if (m > 1)     return "weak";
  return "neutral";
}

// --- Persistence ----------------------------------------------------------

function loadTeam() {
  // URL takes precedence so share links work even on shared machines.
  const params = new URLSearchParams(location.search);
  const urlTeam = params.get("team");
  if (urlTeam) {
    const slugs = urlTeam.split(",").map(s => s.trim()).filter(Boolean);
    return hydrate(slugs);
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Array(TEAM_SIZE).fill(null);
    const slugs = JSON.parse(raw);
    if (!Array.isArray(slugs)) return new Array(TEAM_SIZE).fill(null);
    return hydrate(slugs);
  } catch {
    return new Array(TEAM_SIZE).fill(null);
  }
}

/** Convert a list of slugs into a padded team of Pokémon objects. */
function hydrate(slugs) {
  const out = new Array(TEAM_SIZE).fill(null);
  for (let i = 0; i < Math.min(TEAM_SIZE, slugs.length); i++) {
    const s = slugs[i];
    if (!s) continue;
    const p = POKEDEX_BY_SLUG.get(s);
    if (p) out[i] = p;
  }
  return out;
}

function saveTeam() {
  const slugs = team.map(p => p ? p.slug : "");
  // Drop trailing empties to keep storage compact.
  while (slugs.length && !slugs[slugs.length - 1]) slugs.pop();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs)); } catch { /* quota full / private mode */ }
}

// --- Rendering: team slots ------------------------------------------------

function renderTeam() {
  const filled = team.filter(Boolean).length;
  countEl.textContent = `${filled}/${TEAM_SIZE} filled`;

  teamEl.innerHTML = team.map((p, i) => {
    if (!p) {
      return `
        <button class="tb-slot tb-slot-empty" type="button" data-slot="${i}" aria-label="Add Pokémon to slot ${i + 1}">
          <span class="tb-slot-num">Slot ${i + 1}</span>
          <span class="tb-slot-plus" aria-hidden="true">+</span>
          <span class="tb-slot-label">Add Pokémon</span>
        </button>`;
    }
    const src = spriteFor(p);
    const initial = escapeHTML((p.name || "?")[0]);
    const sprite = src
      ? `<img class="tb-slot-sprite" loading="lazy" src="${src}" alt="${escapeHTML(p.name)}"
            onerror="this.outerHTML='<div class=\\'tb-slot-placeholder\\'>${initial}</div>'">`
      : `<div class="tb-slot-placeholder">${initial}</div>`;

    const nameHtml = p.is_variant
      ? `<span class="odyssey">${escapeHTML(p.name)}</span>`
      : escapeHTML(p.name);
    const abilities = (p.abilities || []).slice(0, 2).map(abilityName).filter(Boolean);
    const abilityLine = abilities.length
      ? `<span class="tb-slot-abilities">${escapeHTML(abilities.join(" / "))}</span>`
      : "";
    return `
      <div class="tb-slot tb-slot-filled${p.is_variant ? " odyssey-bg" : ""}" data-slot="${i}">
        <button class="tb-slot-remove" type="button" data-remove="${i}" aria-label="Remove ${escapeHTML(p.name)} from slot ${i + 1}">×</button>
        <button class="tb-slot-main" type="button" data-slot="${i}" aria-label="Change Pokémon in slot ${i + 1}">
          <span class="tb-slot-num">Slot ${i + 1}${p.dex ? ` · #${escapeHTML(p.dex)}` : ""}</span>
          ${sprite}
          <span class="tb-slot-name">${nameHtml}</span>
          <span class="tb-slot-types">${(p.types || []).map(t => typeBadge(t)).join("")}</span>
          ${abilityLine}
        </button>
      </div>`;
  }).join("");
}

// --- Calculations ---------------------------------------------------------

/** Aggregate defensive multipliers per attacker type across the team.
 *  Passes each member's abilities to defensiveMatchups() so that ability-based
 *  modifiers (Levitate, Flash Fire, Thick Fat, etc.) are reflected.
 *  Returns Map<attackerType, Array<{member, mult}>> */
function computeDefensiveMatrix() {
  const matrix = {};
  for (const t of TYPE_LIST) matrix[t] = [];
  for (const p of team) {
    if (!p) continue;
    const mults = defensiveMatchups(p.types || [], p.abilities || []);
    for (const t of TYPE_LIST) {
      matrix[t].push({ member: p, mult: mults[t] });
    }
  }
  return matrix;
}

/** For each defending type, find the best STAB multiplier the team can deal,
 *  and list members contributing 2×+ via one of their own types. Best starts
 *  at -Infinity so an all-resisted defender (e.g. Steel for the wrong team)
 *  reports its true best instead of an incorrect 1×. */
function computeOffensiveCoverage() {
  const out = {};
  for (const t of TYPE_LIST) out[t] = { best: -Infinity, hitters: [] };

  for (const p of team) {
    if (!p || !p.types || !p.types.length) continue;
    // For each defender, record the best multiplier across this member's own types.
    const mults = offensiveMatchups(p.types);
    for (const def of TYPE_LIST) {
      const m = mults[def];
      if (m > out[def].best) out[def].best = m;
      if (m >= 2) {
        // Which of this member's types actually achieves the 2×+ hit?
        const viaTypes = p.types.filter(atk => {
          const v = (TYPE_CHART[atk] || {})[def];
          return (v !== undefined ? v : 1) >= 2;
        });
        out[def].hitters.push({ member: p, viaTypes });
      }
    }
  }
  // If no team members are filled, `best` stays -Infinity; callers treat that
  // as "no data" via their own empty-state branch.
  for (const t of TYPE_LIST) if (out[t].best === -Infinity) out[t].best = 1;
  return out;
}

// --- Rendering: defensive matrix & summary -------------------------------

function renderDefensiveMatrix(matrix) {
  const members = team.filter(Boolean);
  if (!members.length) {
    defMatrixEl.innerHTML = `<p class="empty-msg">Add at least one Pokémon to see defensive matchups.</p>`;
    return;
  }

  // Header: thumbnails of each team member.
  const headerCells = members.map(p => {
    const src = spriteFor(p);
    const initial = escapeHTML((p.name || "?")[0]);
    const thumb = src
      ? `<img src="${src}" alt="${escapeHTML(p.name)}" loading="lazy">`
      : `<span class="tb-mini-ph">${initial}</span>`;
    return `<th class="tb-matrix-th" title="${escapeHTML(p.name)}">
      <span class="tb-matrix-th-inner">${thumb}<span class="tb-matrix-th-name">${escapeHTML(p.name)}</span></span>
    </th>`;
  }).join("");

  // Body: one row per attacking type. Last column = worst (max) multiplier.
  // matrix[atk] only contains filled members (same order as `members` above).
  const rows = TYPE_LIST.map(atk => {
    const entries = matrix[atk];
    let worst = -Infinity;
    const cells = entries.map(({ member, mult }) => {
      if (mult > worst) worst = mult;
      return `<td class="tb-matrix-cell ${multClass(mult)}" title="${escapeHTML(member.name)}: ${multLabel(mult)}">${multLabel(mult)}</td>`;
    }).join("");
    const worstClass = worst >= 4 ? "tb-worst-4" : worst >= 3 ? "tb-worst-3" : worst >= 2 ? "tb-worst-2" : worst > 1 ? "tb-worst-15" : "";
    return `<tr>
      <th class="tb-matrix-row-head">${typeBadge(atk, true)}</th>
      ${cells}
      <td class="tb-matrix-worst ${worstClass}">${multLabel(worst)}</td>
    </tr>`;
  }).join("");

  defMatrixEl.innerHTML = `
    <div class="tb-matrix-wrap">
      <table class="tb-matrix">
        <thead>
          <tr>
            <th class="tb-matrix-corner">Attacker ↓</th>
            ${headerCells}
            <th class="tb-matrix-th tb-matrix-worst-head" title="Worst case multiplier on the team">Worst</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderDefensiveSummary(matrix) {
  const members = team.filter(Boolean);
  if (!members.length) {
    defSummaryEl.innerHTML = `<p class="empty-msg">Team summary appears once you add a Pokémon.</p>`;
    return;
  }

  // Per attacker: count each bucket across filled members. matrix[atk] already
  // only contains filled members; initialise worst/best with sentinels so an
  // all-resist row doesn't spuriously report 1× as the worst case.
  const rows = TYPE_LIST.map(atk => {
    const entries = matrix[atk];
    let weak = 0, resist = 0, immune = 0, neutral = 0;
    let worst = -Infinity, best = Infinity;
    for (const e of entries) {
      const b = bucketOf(e.mult);
      if (b === "weak")    weak++;
      if (b === "resist")  resist++;
      if (b === "immune")  immune++;
      if (b === "neutral") neutral++;
      if (e.mult > worst)  worst = e.mult;
      if (e.mult < best)   best = e.mult;
    }
    const risk = weak > 0 && resist + immune === 0; // nobody tanks this type
    const cls  = risk ? "tb-sum-risk" : (resist + immune) >= weak ? "tb-sum-ok" : "";
    return `<tr class="${cls}">
      <td class="tb-sum-type">${typeBadge(atk, true)}</td>
      <td class="tb-sum-cell ${weak ? "tb-sum-weak" : ""}">${weak}</td>
      <td class="tb-sum-cell">${neutral}</td>
      <td class="tb-sum-cell ${resist ? "tb-sum-resist" : ""}">${resist}</td>
      <td class="tb-sum-cell ${immune ? "tb-sum-immune" : ""}">${immune}</td>
      <td class="tb-sum-cell ${multClass(worst)}">${multLabel(worst)}</td>
      <td class="tb-sum-cell ${multClass(best)}">${multLabel(best)}</td>
    </tr>`;
  }).join("");

  defSummaryEl.innerHTML = `
    <div class="tb-matrix-wrap">
      <table class="tb-summary-table">
        <thead>
          <tr>
            <th>Type</th>
            <th title="Members weak (>1×) to this type">Weak</th>
            <th title="Members neutral (1×)">Neutral</th>
            <th title="Members resistant (&lt;1×, non-zero)">Resist</th>
            <th title="Members immune (0×)">Immune</th>
            <th title="Worst multiplier anyone takes">Worst</th>
            <th title="Best multiplier anyone takes">Best</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// --- Rendering: offensive coverage ---------------------------------------

function renderOffensiveCoverage(cov) {
  const members = team.filter(Boolean);
  if (!members.length) {
    offCoverageEl.innerHTML = `<p class="empty-msg">Offensive coverage appears once you add a Pokémon.</p>`;
    return;
  }

  const rows = TYPE_LIST.map(def => {
    const { best, hitters } = cov[def];
    const hittersHtml = hitters.length
      ? hitters.map(h => {
          const via = h.viaTypes.map(t => typeBadge(t, true)).join("");
          return `<span class="tb-hitter" title="${escapeHTML(h.member.name)} via ${h.viaTypes.join(", ")}">
            <span class="tb-hitter-name">${escapeHTML(h.member.name)}</span>
            ${via}
          </span>`;
        }).join("")
      : `<span class="tb-hitter-empty">—</span>`;
    return `<tr>
      <td class="tb-sum-type">${typeBadge(def, true)}</td>
      <td class="tb-sum-cell ${multClass(best)}">${multLabel(best)}</td>
      <td class="tb-sum-cell tb-sum-count">${hitters.length}</td>
      <td class="tb-hitters-cell">${hittersHtml}</td>
    </tr>`;
  }).join("");

  offCoverageEl.innerHTML = `
    <div class="tb-matrix-wrap">
      <table class="tb-summary-table tb-coverage-table">
        <thead>
          <tr>
            <th>Defender</th>
            <th title="Best STAB effectiveness any team member can deal">Best</th>
            <th title="Team members with a super-effective STAB type">SE hitters</th>
            <th>Covered by</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// --- Rendering: strengths & gaps -----------------------------------------

function renderStrengthsAndGaps(matrix, cov) {
  const members = team.filter(Boolean);
  if (!members.length) {
    gapsEl.innerHTML = `<p class="empty-msg">Analysis appears once you add a Pokémon.</p>`;
    return;
  }

  // Common weaknesses: types where 2+ members are weak (>1×).
  const shared = TYPE_LIST
    .map(atk => {
      const weak = matrix[atk].filter(e => e.mult > 1);
      return { atk, count: weak.length, members: weak.map(e => e.member), worst: weak.reduce((m, e) => Math.max(m, e.mult), 0) };
    })
    .filter(x => x.count >= 2)
    .sort((a, b) => b.count - a.count || b.worst - a.worst);

  // Blind spots: defender types no member hits for 2×+ via STAB.
  const blind = TYPE_LIST.filter(def => cov[def].hitters.length === 0);

  // Resist-only types: every team member resists or is immune (no neutral/weak).
  const allResist = TYPE_LIST.filter(atk => {
    const entries = matrix[atk];
    return entries.length > 0 && entries.every(e => e.mult < 1);
  });

  const sharedHtml = shared.length
    ? `<ul class="tb-list tb-list-bad">${shared.map(s => `
        <li>
          ${typeBadge(s.atk, true)}
          <span class="tb-list-text">${s.count} members weak (worst ${multLabel(s.worst)})</span>
          <span class="tb-list-members">${s.members.map(m => escapeHTML(m.name)).join(", ")}</span>
        </li>`).join("")}</ul>`
    : `<p class="tb-list-ok">No shared weaknesses — every attacking type hits at most one member super-effectively.</p>`;

  const blindHtml = blind.length
    ? `<ul class="tb-list tb-list-bad">${blind.map(t => `
        <li>
          ${typeBadge(t, true)}
          <span class="tb-list-text">No team member hits this for 2×+ via STAB</span>
        </li>`).join("")}</ul>`
    : `<p class="tb-list-ok">Your team hits every type for at least 2× via STAB.</p>`;

  const resistHtml = allResist.length
    ? `<ul class="tb-list tb-list-good">${allResist.map(t => `
        <li>
          ${typeBadge(t, true)}
          <span class="tb-list-text">Every team member resists this type</span>
        </li>`).join("")}</ul>`
    : `<p class="tb-list-neutral">No type is resisted by every team member.</p>`;

  gapsEl.innerHTML = `
    <h3>Shared weaknesses</h3>
    ${sharedHtml}
    <h3>Offensive blind spots</h3>
    ${blindHtml}
    <h3>Team-wide resistances</h3>
    ${resistHtml}`;
}

// --- Rendering: type distribution ----------------------------------------

function renderTypeDist() {
  const members = team.filter(Boolean);
  if (!members.length) {
    typeDistEl.innerHTML = `<p class="empty-msg">Type distribution appears once you add a Pokémon.</p>`;
    return;
  }

  // Count how many team members have each type. For dual-typed Pokémon both
  // types count — this doubles as "STAB coverage" since members gain STAB on
  // moves matching any of their own types.
  const typeCount = {};
  for (const t of TYPE_LIST) typeCount[t] = 0;
  for (const p of members) {
    for (const t of (p.types || [])) {
      if (typeCount[t] !== undefined) typeCount[t]++;
    }
  }

  const bars = TYPE_LIST.map(t => {
    const n = typeCount[t];
    const pct = members.length ? Math.round((n / members.length) * 100) : 0;
    return `<div class="tb-dist-row ${n === 0 ? "tb-dist-zero" : ""}">
      <span class="tb-dist-label">${typeBadge(t, true)}</span>
      <div class="tb-dist-bar"><div class="tb-dist-fill type ${typeClass(t)}" style="width:${pct}%"></div></div>
      <span class="tb-dist-count">${n}</span>
    </div>`;
  }).join("");

  typeDistEl.innerHTML = `
    <p class="tb-caption">Count of team members with each type. Types shared across the team double as STAB coverage.</p>
    <div class="tb-dist-grid">${bars}</div>`;
}

// --- Picker modal --------------------------------------------------------

function openPicker(slotIdx) {
  pickerSlotIdx = slotIdx;
  pickerSearch.value = "";
  pickerTypeFilter.clear();
  for (const c of pickerChips.querySelectorAll(".type-chip.active")) c.classList.remove("active");
  renderPickerList();
  pickerEl.hidden = false;
  document.body.classList.add("tb-picker-open");
  // Focus the search box on next frame so the browser honours it.
  requestAnimationFrame(() => pickerSearch.focus());
}

function closePicker() {
  pickerEl.hidden = true;
  document.body.classList.remove("tb-picker-open");
  pickerSlotIdx = -1;
}

function renderPickerChips() {
  pickerChips.innerHTML = TYPE_LIST.map(t =>
    `<span class="type-chip type ${typeClass(t)}" data-type="${t}">${t}</span>`
  ).join("");
  pickerChips.addEventListener("click", e => {
    const el = e.target.closest(".type-chip");
    if (!el) return;
    const t = el.dataset.type;
    if (pickerTypeFilter.has(t)) { pickerTypeFilter.delete(t); el.classList.remove("active"); }
    else { pickerTypeFilter.add(t); el.classList.add("active"); }
    renderPickerList();
  });
}

function renderPickerList() {
  const q = pickerSearch.value.trim().toLowerCase();
  const qDex = q.replace(/^#/, "");
  const filtered = POKEDEX.filter(p => {
    if (pickerTypeFilter.size && !(p.types || []).some(t => pickerTypeFilter.has(t))) return false;
    if (!q) return true;
    const n = (p.name || "").toLowerCase();
    const d = p.dex || "";
    return n.includes(q) || d.includes(qDex);
  });

  pickerEmpty.style.display = filtered.length ? "none" : "block";

  // Cap at 200 results for perf — 400+ rows of inline sprites is noisy.
  const capped = filtered.slice(0, 200);
  const more = filtered.length - capped.length;

  pickerList.innerHTML = capped.map(p => {
    const src = spriteFor(p);
    const initial = escapeHTML((p.name || "?")[0]);
    const sprite = src
      ? `<img class="tb-picker-sprite" loading="lazy" src="${src}" alt=""
            onerror="this.outerHTML='<span class=\\'tb-picker-ph\\'>${initial}</span>'">`
      : `<span class="tb-picker-ph">${initial}</span>`;
    const nameHtml = p.is_variant ? `<span class="odyssey">${escapeHTML(p.name)}</span>` : escapeHTML(p.name);
    let badge = "";
    if (p.is_battle_bond) badge = `<span class="row-tag tag-bb">B.B.</span>`;
    else if (p.is_event)  badge = `<span class="row-tag tag-event">Event</span>`;
    return `<button class="tb-picker-item" type="button" data-slug="${escapeHTML(p.slug)}">
      ${sprite}
      <span class="tb-picker-item-body">
        <span class="tb-picker-item-head">
          <span class="tb-picker-item-name">${nameHtml}</span>
          <span class="dim">${p.dex ? "#" + escapeHTML(p.dex) : ""}</span>
          ${badge}
        </span>
        <span class="tb-picker-item-types">${(p.types || []).map(t => typeBadge(t)).join("")}</span>
      </span>
    </button>`;
  }).join("") + (more > 0 ? `<div class="tb-picker-more hint">…and ${more} more — refine the search.</div>` : "");
}

function onPickerClick(e) {
  const btn = e.target.closest(".tb-picker-item");
  if (!btn) return;
  const slug = btn.dataset.slug;
  const p = POKEDEX_BY_SLUG.get(slug);
  if (!p || pickerSlotIdx < 0) return;
  team[pickerSlotIdx] = p;
  saveTeam();
  closePicker();
  renderAll();
}

// --- Main render ----------------------------------------------------------

function renderAll() {
  renderTeam();
  const matrix = computeDefensiveMatrix();
  const coverage = computeOffensiveCoverage();
  renderDefensiveMatrix(matrix);
  renderDefensiveSummary(matrix);
  renderOffensiveCoverage(coverage);
  renderStrengthsAndGaps(matrix, coverage);
  renderTypeDist();
}

// --- Event wiring ---------------------------------------------------------

teamEl.addEventListener("click", e => {
  const removeBtn = e.target.closest("[data-remove]");
  if (removeBtn) {
    const i = +removeBtn.dataset.remove;
    team[i] = null;
    saveTeam();
    renderAll();
    return;
  }
  const slotBtn = e.target.closest("[data-slot]");
  if (slotBtn) {
    openPicker(+slotBtn.dataset.slot);
  }
});

clearBtn.addEventListener("click", () => {
  if (!team.some(Boolean)) return;
  team = new Array(TEAM_SIZE).fill(null);
  saveTeam();
  renderAll();
});

shareBtn.addEventListener("click", async () => {
  const slugs = team.map(p => p ? p.slug : "").filter(Boolean);
  if (!slugs.length) {
    shareStatusEl.textContent = "Add at least one Pokémon first.";
    return;
  }
  const url = `${location.origin}${location.pathname}?team=${encodeURIComponent(slugs.join(","))}`;
  try {
    await navigator.clipboard.writeText(url);
    shareStatusEl.textContent = "Link copied to clipboard.";
  } catch {
    // Fallback for environments without clipboard permission (e.g. file://).
    shareStatusEl.textContent = url;
  }
  setTimeout(() => { if (shareStatusEl.textContent && shareStatusEl.textContent.startsWith("Link")) shareStatusEl.textContent = ""; }, 2400);
});

pickerSearch.addEventListener("input", renderPickerList);
pickerList.addEventListener("click", onPickerClick);
pickerClose.addEventListener("click", closePicker);
pickerEl.addEventListener("click", e => {
  // Click outside the card closes the modal.
  if (e.target === pickerEl) closePicker();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !pickerEl.hidden) closePicker();
});

// --- Bootstrap ------------------------------------------------------------

async function main() {
  try {
    const [pokedex, meta] = await Promise.all([
      fetch("data/pokedex.json").then(r => r.json()),
      fetch("data/meta.json").then(r => r.json()).catch(() => null),
    ]);
    POKEDEX = pokedex;
    POKEDEX_BY_SLUG = new Map(POKEDEX.map(p => [p.slug, p]));

    if (meta && meta.counts) {
      metaEl.innerHTML =
        `Build a team of up to 6 Pokémon and see live type coverage using the Odyssey type chart ` +
        `(18 types, <span class="t-aether-text">Aether</span> replaces Fairy). ` +
        `<span class="dim">${meta.counts.species} species indexed, including ${meta.counts.variants} Etrian Variants.</span>`;
    }

    team = loadTeam();
    renderPickerChips();
    renderAll();
  } catch (e) {
    teamEl.innerHTML =
      `<p class="empty-msg">Failed to load Pokédex data: ${escapeHTML(e.message)}. ` +
      `Run <code>python3 scripts/build_data.py</code>, then serve with ` +
      `<code>python3 -m http.server 8000 --directory site</code>.</p>`;
  }
}
main();
