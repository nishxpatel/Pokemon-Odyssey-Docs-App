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
  if (sortS.value === "power-desc") {
    rows.sort((a, b) => (Number(b.power) || -1) - (Number(a.power) || -1));
  } else if (sortS.value === "users-desc") {
    rows.sort((a, b) => (b.used_by || []).length - (a.used_by || []).length);
  } else {
    rows.sort((a, b) => a.name.localeCompare(b.name));
  }
  tbody.innerHTML = rows.map(rowHTML).join("");
  empty.style.display = rows.length ? "none" : "block";
  const customN = DATA.filter(m => m.is_custom).length;
  meta.textContent = `${rows.length} move${rows.length === 1 ? "" : "s"} shown · ${DATA.length} total (${customN} custom Odyssey moves; rest from PokeAPI baseline).`;
}

async function main() {
  try {
    const f = await fetch("data/moves.json").then(r => r.json());
    DATA = f.moves;
    buildTypeOptions();
    [search, typeF, catF, kindF, sortS].forEach(el => el.addEventListener("input", render));
    render();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8"><p class="empty-msg">Failed to load: ${escapeHTML(e.message)}.</p></td></tr>`;
  }
}
main();
