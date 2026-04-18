// Per-item detail page. URL: item.html?slug=<item-slug>

function escapeHTML(s) {
  return (s ?? "").toString().replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function sourceLabel(kind) {
  return ({
    shop: "Shop",
    pickup: "Pickup",
    gather: "Gather/Mine",
    location: "Location",
    tm: "TM",
  }[kind]) || kind;
}

function sourceRowHTML(s) {
  const tag = `<span class="source-tag tag-${s.kind}">${escapeHTML(sourceLabel(s.kind))}</span>`;
  let body = "";
  if (s.kind === "shop") {
    body = `<strong>${escapeHTML(s.shop || "—")}</strong>${s.level ? ` · <span class="dim">${escapeHTML(s.level)}</span>` : ""}`;
  } else if (s.kind === "pickup") {
    const pct = (typeof s.percent === "number") ? `${(s.percent * 100).toFixed(0)}%` : "—";
    body = `Pickup ability · <span class="dim">${pct}</span>`;
  } else if (s.kind === "gather") {
    body = `<strong>${escapeHTML(s.stratum || "—")}</strong>${s.method ? ` · <span class="dim">${escapeHTML(s.method)}</span>` : ""}`;
  } else if (s.kind === "location") {
    let parts = [];
    if (s.location) parts.push(`<strong>${escapeHTML(s.location)}</strong>`);
    if (s.habitat)  parts.push(`<span class="dim">${escapeHTML(s.habitat)}</span>`);
    if (s.note)     parts.push(escapeHTML(s.note));
    body = parts.join(" · ") || "—";
  } else if (s.kind === "tm") {
    body = `Move: <strong>${escapeHTML(s.move || "—")}</strong>` +
           (s.location ? ` · <span class="dim">${escapeHTML(s.location)}</span>` : "");
  }
  return `<li class="source-li">${tag} ${body}</li>`;
}

function renderUsedFor(item, evoUsers) {
  if (!evoUsers || !evoUsers.length) return "";
  return `
    <section>
      <h2>Used for evolution</h2>
      <div class="evo-grid">
        ${evoUsers.map(u => `
          <a class="evo-mini" href="pokemon.html?slug=${encodeURIComponent(u.slug)}">
            <img loading="lazy" class="sprite" src="https://play.pokemonshowdown.com/sprites/gen5/${u.sprite_slug}.png" alt="${escapeHTML(u.name)}">
            <div class="name">${escapeHTML(u.name)}</div>
            <div class="cond">${escapeHTML(u.condition || "")}</div>
          </a>`).join("")}
      </div>
    </section>`;
}

async function main() {
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  const root = document.getElementById("root");
  try {
    const [itemsFile, pokedex] = await Promise.all([
      fetch("data/items.json").then(r => r.json()),
      fetch("data/pokedex.json").then(r => r.json()),
    ]);
    const item = itemsFile.items.find(i => i.slug === slug);
    if (!item) {
      root.innerHTML = `<p>Item not found. <a href="items.html">← back to Items</a></p>`;
      return;
    }
    document.title = `${item.name} — Pokémon Odyssey`;

    // Find every Pokémon whose evolution targets reference this item
    const evoUsers = [];
    for (const p of pokedex) {
      for (const t of (p.evolution_targets || [])) {
        if ((t.items || []).some(it => it.toLowerCase() === item.name.toLowerCase())) {
          evoUsers.push({
            slug: p.slug,
            name: p.name,
            sprite_slug: p.sprite_slug,
            condition: `${p.name} → ${t.to_name} (${t.condition || ""})`,
          });
          break;
        }
      }
    }

    const sources = item.sources || [];
    const grouped = {};
    for (const s of sources) {
      (grouped[s.kind] ||= []).push(s);
    }
    const order = ["shop", "gather", "location", "pickup", "tm"];

    root.innerHTML = `
      <section class="item-header">
        <div class="item-icon">📦</div>
        <div>
          <div class="dex-num">Item</div>
          <h1 class="name">${escapeHTML(item.name)}</h1>
          <div class="dim">${sources.length} source${sources.length === 1 ? "" : "s"}</div>
        </div>
      </section>
      <section>
        <h2>Where to find it</h2>
        ${order.filter(k => grouped[k]).map(k => `
          <h3>${sourceLabel(k)} (${grouped[k].length})</h3>
          <ul class="source-list">
            ${grouped[k].map(sourceRowHTML).join("")}
          </ul>
        `).join("") || `<p class="empty-msg">No sources recorded.</p>`}
      </section>
      ${renderUsedFor(item, evoUsers)}
    `;
  } catch (e) {
    root.innerHTML = `<p>Failed to load: ${escapeHTML(e.message)}.</p>`;
  }
}
main();
