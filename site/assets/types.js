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

// ---------------------------------------------------------------------------
// Ability-based defensive modifiers
// ---------------------------------------------------------------------------
// Abilities that change how incoming type damage is calculated.
// Applied on top of the base type-chart matchup in defensiveMatchups().
//
//   immune:    those attacking types deal 0× (fully blocked/absorbed).
//   halve:     those attacking types deal ×0.5 (stacked on type-chart result).
//   reduceSE:  multiplier applied to any result currently > 1× (Filter/Solid Rock = 0.75).
//   wonderGuard: true — any result > 0 and ≤ 1× is set to 0× (only SE hits land).
//
// Slugs must match the `slug` field on ability objects in pokedex.json.
const ABILITY_MODIFIERS = {
  "levitate":      { immune: ["Ground"] },
  "flash-fire":    { immune: ["Fire"] },
  "volt-absorb":   { immune: ["Electric"] },
  "water-absorb":  { immune: ["Water"] },
  "lightning-rod": { immune: ["Electric"] },
  "thick-fat":     { halve: ["Fire", "Ice"] },
  "filter":        { reduceSE: 0.75 },
  "solid-rock":    { reduceSE: 0.75 },
  "wonder-guard":  { wonderGuard: true },
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

/** Compute defensive multipliers for a list of types (1 or 2 types).
 *  Optional abilities array (from pokedex.json abilities field) applies
 *  ability-based modifications on top of the base type-chart result.
 *  Each element should be {name, slug} — string-only entries are skipped. */
function defensiveMatchups(defenderTypes, abilities = []) {
  const out = {};
  for (const atk of TYPE_LIST) {
    let mult = 1;
    for (const def of defenderTypes) {
      const m = (TYPE_CHART[atk] || {})[def];
      if (m !== undefined) mult *= m;
    }
    out[atk] = mult;
  }

  // Apply each ability's defensive modifier in order.
  for (const ability of abilities) {
    const slug = (typeof ability === "object" && ability !== null) ? ability.slug : null;
    const mod  = slug ? ABILITY_MODIFIERS[slug] : null;
    if (!mod) continue;

    if (mod.immune)
      for (const t of mod.immune) out[t] = 0;

    if (mod.halve)
      for (const t of mod.halve) out[t] *= 0.5;

    if (mod.reduceSE)
      for (const t of TYPE_LIST) { if (out[t] > 1) out[t] *= mod.reduceSE; }

    if (mod.wonderGuard)
      for (const t of TYPE_LIST) { if (out[t] > 0 && out[t] <= 1) out[t] = 0; }
  }

  return out;
}

/** Return {[typeName]: abilityName} for every type whose effective multiplier
 *  was changed by an ability (compared to the raw type-chart-only result).
 *  Used to annotate individual cells in the type-defenses display. */
function getAbilityDefenseNotes(defenderTypes, abilities) {
  if (!abilities || !abilities.length) return {};

  // Compute base matchup without abilities.
  const base = {};
  for (const atk of TYPE_LIST) {
    let mult = 1;
    for (const def of defenderTypes) {
      const m = (TYPE_CHART[atk] || {})[def];
      if (m !== undefined) mult *= m;
    }
    base[atk] = mult;
  }

  const notes = {};
  const cur   = { ...base };

  for (const ability of abilities) {
    const slug = (typeof ability === "object" && ability !== null) ? ability.slug : null;
    const name = (typeof ability === "object" && ability !== null) ? ability.name : null;
    const mod  = slug ? ABILITY_MODIFIERS[slug] : null;
    if (!mod || !name) continue;

    if (mod.immune) {
      for (const t of mod.immune) {
        if (cur[t] !== 0) { notes[t] = name; cur[t] = 0; }
      }
    }
    if (mod.halve) {
      for (const t of mod.halve) {
        const nv = cur[t] * 0.5;
        if (nv !== cur[t]) { notes[t] = name; cur[t] = nv; }
      }
    }
    if (mod.reduceSE) {
      for (const t of TYPE_LIST) {
        if (cur[t] > 1) { notes[t] = name; cur[t] *= mod.reduceSE; }
      }
    }
    if (mod.wonderGuard) {
      // Only annotate types that were non-zero and non-SE (i.e. actually blocked by WG).
      for (const t of TYPE_LIST) {
        if (cur[t] > 0 && cur[t] <= 1) { notes[t] = name; cur[t] = 0; }
      }
    }
  }

  return notes;
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
