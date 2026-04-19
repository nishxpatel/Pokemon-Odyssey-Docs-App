// Ability detail page. URL: ability.html?slug=<slug>

const root = document.getElementById("root");

function escapeHTML(s) {
  return (s ?? "").toString().replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function kindLabel(a) {
  const map = {
    "new":      "New custom ability",
    "reworked": "Reworked vanilla ability",
    "baseline": "Baseline (PokeAPI vanilla data)",
  };
  return map[a.kind] || a.kind || "";
}

function renderUsers(users) {
  if (!users || !users.length) return `<p class="empty-msg">No Pokémon have this ability (in the indexed species data).</p>`;
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
    return `<a class="user-card" href="pokemon.html?slug=${encodeURIComponent(u.slug)}">
      <div class="dex-num">${dex}</div>
      <div class="name">${escapeHTML(u.name)}</div>
    </a>`;
  }).join("");
  return `<div class="user-grid">${cards}</div>`;
}

async function main() {
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  try {
    const f = await fetch("data/abilities.json").then(r => r.json());
    const ability = (f.abilities || []).find(a => a.slug === slug);
    if (!ability) {
      root.innerHTML = `<p>Ability not found. <a href="abilities.html">← back to Abilities</a></p>`;
      return;
    }
    document.title = `${ability.name} — Pokémon Odyssey Ability`;
    root.innerHTML = `
      <p class="breadcrumb"><a href="abilities.html">← Abilities</a></p>
      <section class="detail-header">
        <div class="detail-title">
          <div class="name">${escapeHTML(ability.name)}</div>
          <div class="badges">
            ${ability.is_custom ? `<span class="custom-tag">${escapeHTML(kindLabel(ability))}</span>` : `<span class="baseline-tag">${escapeHTML(kindLabel(ability))}</span>`}
          </div>
        </div>
      </section>

      <div class="panel">
        <h2>Effect</h2>
        <p class="effect-text">${escapeHTML(ability.effect || "—")}</p>
        ${!ability.is_custom ? `<p class="disclaimer">Effect text from PokeAPI. Pokémon Odyssey may rebalance this ability; the custom docs only re-document abilities that were intentionally changed.</p>` : ""}
      </div>

      <section>
        <h2>Pokémon with this ability</h2>
        ${renderUsers(ability.used_by)}
      </section>
    `;
  } catch (e) {
    root.innerHTML = `<p>Failed to load: ${escapeHTML(e.message)}.</p>`;
  }
}
main();
