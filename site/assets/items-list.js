// Items index page.

const tbody  = document.getElementById("items-tbody");
const search = document.getElementById("search");
const kindF  = document.getElementById("kind-filter");
const sortS  = document.getElementById("sort");
const empty  = document.getElementById("empty");
const meta   = document.getElementById("meta-line");

let DATA = [];

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

function render() {
  const q = search.value.trim().toLowerCase();
  const k = kindF.value;
  let rows = DATA.filter(i => {
    if (q && !i.name.toLowerCase().includes(q)) return false;
    if (k && !(i.sources || []).some(s => s.kind === k)) return false;
    return true;
  });
  if (sortS.value === "sources") {
    rows.sort((a, b) => (b.sources || []).length - (a.sources || []).length);
  } else {
    rows.sort((a, b) => a.name.localeCompare(b.name));
  }
  tbody.innerHTML = rows.map(rowHTML).join("");
  empty.style.display = rows.length ? "none" : "block";
  meta.textContent = `${rows.length} item${rows.length === 1 ? "" : "s"} shown · ${DATA.length} total.`;
}

async function main() {
  try {
    const f = await fetch("data/items.json").then(r => r.json());
    DATA = f.items;
    [search, kindF, sortS].forEach(el => el.addEventListener("input", render));
    render();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="2"><p class="empty-msg">Failed to load: ${escapeHTML(e.message)}.</p></td></tr>`;
  }
}
main();
