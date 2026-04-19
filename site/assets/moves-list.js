// Moves index page.

const tbody = document.getElementById("moves-tbody");
const search = document.getElementById("search");
const typeF  = document.getElementById("type-filter");
const catF   = document.getElementById("cat-filter");
const kindF  = document.getElementById("kind-filter");
const sortS  = document.getElementById("sort");
const empty  = document.getElementById("empty");
const meta   = document.getElementById("meta-line");

let DATA = [];
let sortKey = "name";
let sortDir = "asc";

const NUMERIC_KEYS = new Set(["power", "accuracy", "pp", "users"]);

function typeBadge(t) {
  if (!t) return `<span class="empty-msg">—</span>`;
  return `<span class="type sm ${typeClass(t)}">${escapeHTML(t)}</span>`;
}

function catBadge(c) {
  if (!c) return `<span class="empty-msg">—</span>`;
  return `<span class="cat-badge cat-${c.toLowerCase()}">${escapeHTML(c)}</span>`;
}

function fmtNum(v) {
  if (v === null || v === undefined || v === "") return `<span class="empty-msg">—</span>`;
  return escapeHTML(String(v));
}

function fmtAcc(v) {
  if (v === null || v === undefined || v === "" || v === "/") return `<span class="empty-msg">—</span>`;
  return escapeHTML(String(v));
}

function buildTypeOptions() {
  const types = [...new Set(DATA.map(m => m.type).filter(Boolean))].sort();
  typeF.innerHTML = `<option value="">All types</option>` +
    types.map(t => `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join("");
}

function rowHTML(m) {
  const users = (m.used_by || []).length;
  const usersCell = users
    ? `<span class="users-count">${users}</span>`
    : `<span class="empty-msg">0</span>`;
  return `<tr${m.is_custom ? ' class="odyssey-bg"' : ''}>
    <td><a href="move.html?slug=${encodeURIComponent(m.slug)}"${m.is_custom ? ' class="odyssey"' : ''}>${escapeHTML(m.name)}</a></td>
    <td>${typeBadge(m.type)}</td>
    <td>${catBadge(m.category)}</td>
    <td class="num">${fmtNum(m.power)}</td>
    <td class="num">${fmtAcc(m.accuracy)}</td>
    <td class="num">${fmtNum(m.pp)}</td>
    <td class="effect-cell">${escapeHTML(m.effect || "")}</td>
    <td class="num">${usersCell}</td>
  </tr>`;
}

function accSortVal(v) {
  if (v === "/") return 101; // always hits — rank above percentage values
  const n = Number(v);
  return (v === null || v === undefined || v === "" || isNaN(n)) ? -1 : n;
}

function applySort(rows) {
  const sign = sortDir === "asc" ? 1 : -1;
  if (sortKey === "type")     return [...rows].sort((a, b) => sign * (a.type     || "").localeCompare(b.type     || ""));
  if (sortKey === "category") return [...rows].sort((a, b) => sign * (a.category || "").localeCompare(b.category || ""));
  if (sortKey === "power")    return [...rows].sort((a, b) => sign * ((Number(a.power)  || -1) - (Number(b.power)  || -1)));
  if (sortKey === "accuracy") return [...rows].sort((a, b) => sign * (accSortVal(a.accuracy) - accSortVal(b.accuracy)));
  if (sortKey === "pp")       return [...rows].sort((a, b) => sign * ((Number(a.pp)     || -1) - (Number(b.pp)     || -1)));
  if (sortKey === "users")    return [...rows].sort((a, b) => sign * ((a.used_by || []).length - (b.used_by || []).length));
  return [...rows].sort((a, b) => sign * a.name.localeCompare(b.name)); // default: name
}

function dropdownValueForState() {
  if (sortKey === "name"     && sortDir === "asc")  return "name";
  if (sortKey === "power"    && sortDir === "desc") return "power-desc";
  if (sortKey === "users"    && sortDir === "desc") return "users-desc";
  return null;
}

function syncDropdown() {
  const v = dropdownValueForState();
  if (v !== null) sortS.value = v;
}

function applyDropdownToState() {
  if      (sortS.value === "power-desc") { sortKey = "power"; sortDir = "desc"; }
  else if (sortS.value === "users-desc") { sortKey = "users"; sortDir = "desc"; }
  else                                   { sortKey = "name";  sortDir = "asc";  }
}

function updateSortIndicators() {
  for (const th of document.querySelectorAll(".moves-table th[data-sort-key]")) {
    th.classList.toggle("sort-asc",  th.dataset.sortKey === sortKey && sortDir === "asc");
    th.classList.toggle("sort-desc", th.dataset.sortKey === sortKey && sortDir === "desc");
  }
}

function render() {
  const q = search.value.trim().toLowerCase();
  const t = typeF.value;
  const c = catF.value;
  const k = kindF.value;
  let rows = DATA.filter(m => {
    if (t && m.type !== t) return false;
    if (c && m.category !== c) return false;
    if (k === "custom" && !m.is_custom) return false;
    if (k && k !== "custom" && m.kind !== k) return false;
    if (q) {
      const eff = (m.effect || "").toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !eff.includes(q)) return false;
    }
    return true;
  });
  rows = applySort(rows);
  tbody.innerHTML = rows.map(rowHTML).join("");
  empty.style.display = rows.length ? "none" : "block";
  updateSortIndicators();
  const customN = DATA.filter(m => m.is_custom).length;
  meta.textContent = `${rows.length} move${rows.length === 1 ? "" : "s"} shown · ${DATA.length} total (${customN} custom Odyssey moves; rest from PokeAPI baseline).`;
}

async function main() {
  try {
    const f = await fetch("data/moves.json").then(r => r.json());
    DATA = f.moves;
    buildTypeOptions();

    [search, typeF, catF, kindF].forEach(el => el.addEventListener("input", render));
    sortS.addEventListener("input", () => { applyDropdownToState(); render(); });

    document.querySelector(".moves-table thead").addEventListener("click", e => {
      const th = e.target.closest("th[data-sort-key]");
      if (!th) return;
      const key = th.dataset.sortKey;
      if (sortKey === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = NUMERIC_KEYS.has(key) ? "desc" : "asc";
      }
      syncDropdown();
      render();
    });

    render();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8"><p class="empty-msg">Failed to load: ${escapeHTML(e.message)}.</p></td></tr>`;
  }
}
main();
