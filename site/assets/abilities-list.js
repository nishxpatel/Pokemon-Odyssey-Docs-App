// Abilities index page.

const tbody = document.getElementById("abilities-tbody");
const search = document.getElementById("search");
const kindF  = document.getElementById("kind-filter");
const sortS  = document.getElementById("sort");
const empty  = document.getElementById("empty");
const meta   = document.getElementById("meta-line");

let DATA = [];

function escapeHTML(s) {
  return (s ?? "").toString().replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function rowHTML(a) {
  const users = (a.used_by || []).length;
  const usersCell = users
    ? `<span class="users-count">${users}</span>`
    : `<span class="empty-msg">0</span>`;
  const customDot = a.is_custom ? `<span class="custom-dot" title="${escapeHTML(a.kind)}">●</span>` : "";
  return `<tr>
    <td><a href="ability.html?slug=${encodeURIComponent(a.slug)}">${escapeHTML(a.name)}</a>${customDot}</td>
    <td class="effect-cell">${escapeHTML(a.effect || "")}</td>
    <td class="num">${usersCell}</td>
  </tr>`;
}

function render() {
  const q = search.value.trim().toLowerCase();
  const k = kindF.value;
  let rows = DATA.filter(a => {
    if (k === "custom" && !a.is_custom) return false;
    if (k && k !== "custom" && a.kind !== k) return false;
    if (q) {
      const eff = (a.effect || "").toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !eff.includes(q)) return false;
    }
    return true;
  });
  if (sortS.value === "users-desc") {
    rows.sort((a, b) => (b.used_by || []).length - (a.used_by || []).length);
  } else {
    rows.sort((a, b) => a.name.localeCompare(b.name));
  }
  tbody.innerHTML = rows.map(rowHTML).join("");
  empty.style.display = rows.length ? "none" : "block";
  const customN = DATA.filter(a => a.is_custom).length;
  meta.textContent = `${rows.length} abilit${rows.length === 1 ? "y" : "ies"} shown · ${DATA.length} total (${customN} custom Odyssey abilities; rest from PokeAPI baseline). ● marks custom Odyssey content.`;
}

async function main() {
  try {
    const f = await fetch("data/abilities.json").then(r => r.json());
    DATA = f.abilities;
    [search, kindF, sortS].forEach(el => el.addEventListener("input", render));
    render();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3"><p class="empty-msg">Failed to load: ${escapeHTML(e.message)}.</p></td></tr>`;
  }
}
main();
