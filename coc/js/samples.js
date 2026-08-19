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

  /* Export z herního klienta — číselná ID, včetně budov a Builder Base.
     Kosmetika (dekorace, překážky, skiny) je vynechaná, na analýzu nemá vliv. */
  var EXPORT = {"tag":"#PRQ2PPCCJ","timestamp":1787129300,"helpers":[{"data":93000001,"lvl":1},{"data":93000002,"lvl":1},{"data":93000003,"lvl":1,"helper_cooldown":43801}],"buildings":[{"data":1000001,"lvl":13,"weapon":1},{"data":1000000,"lvl":10,"timer":99835},{"data":1000000,"lvl":10,"timer":118230},{"data":1000020,"lvl":6,"timer":235195},{"data":1000000,"lvl":10,"timer":331096},{"data":1000008,"lvl":15,"gear_up":1},{"data":1000027,"lvl":6,"timer":270624},{"data":1000097,"types":[{"data":103000011,"modules":[{"data":102000033,"lvl":1},{"data":102000034,"lvl":1},{"data":102000035,"lvl":1}]},{"data":103000012,"modules":[{"data":102000036,"lvl":1},{"data":102000037,"lvl":1},{"data":102000038,"lvl":1}]},{"data":103000013,"modules":[{"data":102000039,"lvl":1},{"data":102000040,"lvl":1},{"data":102000041,"lvl":1}]}]},{"data":1000000,"lvl":11,"cnt":1},{"data":1000002,"lvl":15,"cnt":7},{"data":1000003,"lvl":14,"cnt":4},{"data":1000004,"lvl":14,"cnt":2},{"data":1000004,"lvl":15,"cnt":5},{"data":1000005,"lvl":13,"cnt":1},{"data":1000005,"lvl":14,"cnt":3},{"data":1000006,"lvl":15,"cnt":1},{"data":1000007,"lvl":11,"cnt":1},{"data":1000008,"lvl":15,"cnt":6},{"data":1000009,"lvl":15,"cnt":4},{"data":1000009,"lvl":16,"cnt":4},{"data":1000010,"lvl":13,"cnt":168},{"data":1000010,"lvl":14,"cnt":132},{"data":1000011,"lvl":10,"cnt":4},{"data":1000011,"lvl":11,"cnt":1},{"data":1000012,"lvl":9,"cnt":4},{"data":1000013,"lvl":10,"cnt":4},{"data":1000014,"lvl":9,"cnt":1},{"data":1000015,"lvl":1,"cnt":5},{"data":1000019,"lvl":3,"cnt":1},{"data":1000019,"lvl":9,"cnt":4},{"data":1000021,"lvl":5,"cnt":4},{"data":1000023,"lvl":8,"cnt":3},{"data":1000024,"lvl":6,"cnt":1},{"data":1000026,"lvl":9,"cnt":1},{"data":1000027,"lvl":6,"cnt":2},{"data":1000028,"lvl":7,"cnt":2},{"data":1000029,"lvl":5,"cnt":1},{"data":1000031,"lvl":4,"cnt":1},{"data":1000032,"lvl":6,"cnt":1},{"data":1000032,"lvl":7,"cnt":1},{"data":1000059,"lvl":3,"cnt":1},{"data":1000067,"lvl":1,"cnt":1},{"data":1000067,"lvl":2,"cnt":1},{"data":1000070,"lvl":5,"cnt":1},{"data":1000071,"lvl":7,"cnt":1},{"data":1000093,"lvl":1,"cnt":1}],"traps":[{"data":12000000,"lvl":1,"cnt":1},{"data":12000000,"lvl":7,"cnt":6},{"data":12000001,"lvl":1,"cnt":3},{"data":12000001,"lvl":6,"cnt":6},{"data":12000002,"lvl":1,"cnt":1},{"data":12000002,"lvl":4,"cnt":2},{"data":12000002,"lvl":5,"cnt":3},{"data":12000005,"lvl":1,"cnt":1},{"data":12000005,"lvl":4,"cnt":2},{"data":12000005,"lvl":5,"cnt":3},{"data":12000006,"lvl":1,"cnt":2},{"data":12000006,"lvl":3,"cnt":5},{"data":12000008,"lvl":4,"cnt":3},{"data":12000016,"lvl":2,"cnt":1}],"units":[{"data":4000000,"lvl":8},{"data":4000001,"lvl":8},{"data":4000002,"lvl":7},{"data":4000003,"lvl":8},{"data":4000004,"lvl":7},{"data":4000005,"lvl":7},{"data":4000006,"lvl":9},{"data":4000007,"lvl":5},{"data":4000008,"lvl":8},{"data":4000009,"lvl":7},{"data":4000010,"lvl":7},{"data":4000011,"lvl":6},{"data":4000012,"lvl":8},{"data":4000013,"lvl":9},{"data":4000015,"lvl":5},{"data":4000017,"lvl":4},{"data":4000022,"lvl":4},{"data":4000023,"lvl":5},{"data":4000024,"lvl":2},{"data":4000053,"lvl":1},{"data":4000058,"lvl":3},{"data":4000059,"lvl":2},{"data":4000065,"lvl":1},{"data":4000082,"lvl":1,"timer":308705}],"siege_machines":[{"data":4000051,"lvl":1},{"data":4000052,"lvl":1},{"data":4000062,"lvl":1}],"heroes":[{"data":28000000,"lvl":50},{"data":28000001,"lvl":46},{"data":28000002,"lvl":20},{"data":28000004,"lvl":2},{"data":28000006,"lvl":29}],"spells":[{"data":26000000,"lvl":8},{"data":26000001,"lvl":7},{"data":26000002,"lvl":5},{"data":26000003,"lvl":3},{"data":26000005,"lvl":3},{"data":26000009,"lvl":4},{"data":26000010,"lvl":3},{"data":26000011,"lvl":4},{"data":26000016,"lvl":2},{"data":26000017,"lvl":3},{"data":26000028,"lvl":4},{"data":26000035,"lvl":2}],"pets":[],"equipment":[{"data":90000000,"lvl":6},{"data":90000001,"lvl":10},{"data":90000002,"lvl":5},{"data":90000003,"lvl":5},{"data":90000004,"lvl":4},{"data":90000005,"lvl":5},{"data":90000006,"lvl":5},{"data":90000007,"lvl":5},{"data":90000008,"lvl":1},{"data":90000010,"lvl":14},{"data":90000011,"lvl":8},{"data":90000013,"lvl":1},{"data":90000014,"lvl":12},{"data":90000015,"lvl":9},{"data":90000016,"lvl":1},{"data":90000017,"lvl":12},{"data":90000019,"lvl":1},{"data":90000020,"lvl":15},{"data":90000022,"lvl":5},{"data":90000024,"lvl":10},{"data":90000032,"lvl":1},{"data":90000035,"lvl":9},{"data":90000039,"lvl":1},{"data":90000040,"lvl":8},{"data":90000041,"lvl":1},{"data":90000042,"lvl":1},{"data":90000043,"lvl":8},{"data":90000044,"lvl":1},{"data":90000047,"lvl":1},{"data":90000048,"lvl":1},{"data":90000049,"lvl":1},{"data":90000050,"lvl":1},{"data":90000051,"lvl":1},{"data":90000052,"lvl":1},{"data":90000053,"lvl":1},{"data":90000057,"lvl":1},{"data":90000060,"lvl":1}],"buildings2":[{"data":1000045,"lvl":6,"timer":273881},{"data":1000038,"lvl":6,"timer":3720},{"data":1000033,"lvl":1,"cnt":40},{"data":1000033,"lvl":3,"cnt":8},{"data":1000033,"lvl":4,"cnt":102},{"data":1000033,"lvl":5,"cnt":10},{"data":1000034,"lvl":8,"cnt":1},{"data":1000035,"lvl":1,"cnt":1},{"data":1000035,"lvl":6,"cnt":2},{"data":1000036,"lvl":6,"cnt":2},{"data":1000037,"lvl":1,"cnt":1},{"data":1000037,"lvl":6,"cnt":2},{"data":1000038,"lvl":6,"cnt":1},{"data":1000039,"lvl":7,"cnt":1},{"data":1000040,"lvl":9,"cnt":1},{"data":1000041,"lvl":1,"cnt":1},{"data":1000041,"lvl":4,"cnt":1},{"data":1000041,"lvl":5,"cnt":1},{"data":1000042,"lvl":1,"cnt":6},{"data":1000043,"lvl":1,"cnt":1},{"data":1000043,"lvl":5,"cnt":2},{"data":1000044,"lvl":1,"cnt":1},{"data":1000044,"lvl":5,"cnt":2},{"data":1000046,"lvl":7,"cnt":1},{"data":1000047,"lvl":1,"cnt":1},{"data":1000048,"lvl":5,"cnt":3},{"data":1000049,"lvl":1,"cnt":1},{"data":1000050,"lvl":1,"cnt":2},{"data":1000050,"lvl":5,"cnt":2},{"data":1000051,"lvl":5,"cnt":1},{"data":1000052,"lvl":1,"cnt":1},{"data":1000053,"lvl":1,"cnt":1},{"data":1000054,"lvl":6,"cnt":1},{"data":1000055,"lvl":6,"cnt":2},{"data":1000056,"lvl":6,"cnt":1},{"data":1000057,"lvl":1,"cnt":1},{"data":1000058,"lvl":6,"cnt":1},{"data":1000078,"lvl":4,"cnt":1},{"data":1000080,"lvl":1,"cnt":1},{"data":1000082,"lvl":2,"cnt":1}],"traps2":[{"data":12000010,"lvl":1,"cnt":2},{"data":12000010,"lvl":3,"cnt":3},{"data":12000011,"lvl":1,"cnt":4},{"data":12000011,"lvl":2,"cnt":1},{"data":12000013,"lvl":2,"cnt":1},{"data":12000013,"lvl":4,"cnt":2},{"data":12000013,"lvl":6,"cnt":2},{"data":12000014,"lvl":1,"cnt":1},{"data":12000014,"lvl":6,"cnt":2}],"units2":[{"data":4000031,"lvl":10},{"data":4000032,"lvl":9},{"data":4000033,"lvl":9},{"data":4000034,"lvl":8},{"data":4000035,"lvl":7},{"data":4000037,"lvl":8},{"data":4000038,"lvl":11},{"data":4000041,"lvl":14},{"data":4000042,"lvl":12}],"heroes2":[{"data":28000003,"lvl":10},{"data":28000005,"lvl":15}],"boosts":{"clocktower_cooldown":12517}};

  COC.samples = {
    list: [
      { id: "export", label: "TH13 — export z hry (i s budovami)", data: EXPORT },
      { id: "rushed", label: "TH13 — z API, silně rushnutá", data: RUSHED },
      { id: "solid",  label: "TH15 — z API, poctivě vedená", data: SOLID },
      { id: "both",   label: "Dvě naráz (porovnání)", data: [RUSHED, SOLID] }
    ],
    byId: function (id) {
      for (var i = 0; i < this.list.length; i++) if (this.list[i].id === id) return this.list[i];
      return null;
    }
  };
})(window);
