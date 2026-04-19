// Abilities index page.

const tbody = document.getElementById("abilities-tbody");
const search = document.getElementById("search");
const kindF  = document.getElementById("kind-filter");
const sortS  = document.getElementById("sort");
const empty  = document.getElementById("empty");
const meta   = document.getElementById("meta-line");

let DATA = [];
let sortKey = "name";
let sortDir = "asc";

function rowHTML(a) {
  const users = (a.used_by || []).length;
  const usersCell = users
    ? `<span class="users-count">${users}</span>`
    : `<span class="empty-msg">0</span>`;
  return `<tr${a.is_custom ? ' class="odyssey-bg"' : ''}>
    <td><a href="ability.html?slug=${encodeURIComponent(a.slug)}"${a.is_custom ? ' class="odyssey"' : ''}>${escapeHTML(a.name)}</a></td>
    <td class="effect-cell">${escapeHTML(a.effect || "")}</td>
    <td class="num">${usersCell}</td>
  </tr>`;
}

function applySort(rows) {
  const sign = sortDir === "asc" ? 1 : -1;
  if (sortKey === "users") return [...rows].sort((a, b) => sign * ((a.used_by || []).length - (b.used_by || []).length));
  return [...rows].sort((a, b) => sign * a.name.localeCompare(b.name)); // default: name
}

function dropdownValueForState() {
  if (sortKey === "name"  && sortDir === "asc")  return "name";
  if (sortKey === "users" && sortDir === "desc") return "users-desc";
  return null;
}

function syncDropdown() {
  const v = dropdownValueForState();
  if (v !== null) sortS.value = v;
}

function applyDropdownToState() {
  if (sortS.value === "users-desc") { sortKey = "users"; sortDir = "desc"; }
  else                              { sortKey = "name";  sortDir = "asc";  }
}

function updateSortIndicators() {
  for (const th of document.querySelectorAll(".abilities-table th[data-sort-key]")) {
    th.classList.toggle("sort-asc",  th.dataset.sortKey === sortKey && sortDir === "asc");
    th.classList.toggle("sort-desc", th.dataset.sortKey === sortKey && sortDir === "desc");
  }
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
  rows = applySort(rows);
  tbody.innerHTML = rows.map(rowHTML).join("");
  empty.style.display = rows.length ? "none" : "block";
  updateSortIndicators();
  const customN = DATA.filter(a => a.is_custom).length;
  meta.textContent = `${rows.length} abilit${rows.length === 1 ? "y" : "ies"} shown · ${DATA.length} total (${customN} custom Odyssey abilities; rest from PokeAPI baseline).`;
}

async function main() {
  try {
    const f = await fetch("data/abilities.json").then(r => r.json());
    DATA = f.abilities;

    [search, kindF].forEach(el => el.addEventListener("input", render));
    sortS.addEventListener("input", () => { applyDropdownToState(); render(); });

    document.querySelector(".abilities-table thead").addEventListener("click", e => {
      const th = e.target.closest("th[data-sort-key]");
      if (!th) return;
      const key = th.dataset.sortKey;
      if (sortKey === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = key === "users" ? "desc" : "asc";
      }
      syncDropdown();
      render();
    });

    render();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3"><p class="empty-msg">Failed to load: ${escapeHTML(e.message)}.</p></td></tr>`;
  }
}
main();
