// Move detail page. URL: move.html?slug=<slug>

const root = document.getElementById("root");

function typeBadge(t, sm = false) {
  if (!t) return `<span class="empty-msg">—</span>`;
  return `<span class="type ${sm ? "sm " : ""}${typeClass(t)}">${escapeHTML(t)}</span>`;
}

function renderMoveOffenses(moveType) {
  if (!moveType) return `<p class="empty-msg">No type data.</p>`;
  const matchups = offensiveMatchups([moveType]);
  const groups = { 0: [], 0.5: [], 2: [] };
  for (const t of TYPE_LIST) {
    const m = matchups[t];
    if (groups[m] !== undefined) groups[m].push(t);
  }
  const labelFor = m => ({ 0: "0×", 0.5: "½×", 2: "2×" }[m] || `${m}×`);
  const classFor = m => ({ 0: "x0", 0.5: "x05", 2: "x2" }[m] || "x1");
  const keys = [2, 0.5, 0].filter(k => groups[k] && groups[k].length);
  if (!keys.length) return `<p class="empty-msg">Neutral to all types.</p>`;
  return keys.map(k => `
    <h3>${labelFor(k)} damage to</h3>
    <div class="weakness-grid">
      ${groups[k].map(t => `
        <div class="weakness-cell ${classFor(k)}">
          ${typeBadge(t, true)}
          <span class="mult">${labelFor(k)}</span>
        </div>
      `).join("")}
    </div>`).join("");
}

function catBadge(c) {
  if (!c) return `<span class="empty-msg">—</span>`;
  return `<span class="cat-badge cat-${c.toLowerCase()}">${escapeHTML(c)}</span>`;
}

function fmt(v, dash = "—") {
  if (v === null || v === undefined || v === "") return dash;
  return escapeHTML(String(v));
}

function kindLabel(m) {
  const map = {
    "new":      "New custom move",
    "aether":   "New Aether-type move",
    "reworked": "Reworked vanilla move",
    "baseline": "Baseline (PokeAPI vanilla data)",
  };
  return map[m.kind] || m.kind || "";
}

function renderUsers(users) {
  if (!users || !users.length) return `<p class="empty-msg">No Pokémon learn this move (in the indexed level-up tables).</p>`;
  // Group by Pokémon to deduplicate, but keep first level for display
  const seen = new Map();
  for (const u of users) {
    if (!seen.has(u.slug)) seen.set(u.slug, u);
  }
  const sorted = [...seen.values()].sort((a, b) => {
    const da = a.dex ? parseInt(a.dex, 10) : 9999;
    const db = b.dex ? parseInt(b.dex, 10) : 9999;
    return da - db;
  });
  const cards = sorted.map(u => {
    const dex = u.dex ? `#${escapeHTML(u.dex)}` : "—";
    const lvl = (u.level !== null && u.level !== undefined && u.level !== "") ? `<div class="dim">Lv. ${escapeHTML(String(u.level))}</div>` : "";
    return `<a class="user-card" href="pokemon.html?slug=${encodeURIComponent(u.slug)}">
      <div class="dex-num">${dex}</div>
      <div class="name">${escapeHTML(u.name)}</div>
      ${lvl}
    </a>`;
  }).join("");
  return `<div class="user-grid">${cards}</div>`;
}

async function main() {
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  try {
    const f = await fetch("data/moves.json").then(r => r.json());
    const move = (f.moves || []).find(m => m.slug === slug);
    if (!move) {
      root.innerHTML = `<p>Move not found. <a href="moves.html">← back to Moves</a></p>`;
      return;
    }
    document.title = `${move.name} — Pokémon Odyssey Move`;
    root.innerHTML = `
      <p class="breadcrumb"><a href="moves.html">← Moves</a></p>
      <section class="detail-header${move.is_custom ? " odyssey-bg" : ""}">
        <div class="detail-title">
          <div class="name">${move.is_custom ? `<span class="odyssey">${escapeHTML(move.name)}</span>` : escapeHTML(move.name)}</div>
          <div class="badges">
            ${typeBadge(move.type)}
            ${catBadge(move.category)}
          </div>
        </div>
      </section>

      <div class="panels">
        <div class="panel">
          <h2>Stats</h2>
          <table class="info-table">
            <tr><td>Type</td><td>${typeBadge(move.type)}</td></tr>
            <tr><td>Category</td><td>${catBadge(move.category)}</td></tr>
            <tr><td>Power</td><td>${fmt(move.power)}</td></tr>
            <tr><td>Accuracy</td><td>${fmt(move.accuracy === "/" ? "—" : move.accuracy)}</td></tr>
            <tr><td>PP</td><td>${fmt(move.pp)}</td></tr>
          </table>
        </div>
        <div class="panel">
          <h2>Effect</h2>
          <p class="effect-text">${escapeHTML(move.effect || "—")}</p>
          ${!move.is_custom ? `<p class="disclaimer">Effect text from PokeAPI. Pokémon Odyssey may rebalance this move; the custom docs only re-document moves that were intentionally changed.</p>` : ""}
        </div>
      </div>

      <section>
        <h2>Type Offenses</h2>
        ${renderMoveOffenses(move.type)}
      </section>

      <section>
        <h2>Used by (level-up learnsets)</h2>
        ${renderUsers(move.used_by)}
      </section>
    `;
  } catch (e) {
    root.innerHTML = `<p>Failed to load: ${escapeHTML(e.message)}.</p>`;
  }
}
main();
