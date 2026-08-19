/* =========================================================================
 * gamedata.js — herní data pro Clash of Clans Village Planner
 *
 * DŮLEŽITÉ: tahle data jsou "community snapshot" a Supercell je každým
 * updatem mění. Aplikace je proto navržená tak, aby na nich nebyla závislá:
 *   1) Hrdinové mají tvrdou tabulku stropů podle TH (nejdůležitější věc).
 *   2) Vojska/kouzla se počítají proti `maxLevel`, které posílá samotné
 *      API v JSONu hráče -> vždycky aktuální, nezávislé na téhle tabulce.
 *   3) Chybějící stropy jde doplnit dvěma způsoby:
 *        - ručně v záložce "Data" (uloží se do localStorage),
 *        - automaticky z importovaných vesnic (naučí se pozorovaná maxima).
 * ========================================================================= */
(function (global) {
  "use strict";

  var MAX_TH = 17;

  /* Stropy hrdinů podle Town Hallu.
     Index pole = úroveň TH (index 0 se nepoužívá), hodnota 0 = ještě neodemčeno. */
  var HERO_CAPS = {
    "Barbarian King": [0, 0, 0, 0, 0, 0, 0, 5, 10, 30, 40, 50, 65, 75, 80, 90, 95, 100],
    "Archer Queen":   [0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 40, 50, 65, 75, 80, 90, 95, 100],
    "Grand Warden":   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 40, 50, 55, 65, 70, 75],
    "Royal Champion": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 25, 30, 40, 45, 50],
    "Minion Prince":  [0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90]
  };

  /* Jak velkou část *dnešního globálního maxima* zvládne vylabovat hráč,
     který má daný TH kompletně vymaxovaný. Heuristika – slouží jen tam,
     kde nemáme tvrdý strop (tj. u vojsk a kouzel). */
  var LAB_FRACTION = [0, 0.04, 0.08, 0.13, 0.18, 0.23, 0.27, 0.32, 0.38, 0.45, 0.52, 0.59, 0.66, 0.73, 0.80, 0.87, 0.94, 1.00];

  /* --- klasifikace jednotek podle jména ---------------------------------- */

  var DARK_TROOPS = [
    "Minion", "Hog Rider", "Valkyrie", "Golem", "Witch", "Lava Hound",
    "Bowler", "Ice Golem", "Headhunter", "Apprentice Warden", "Druid", "Furnace"
  ];

  var SIEGE_MACHINES = [
    "Wall Wrecker", "Battle Blimp", "Stone Slammer", "Siege Barracks",
    "Log Launcher", "Flame Flinger", "Battle Drill", "Troop Launcher"
  ];

  var PETS = [
    "L.A.S.S.I", "Electro Owl", "Mighty Yak", "Unicorn",
    "Frosty", "Diggy", "Poison Lizard", "Phoenix",
    "Spirit Fox", "Angry Jelly", "Sneezy"
  ];

  var DARK_SPELLS = [
    "Poison Spell", "Earthquake Spell", "Haste Spell",
    "Skeleton Spell", "Bat Spell", "Overgrowth Spell", "Ice Block Spell"
  ];

  /* Super troops nemají vlastní level – kopírují základní jednotku.
     Do statistik laboratoře se nesmí počítat, jinak zdvojují čísla. */
  var SUPER_TROOPS = [
    "Super Barbarian", "Super Archer", "Sneaky Goblin", "Super Wall Breaker",
    "Super Giant", "Rocket Balloon", "Super Wizard", "Super Dragon",
    "Inferno Dragon", "Super Minion", "Super Valkyrie", "Super Witch",
    "Ice Hound", "Super Bowler", "Super Miner", "Super Hog Rider",
    "Super Yeti", "Super Lava Hound"
  ];

  /* --- kategorie --------------------------------------------------------- */

  var CATEGORIES = {
    hero:        { id: "hero",        label: "Hrdinové",          icon: "👑", hardCap: true },
    equipment:   { id: "equipment",   label: "Vybavení hrdinů",   icon: "🛡️", hardCap: false },
    pet:         { id: "pet",         label: "Mazlíčci",          icon: "🐾", hardCap: false },
    elixirTroop: { id: "elixirTroop", label: "Elixírová vojska",  icon: "⚔️", hardCap: false },
    darkTroop:   { id: "darkTroop",   label: "Temná vojska",      icon: "🌑", hardCap: false },
    spell:       { id: "spell",       label: "Kouzla",            icon: "✨", hardCap: false },
    darkSpell:   { id: "darkSpell",   label: "Temná kouzla",      icon: "🧪", hardCap: false },
    siege:       { id: "siege",       label: "Obléhací stroje",   icon: "🚜", hardCap: false },
    defense:     { id: "defense",     label: "Obrana",            icon: "🏰", hardCap: false },
    wall:        { id: "wall",        label: "Zdi",               icon: "🧱", hardCap: false },
    builder:     { id: "builder",     label: "Builder Base",      icon: "🔨", hardCap: false }
  };

  var CATEGORY_ORDER = [
    "hero", "equipment", "pet", "elixirTroop", "darkTroop",
    "spell", "darkSpell", "siege", "defense", "wall", "builder"
  ];

  /* --- role jednotek (pro strategie) ------------------------------------
     war    = nosné jednotky pro klanové války / CWL
     farm   = levné a rychlé jednotky na farmení surovin
     push   = jednotky do legend / trophy push
     meta   = aktuálně silné jádro útoku, vyplatí se nahoru dřív
  ----------------------------------------------------------------------- */
  var UNIT_ROLES = {
    // hrdinové – jádro všeho
    "Barbarian King":   { war: 1.0, farm: 0.9, push: 0.9, meta: 1.0 },
    "Archer Queen":     { war: 1.0, farm: 1.0, push: 1.0, meta: 1.0 },
    "Grand Warden":     { war: 1.0, farm: 0.5, push: 1.0, meta: 1.0 },
    "Royal Champion":   { war: 1.0, farm: 0.6, push: 1.0, meta: 1.0 },
    "Minion Prince":    { war: 0.8, farm: 0.7, push: 0.8, meta: 0.8 },

    // elixírová vojska
    "Barbarian":        { war: 0.2, farm: 0.7, push: 0.2, meta: 0.2 },
    "Archer":           { war: 0.3, farm: 0.8, push: 0.3, meta: 0.3 },
    "Giant":            { war: 0.2, farm: 0.5, push: 0.2, meta: 0.2 },
    "Goblin":           { war: 0.1, farm: 0.9, push: 0.1, meta: 0.1 },
    "Wall Breaker":     { war: 0.4, farm: 0.5, push: 0.3, meta: 0.3 },
    "Balloon":          { war: 0.8, farm: 0.5, push: 0.7, meta: 0.7 },
    "Wizard":           { war: 0.6, farm: 0.5, push: 0.5, meta: 0.5 },
    "Healer":           { war: 0.9, farm: 0.8, push: 0.9, meta: 0.9 },
    "Dragon":           { war: 0.7, farm: 0.4, push: 0.6, meta: 0.6 },
    "P.E.K.K.A":        { war: 0.6, farm: 0.2, push: 0.5, meta: 0.5 },
    "Baby Dragon":      { war: 0.6, farm: 0.3, push: 0.5, meta: 0.5 },
    "Miner":            { war: 0.7, farm: 0.6, push: 0.6, meta: 0.6 },
    "Electro Dragon":   { war: 0.6, farm: 0.3, push: 0.5, meta: 0.5 },
    "Yeti":             { war: 0.6, farm: 0.2, push: 0.5, meta: 0.5 },
    "Dragon Rider":     { war: 0.8, farm: 0.3, push: 0.7, meta: 0.8 },
    "Electro Titan":    { war: 0.7, farm: 0.2, push: 0.6, meta: 0.6 },
    "Root Rider":       { war: 1.0, farm: 0.3, push: 0.9, meta: 1.0 },
    "Thrower":          { war: 0.8, farm: 0.2, push: 0.7, meta: 0.8 },

    // temná vojska
    "Minion":           { war: 0.5, farm: 0.6, push: 0.5, meta: 0.5 },
    "Hog Rider":        { war: 0.7, farm: 0.5, push: 0.7, meta: 0.6 },
    "Valkyrie":         { war: 0.6, farm: 0.4, push: 0.5, meta: 0.5 },
    "Golem":            { war: 0.5, farm: 0.2, push: 0.4, meta: 0.4 },
    "Witch":            { war: 0.7, farm: 0.2, push: 0.6, meta: 0.6 },
    "Lava Hound":       { war: 0.7, farm: 0.2, push: 0.6, meta: 0.6 },
    "Bowler":           { war: 0.6, farm: 0.2, push: 0.5, meta: 0.5 },
    "Ice Golem":        { war: 0.8, farm: 0.3, push: 0.7, meta: 0.7 },
    "Headhunter":       { war: 0.6, farm: 0.2, push: 0.5, meta: 0.5 },
    "Apprentice Warden":{ war: 0.8, farm: 0.2, push: 0.7, meta: 0.8 },
    "Druid":            { war: 0.9, farm: 0.2, push: 0.8, meta: 0.9 },
    "Furnace":          { war: 0.7, farm: 0.2, push: 0.6, meta: 0.7 },

    // kouzla
    "Lightning Spell":  { war: 0.6, farm: 0.5, push: 0.5, meta: 0.5 },
    "Healing Spell":    { war: 0.9, farm: 0.7, push: 0.9, meta: 0.9 },
    "Rage Spell":       { war: 1.0, farm: 0.6, push: 0.9, meta: 1.0 },
    "Jump Spell":       { war: 0.5, farm: 0.2, push: 0.4, meta: 0.4 },
    "Freeze Spell":     { war: 1.0, farm: 0.2, push: 0.9, meta: 1.0 },
    "Clone Spell":      { war: 0.5, farm: 0.2, push: 0.4, meta: 0.4 },
    "Invisibility Spell": { war: 0.8, farm: 0.4, push: 0.8, meta: 0.8 },
    "Recall Spell":     { war: 0.7, farm: 0.2, push: 0.6, meta: 0.7 },
    "Revive Spell":     { war: 0.7, farm: 0.2, push: 0.6, meta: 0.7 },

    // temná kouzla
    "Poison Spell":     { war: 0.8, farm: 0.3, push: 0.8, meta: 0.8 },
    "Earthquake Spell": { war: 0.6, farm: 0.5, push: 0.5, meta: 0.5 },
    "Haste Spell":      { war: 0.5, farm: 0.3, push: 0.5, meta: 0.5 },
    "Skeleton Spell":   { war: 0.6, farm: 0.2, push: 0.6, meta: 0.6 },
    "Bat Spell":        { war: 0.5, farm: 0.3, push: 0.5, meta: 0.5 },
    "Overgrowth Spell": { war: 0.7, farm: 0.2, push: 0.6, meta: 0.7 },
    "Ice Block Spell":  { war: 0.5, farm: 0.2, push: 0.5, meta: 0.5 },

    // obléhací stroje
    "Wall Wrecker":     { war: 0.8, farm: 0.3, push: 0.7, meta: 0.7 },
    "Battle Blimp":     { war: 0.5, farm: 0.2, push: 0.4, meta: 0.4 },
    "Stone Slammer":    { war: 0.5, farm: 0.2, push: 0.4, meta: 0.4 },
    "Siege Barracks":   { war: 0.6, farm: 0.2, push: 0.6, meta: 0.6 },
    "Log Launcher":     { war: 0.7, farm: 0.2, push: 0.6, meta: 0.6 },
    "Flame Flinger":    { war: 0.6, farm: 0.2, push: 0.5, meta: 0.5 },
    "Battle Drill":     { war: 0.6, farm: 0.2, push: 0.5, meta: 0.5 },
    "Troop Launcher":   { war: 0.6, farm: 0.2, push: 0.5, meta: 0.6 },

    // mazlíčci
    "L.A.S.S.I":        { war: 0.6, farm: 0.3, push: 0.5, meta: 0.5 },
    "Electro Owl":      { war: 0.5, farm: 0.2, push: 0.4, meta: 0.4 },
    "Mighty Yak":       { war: 0.7, farm: 0.3, push: 0.6, meta: 0.6 },
    "Unicorn":          { war: 0.8, farm: 0.4, push: 0.8, meta: 0.8 },
    "Frosty":           { war: 0.6, farm: 0.2, push: 0.5, meta: 0.5 },
    "Diggy":            { war: 0.6, farm: 0.2, push: 0.5, meta: 0.5 },
    "Poison Lizard":    { war: 0.6, farm: 0.2, push: 0.5, meta: 0.5 },
    "Phoenix":          { war: 0.8, farm: 0.3, push: 0.8, meta: 0.8 },
    "Spirit Fox":       { war: 0.7, farm: 0.3, push: 0.7, meta: 0.7 },
    "Angry Jelly":      { war: 0.6, farm: 0.2, push: 0.6, meta: 0.6 },
    "Sneezy":           { war: 0.6, farm: 0.2, push: 0.5, meta: 0.6 }
  };

  var DEFAULT_ROLE = { war: 0.5, farm: 0.4, push: 0.5, meta: 0.5 };

  /* Na kterém Town Hallu se jednotka odemyká.
     Používá se k tomu, aby appka neoznačila za "dluh" něco, co v té době
     ještě vůbec neexistovalo, a aby odhad stropu začínal od odemčení. */
  var UNLOCK_TH = {
    // elixírová vojska
    "Barbarian": 1, "Archer": 1, "Giant": 1, "Goblin": 2, "Wall Breaker": 3,
    "Balloon": 4, "Wizard": 5, "Healer": 6, "Dragon": 7, "P.E.K.K.A": 8,
    "Baby Dragon": 9, "Miner": 10, "Electro Dragon": 11, "Yeti": 12,
    "Dragon Rider": 13, "Electro Titan": 14, "Root Rider": 15, "Thrower": 16,
    // temná vojska
    "Minion": 7, "Hog Rider": 7, "Valkyrie": 8, "Golem": 8, "Witch": 9,
    "Lava Hound": 9, "Bowler": 10, "Ice Golem": 11, "Headhunter": 12,
    "Apprentice Warden": 14, "Druid": 16, "Furnace": 17,
    // kouzla
    "Lightning Spell": 5, "Healing Spell": 6, "Rage Spell": 7, "Jump Spell": 9,
    "Freeze Spell": 10, "Clone Spell": 10, "Invisibility Spell": 12,
    "Recall Spell": 13, "Revive Spell": 16,
    "Poison Spell": 8, "Earthquake Spell": 8, "Haste Spell": 9,
    "Skeleton Spell": 10, "Bat Spell": 11, "Overgrowth Spell": 15, "Ice Block Spell": 16,
    // obléhací stroje (Workshop)
    "Wall Wrecker": 12, "Battle Blimp": 12, "Stone Slammer": 13, "Siege Barracks": 13,
    "Log Launcher": 14, "Flame Flinger": 15, "Battle Drill": 16, "Troop Launcher": 16,
    // mazlíčci (Pet House)
    "L.A.S.S.I": 14, "Electro Owl": 14, "Mighty Yak": 14, "Unicorn": 14,
    "Frosty": 15, "Diggy": 15, "Poison Lizard": 15, "Phoenix": 15,
    "Spirit Fox": 16, "Angry Jelly": 16, "Sneezy": 17,
    // hrdinové
    "Barbarian King": 7, "Archer Queen": 9, "Grand Warden": 11,
    "Royal Champion": 13, "Minion Prince": 9
  };

  /* Vybavení hrdinů se odemyká s Blacksmithem; konkrétní kusy později,
     ale pro odhad stačí společná hranice. */
  var EQUIPMENT_UNLOCK_TH = 8;

  /* --- pomocné funkce ----------------------------------------------------- */

  function inList(list, name) {
    for (var i = 0; i < list.length; i++) if (list[i] === name) return true;
    return false;
  }

  function heroCap(name, th) {
    var row = HERO_CAPS[name];
    if (!row) return null;
    if (th < 1) th = 1;
    if (th > MAX_TH) th = MAX_TH;
    return row[th] || 0;
  }

  function labFraction(th) {
    if (th < 1) return LAB_FRACTION[1];
    if (th > MAX_TH) return 1;
    return LAB_FRACTION[th];
  }

  function roleOf(name) {
    return UNIT_ROLES[name] || DEFAULT_ROLE;
  }

  function unlockTH(name, category) {
    if (UNLOCK_TH[name]) return UNLOCK_TH[name];
    if (category === "equipment") return EQUIPMENT_UNLOCK_TH;
    return null;
  }

  /* Podíl dostupného stropu na daném TH, ukotvený k okamžiku odemčení
     jednotky. Jednotka odemčená na TH15 je na TH15 logicky na začátku
     své vlastní křivky, ne v 87 % globálního maxima. */
  function fractionSinceUnlock(th, unlock) {
    if (!unlock || unlock <= 1) return labFraction(th);
    if (th < unlock) return 0;
    var base = labFraction(unlock - 1);
    if (base >= 1) return 1;
    return Math.max(0, Math.min(1, (labFraction(th) - base) / (1 - base)));
  }

  global.COC_DATA = {
    version: "2026.08 — community snapshot",
    maxTH: MAX_TH,
    heroCaps: HERO_CAPS,
    labFraction: LAB_FRACTION,
    darkTroops: DARK_TROOPS,
    siegeMachines: SIEGE_MACHINES,
    pets: PETS,
    darkSpells: DARK_SPELLS,
    superTroops: SUPER_TROOPS,
    categories: CATEGORIES,
    categoryOrder: CATEGORY_ORDER,
    unitRoles: UNIT_ROLES,
    defaultRole: DEFAULT_ROLE,
    isDarkTroop: function (n) { return inList(DARK_TROOPS, n); },
    isSiege: function (n) { return inList(SIEGE_MACHINES, n); },
    isPet: function (n) { return inList(PETS, n); },
    isDarkSpell: function (n) { return inList(DARK_SPELLS, n); },
    isSuperTroop: function (n) { return inList(SUPER_TROOPS, n); },
    heroCap: heroCap,
    labFractionFor: labFraction,
    roleOf: roleOf,
    unlockTH: unlockTH,
    unlockTable: UNLOCK_TH,
    fractionSinceUnlock: fractionSinceUnlock
  };
})(window);
