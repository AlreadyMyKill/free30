/* =========================================================================
 * samples.js — ukázkové vesnice (aby šlo appku vyzkoušet bez vlastních dat)
 * Struktura odpovídá oficiálnímu JSONu z /players/{tag}.
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};

  /* [jméno, globální maxLevel] — hodnoty odpovídají běžnému snapshotu hry */
  var TROOPS = [
    ["Barbarian", 12], ["Archer", 12], ["Giant", 12], ["Goblin", 10],
    ["Wall Breaker", 12], ["Balloon", 12], ["Wizard", 13], ["Healer", 8],
    ["Dragon", 11], ["P.E.K.K.A", 12], ["Baby Dragon", 10], ["Miner", 10],
    ["Electro Dragon", 8], ["Yeti", 6], ["Dragon Rider", 5], ["Electro Titan", 5],
    ["Root Rider", 4], ["Minion", 12], ["Hog Rider", 13], ["Valkyrie", 11],
    ["Golem", 13], ["Witch", 7], ["Lava Hound", 6], ["Bowler", 7],
    ["Ice Golem", 7], ["Headhunter", 4], ["Apprentice Warden", 5], ["Druid", 4]
  ];

  var SIEGES = [
    ["Wall Wrecker", 5], ["Battle Blimp", 5], ["Stone Slammer", 5],
    ["Siege Barracks", 5], ["Log Launcher", 5], ["Flame Flinger", 4], ["Battle Drill", 4]
  ];

  var PETS = [
    ["L.A.S.S.I", 15], ["Electro Owl", 15], ["Mighty Yak", 15], ["Unicorn", 15],
    ["Frosty", 10], ["Diggy", 10], ["Poison Lizard", 10], ["Phoenix", 10]
  ];

  var SPELLS = [
    ["Lightning Spell", 11], ["Healing Spell", 10], ["Rage Spell", 6],
    ["Jump Spell", 5], ["Freeze Spell", 7], ["Clone Spell", 8],
    ["Invisibility Spell", 4], ["Recall Spell", 4],
    ["Poison Spell", 10], ["Earthquake Spell", 5], ["Haste Spell", 5],
    ["Skeleton Spell", 8], ["Bat Spell", 6], ["Overgrowth Spell", 4]
  ];

  var EQUIPMENT = [
    ["Barbarian Puppet", 18], ["Rage Vial", 18], ["Earthquake Boots", 18],
    ["Vampstache", 18], ["Archer Puppet", 18], ["Invisibility Vial", 18],
    ["Giant Arrow", 18], ["Healer Puppet", 18], ["Eternal Tome", 18],
    ["Life Gem", 18], ["Rage Gem", 18], ["Healing Tome", 18],
    ["Royal Gem", 18], ["Seeking Shield", 18], ["Haste Vial", 18]
  ];

  function build(list, village, frac, overrides) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var name = list[i][0], max = list[i][1];
      var lvl;
      if (overrides && overrides[name] !== undefined) lvl = overrides[name];
      else lvl = Math.max(0, Math.min(max, Math.round(max * frac[i % frac.length])));
      out.push({ name: name, level: lvl, maxLevel: max, village: village });
    }
    return out;
  }

  var RUSHED_FRAC = [0.35, 0.5, 0.25, 0.4, 0.3, 0.45, 0.35, 0.2, 0.5, 0.3, 0.25];
  var SOLID_FRAC  = [0.85, 0.9, 0.8, 0.85, 0.9, 0.8, 0.85, 0.75, 0.9, 0.85, 0.8];

  var RUSHED = {
    tag: "#2RUSH13X",
    name: "RushKing",
    townHallLevel: 13,
    townHallWeaponLevel: 3,
    expLevel: 148,
    trophies: 3120,
    bestTrophies: 3410,
    warStars: 640,
    attackWins: 91,
    defenseWins: 12,
    builderHallLevel: 8,
    builderBaseTrophies: 3020,
    donations: 1840,
    donationsReceived: 2210,
    clanCapitalContributions: 41000,
    role: "member",
    warPreference: "in",
    clan: { tag: "#RUSHCLAN", name: "Rychlá parta", clanLevel: 12 },
    league: { name: "Crystal League I" },
    labels: [{ name: "Rushed Base" }],
    heroes: [
      { name: "Barbarian King", level: 28, maxLevel: 100, village: "home" },
      { name: "Archer Queen",   level: 32, maxLevel: 100, village: "home" },
      { name: "Grand Warden",   level: 12, maxLevel: 75,  village: "home" },
      { name: "Royal Champion", level: 0,  maxLevel: 50,  village: "home" },
      { name: "Minion Prince",  level: 8,  maxLevel: 90,  village: "home" }
    ],
    heroEquipment: build(EQUIPMENT, "home", [0.15, 0.2, 0.1, 0.05, 0.15]),
    troops: build(TROOPS, "home", RUSHED_FRAC, { "Root Rider": 0, "Electro Titan": 0, "Druid": 0 })
      .concat(build(SIEGES, "home", [0.2, 0, 0, 0, 0.2, 0, 0]))
      .concat(build(PETS, "home", [0.15, 0, 0.1, 0, 0, 0, 0, 0])),
    spells: build(SPELLS, "home", RUSHED_FRAC)
  };

  var SOLID = {
    tag: "#8MAX15Y",
    name: "SteadyBuilder",
    townHallLevel: 15,
    townHallWeaponLevel: 5,
    expLevel: 231,
    trophies: 5240,
    bestTrophies: 5610,
    warStars: 1980,
    attackWins: 310,
    defenseWins: 96,
    builderHallLevel: 10,
    builderBaseTrophies: 4400,
    donations: 12400,
    donationsReceived: 9800,
    clanCapitalContributions: 380000,
    role: "coLeader",
    warPreference: "in",
    clan: { tag: "#STEADY", name: "Klidná ruka", clanLevel: 22 },
    league: { name: "Titan League II" },
    labels: [{ name: "Clan Wars" }, { name: "Active Daily" }],
    heroes: [
      { name: "Barbarian King", level: 86, maxLevel: 100, village: "home" },
      { name: "Archer Queen",   level: 88, maxLevel: 100, village: "home" },
      { name: "Grand Warden",   level: 61, maxLevel: 75,  village: "home" },
      { name: "Royal Champion", level: 36, maxLevel: 50,  village: "home" },
      { name: "Minion Prince",  level: 52, maxLevel: 90,  village: "home" }
    ],
    heroEquipment: build(EQUIPMENT, "home", [0.6, 0.75, 0.5, 0.45, 0.65]),
    troops: build(TROOPS, "home", SOLID_FRAC, { "Druid": 1 })
      .concat(build(SIEGES, "home", [0.8, 0.6, 0.6, 0.8, 0.8, 0.6, 0]))
      .concat(build(PETS, "home", [0.8, 0.7, 0.8, 0.75, 0.4, 0.3, 0.3, 0.2])),
    spells: build(SPELLS, "home", SOLID_FRAC),
    /* nepovinné rozšíření – budovy, které oficiální API neposílá */
    buildings: [
      { name: "Cannon", level: 19, count: 7, maxLevel: 21 },
      { name: "Archer Tower", level: 19, count: 8, maxLevel: 21 },
      { name: "Mortar", level: 14, count: 4, maxLevel: 16 },
      { name: "Air Defense", level: 12, count: 4, maxLevel: 14 },
      { name: "Wizard Tower", level: 14, count: 5, maxLevel: 16 },
      { name: "Hidden Tesla", level: 12, count: 5, maxLevel: 14 },
      { name: "X-Bow", level: 9, count: 4, maxLevel: 11 },
      { name: "Inferno Tower", level: 8, count: 3, maxLevel: 10 },
      { name: "Eagle Artillery", level: 5, count: 1, maxLevel: 6 },
      { name: "Scattershot", level: 3, count: 2, maxLevel: 4 },
      { name: "Monolith", level: 1, count: 1, maxLevel: 2 },
      { name: "Wall", level: 15, count: 325, maxLevel: 16 }
    ]
  };

  COC.samples = {
    list: [
      { id: "rushed", label: "TH13 — silně rushnutá vesnice", data: RUSHED },
      { id: "solid",  label: "TH15 — poctivě vedená vesnice", data: SOLID },
      { id: "both",   label: "Obě naráz (porovnání)", data: [RUSHED, SOLID] }
    ],
    byId: function (id) {
      for (var i = 0; i < this.list.length; i++) if (this.list[i].id === id) return this.list[i];
      return null;
    }
  };
})(window);
