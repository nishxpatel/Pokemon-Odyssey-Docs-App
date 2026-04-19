// Items index page.

const tbody  = document.getElementById("items-tbody");
const search = document.getElementById("search");
const kindF  = document.getElementById("kind-filter");
const sortS  = document.getElementById("sort");
const empty  = document.getElementById("empty");
const meta   = document.getElementById("meta-line");

let DATA = [];
let sortKey = "name";
let sortDir = "asc";

function sourceSummary(item) {
  const counts = {};
  for (const s of item.sources || []) {
    counts[s.kind] = (counts[s.kind] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `<span class="source-tag tag-${k}">${k} ×${n}</span>`)
    .join(" ");
}

function rowHTML(item) {
  return `<tr>
    <td><a href="item.html?slug=${encodeURIComponent(item.slug)}">${escapeHTML(item.name)}</a></td>
    <td>${sourceSummary(item) || `<span class="empty-msg">—</span>`}</td>
  </tr>`;
}

function applySort(rows) {
  const sign = sortDir === "asc" ? 1 : -1;
  if (sortKey === "sources") return [...rows].sort((a, b) => sign * ((a.sources || []).length - (b.sources || []).length));
  return [...rows].sort((a, b) => sign * a.name.localeCompare(b.name)); // default: name
}

function dropdownValueForState() {
  if (sortKey === "name"    && sortDir === "asc")  return "name";
  if (sortKey === "sources" && sortDir === "desc") return "sources";
  return null;
}

function syncDropdown() {
  const v = dropdownValueForState();
  if (v !== null) sortS.value = v;
}

function applyDropdownToState() {
  if (sortS.value === "sources") { sortKey = "sources"; sortDir = "desc"; }
  else                           { sortKey = "name";    sortDir = "asc";  }
}

function updateSortIndicators() {
  for (const th of document.querySelectorAll(".items-table th[data-sort-key]")) {
    th.classList.toggle("sort-asc",  th.dataset.sortKey === sortKey && sortDir === "asc");
    th.classList.toggle("sort-desc", th.dataset.sortKey === sortKey && sortDir === "desc");
  }
}

function render() {
  const q = search.value.trim().toLowerCase();
  const k = kindF.value;
  let rows = DATA.filter(i => {
    if (q && !i.name.toLowerCase().includes(q)) return false;
    if (k && !(i.sources || []).some(s => s.kind === k)) return false;
    return true;
  });
  rows = applySort(rows);
  tbody.innerHTML = rows.map(rowHTML).join("");
  empty.style.display = rows.length ? "none" : "block";
  updateSortIndicators();
  meta.textContent = `${rows.length} item${rows.length === 1 ? "" : "s"} shown · ${DATA.length} total.`;
}

async function main() {
  try {
    const f = await fetch("data/items.json").then(r => r.json());
    DATA = f.items;

    [search, kindF].forEach(el => el.addEventListener("input", render));
    sortS.addEventListener("input", () => { applyDropdownToState(); render(); });

    document.querySelector(".items-table thead").addEventListener("click", e => {
      const th = e.target.closest("th[data-sort-key]");
      if (!th) return;
      const key = th.dataset.sortKey;
      if (sortKey === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = key === "sources" ? "desc" : "asc";
      }
      syncDropdown();
      render();
    });

    render();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="2"><p class="empty-msg">Failed to load: ${escapeHTML(e.message)}.</p></td></tr>`;
  }
}
main();
