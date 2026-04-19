// Type chart page. Uses TYPE_LIST and TYPE_CHART globals from types.js.

const root = document.getElementById("root");

function effectFor(atk, def) {
  const v = (TYPE_CHART[atk] || {})[def];
  return v !== undefined ? v : 1;
}

function cellClass(v) {
  if (v === 2)   return "tc-2";
  if (v === 0.5) return "tc-05";
  if (v === 0)   return "tc-0";
  return "tc-1";
}

function cellLabel(v) {
  if (v === 2)   return "2";
  if (v === 0.5) return "½";
  if (v === 0)   return "0";
  return "—";
}

function render() {
  // Column headers (defenders), rotated via CSS.
  const headerCells = TYPE_LIST.map(def =>
    `<th scope="col">
       <div class="tc-th type ${typeClass(def)}">${escapeHTML(def)}</div>
     </th>`
  ).join("");

  // One row per attacking type.
  const rows = TYPE_LIST.map(atk => {
    const cells = TYPE_LIST.map(def => {
      const v = effectFor(atk, def);
      return `<td class="tc-cell ${cellClass(v)}" title="${escapeHTML(atk)} → ${escapeHTML(def)}: ${v === 0.5 ? "½" : v}×">${cellLabel(v)}</td>`;
    }).join("");
    return `<tr>
      <th scope="row"><span class="type sm ${typeClass(atk)}">${escapeHTML(atk)}</span></th>
      ${cells}
    </tr>`;
  }).join("");

  root.innerHTML = `
    <p class="tc-axis-note">Row&nbsp;= attacking type &nbsp;·&nbsp; Column&nbsp;= defending type</p>
    <div class="tc-legend">
      <span class="tc-legend-swatch tc-2">2×</span> Super effective &ensp;
      <span class="tc-legend-swatch tc-05">½×</span> Not very effective &ensp;
      <span class="tc-legend-swatch tc-0">0×</span> No effect &ensp;
      <span class="tc-legend-swatch tc-1">—</span> Neutral
    </div>
    <div class="tc-wrap">
      <table class="tc-table">
        <thead>
          <tr>
            <th class="tc-corner" aria-label="Attacker / Defender"></th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="disclaimer" style="margin-top:.75rem">
      Custom Pokémon Odyssey type chart. Aether is the 18th type (replaces Fairy).
      Non-standard interactions vs. Gen 6+: Poison→Water 2×, Psychic→Ice ½×, Dark→Ice ½×.
    </p>`;
}

render();
