// Pokémon Odyssey type chart — sourced from the workbook's Type Chart sheet.
// TYPE_CHART[attacker][defender] = damage multiplier (0, 0.5, 1, or 2).
// Fairy does not exist in this game; Aether is the 18th type (replacing Fairy).
// Custom interactions vs. standard Gen 6+: Poison→Water 2×, Psychic→Ice 0.5×,
// Dark→Ice 0.5×, and all Aether matchups.

const TYPE_LIST = [
  "Normal","Fighting","Flying","Poison","Ground","Rock","Bug","Ghost",
  "Steel","Fire","Water","Grass","Electric","Psychic","Ice","Dragon","Dark","Aether"
];

const TYPE_CHART = {
  Normal:   { Rock:0.5, Ghost:0, Steel:0.5 },
  Fighting: { Normal:2, Flying:0.5, Poison:0.5, Rock:2, Bug:0.5, Ghost:0, Steel:2, Psychic:0.5, Ice:2, Dark:2 },
  Flying:   { Fighting:2, Rock:0.5, Bug:2, Steel:0.5, Grass:2, Electric:0.5, Aether:0.5 },
  Poison:   { Poison:0.5, Ground:0.5, Rock:0.5, Ghost:0.5, Steel:0, Water:2, Grass:2, Aether:2 },
  Ground:   { Flying:0, Poison:2, Rock:2, Bug:0.5, Steel:2, Fire:2, Grass:0.5, Electric:2, Aether:0.5 },
  Rock:     { Fighting:0.5, Flying:2, Ground:0.5, Bug:2, Steel:0.5, Fire:2, Ice:2 },
  Bug:      { Fighting:0.5, Flying:0.5, Poison:0.5, Ghost:0.5, Steel:0.5, Fire:0.5, Grass:2, Psychic:2, Dark:2 },
  Ghost:    { Normal:0, Ghost:2, Psychic:2, Dark:0.5 },
  Steel:    { Rock:2, Steel:0.5, Fire:0.5, Water:0.5, Electric:0.5, Ice:2 },
  Fire:     { Rock:0.5, Bug:2, Steel:2, Fire:0.5, Water:0.5, Grass:2, Ice:2, Dragon:0.5, Aether:0.5 },
  Water:    { Ground:2, Rock:2, Fire:2, Water:0.5, Grass:0.5, Dragon:0.5, Aether:0.5 },
  Grass:    { Flying:0.5, Poison:0.5, Ground:2, Rock:2, Bug:0.5, Steel:0.5, Fire:0.5, Water:2, Grass:0.5, Dragon:0.5 },
  Electric: { Flying:2, Ground:0, Water:2, Grass:0.5, Electric:0.5, Dragon:0.5 },
  Psychic:  { Fighting:2, Poison:2, Steel:0.5, Psychic:0.5, Ice:0.5, Dark:0 },
  Ice:      { Flying:2, Ground:2, Steel:0.5, Fire:0.5, Water:0.5, Grass:2, Ice:0.5, Dragon:2 },
  Dragon:   { Steel:0.5, Dragon:2 },
  Dark:     { Fighting:0.5, Ghost:2, Psychic:2, Ice:0.5, Dark:0.5, Aether:2 },
  Aether:   { Poison:0.5, Dark:0.5, Aether:0.5 },
};

/** Escape a string for safe insertion into HTML. Used by all page scripts. */
function escapeHTML(s) {
  return (s ?? "").toString().replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function typeClass(name) {
  return (name || "").toLowerCase().replace(/[^a-z]/g, "");
}

/** Compute defensive multipliers for a list of types (1 or 2 types). */
function defensiveMatchups(defenderTypes) {
  const out = {};
  for (const atk of TYPE_LIST) {
    let mult = 1;
    for (const def of defenderTypes) {
      const m = (TYPE_CHART[atk] || {})[def];
      if (m !== undefined) mult *= m;
    }
    out[atk] = mult;
  }
  return out;
}

/** Compute offensive multipliers for a Pokémon with the given types.
 *  For each defender type, returns the best (max) effectiveness across
 *  all of the attacker's types — i.e. the strongest STAB option available. */
function offensiveMatchups(attackerTypes) {
  const out = {};
  for (const def of TYPE_LIST) {
    let best = -Infinity;
    for (const atk of attackerTypes) {
      const m = (TYPE_CHART[atk] || {})[def];
      const mult = m !== undefined ? m : 1;
      if (mult > best) best = mult;
    }
    out[def] = best === -Infinity ? 1 : best;
  }
  return out;
}
