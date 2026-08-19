/* =========================================================================
 * parse.js — načtení a normalizace JSON dat vesnice
 *
 * Podporované vstupy:
 *   A) Oficiální JSON hráče z Clash of Clans API (/players/%23TAG)
 *   B) Export z herního klienta — číselná `data` ID, obsahuje navíc budovy,
 *      zdi, pasti a celý Builder Base
 *   C) Pole nebo { "items": [...] } s libovolným z výše uvedených
 *
 * Výstup je pro obě varianty stejný: seznam položek `units`, kde každá má
 * jméno, kategorii, součet úrovní a počet kusů (u budov).
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};
  var D = global.COC_DATA;

  var TOWN_HALL_ID = 1000001;
  var BUILDER_HALL_ID = 1000034;

  /* ---------------------------------------------------------------- A/C */

  var DEFENSE_HINTS = [
    "Cannon", "Archer Tower", "Mortar", "Air Defense", "Wizard Tower",
    "Air Sweeper", "Hidden Tesla", "Bomb Tower", "X-Bow", "Inferno Tower",
    "Eagle Artillery", "Scattershot", "Spell Tower", "Monolith",
    "Multi-Archer Tower", "Ricochet Cannon", "Firespitter", "Multi-Gear Tower"
  ];

  function isDefenseName(name) {
    for (var i = 0; i < DEFENSE_HINTS.length; i++) {
      if (name.indexOf(DEFENSE_HINTS[i]) !== -1) return true;
    }
    return false;
  }

  function classifyByName(entry, source) {
    var name = entry.name || "";
    if (source === "hero") return "hero";
    if (source === "equipment") return "equipment";
    if (entry.village === "builderBase") return "builder";
    if (source === "spell") return D.isDarkSpell(name) ? "darkSpell" : "spell";
    if (D.isPet(name)) return "pet";
    if (D.isSiege(name)) return "siege";
    if (D.isDarkTroop(name)) return "darkTroop";
    return "elixirTroop";
  }

  function makeUnit(o) {
    return {
      dataId: o.dataId || null,
      name: o.name,
      level: o.level || 0,          // u budov součet úrovní všech kusů
      count: o.count || 1,
      instances: o.instances || [[o.level || 0, 1]],
      maxLevel: o.maxLevel || 0,
      category: o.category,
      village: o.village || "home",
      isSuper: !!o.isSuper,
      equipped: !!o.equipped,
      upgrading: o.upgrading || 0,
      timers: o.timers || []      // [{lvl, sec}] pro každý rozestavěný kus
    };
  }

  function pushApiUnits(target, arr, source) {
    if (!arr || !arr.length) return;
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      if (!e || typeof e.name !== "string") continue;
      var category = classifyByName(e, source);
      var dataId = COC.catalog.idByName(e.name, e.village === "builderBase" ? "builder" : "home");
      target.push(makeUnit({
        dataId: dataId,
        name: e.name,
        level: Number(e.level) || 0,
        maxLevel: Number(e.maxLevel) || 0,
        category: category,
        village: e.village === "builderBase" ? "builder" : "home",
        isSuper: D.isSuperTroop(e.name),
        equipped: !!e.equipped
      }));
    }
  }

  /* Nepovinné rozšíření oficiálního formátu: ručně dopsané budovy. */
  function pushExtraBuildings(target, input) {
    if (!input) return;

    function add(name, level, count, maxLevel) {
      if (!name) return;
      var lvl = Number(level) || 0;
      var cnt = Number(count) || 1;
      var lower = String(name).toLowerCase();
      var category = lower.indexOf("wall") === 0 ? "wall" : (isDefenseName(name) ? "defense" : "other");
      target.push(makeUnit({
        dataId: COC.catalog.idByName(name, "home"),
        name: name,
        level: lvl * cnt,
        count: cnt,
        instances: [[lvl, cnt]],
        maxLevel: Number(maxLevel) || 0,
        category: category
      }));
    }

    if (Object.prototype.toString.call(input) === "[object Array]") {
      for (var i = 0; i < input.length; i++) {
        var b = input[i];
        if (!b) continue;
        if (b.levels && b.levels.length) {
          for (var j = 0; j < b.levels.length; j++) add(b.name, b.levels[j], 1, b.maxLevel);
        } else {
          add(b.name, b.level, b.count, b.maxLevel);
        }
      }
      return;
    }

    for (var key in input) {
      if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
      var v = input[key];
      if (Object.prototype.toString.call(v) === "[object Array]") {
        for (var k = 0; k < v.length; k++) add(key, v[k], 1, 0);
      } else if (v && typeof v === "object") {
        add(key, v.level, v.count, v.maxLevel);
      } else {
        add(key, v, 1, 0);
      }
    }
  }

  function normalizeApiPlayer(p) {
    var units = [];
    pushApiUnits(units, p.heroes, "hero");
    pushApiUnits(units, p.heroEquipment, "equipment");
    pushApiUnits(units, p.troops, "troop");
    pushApiUnits(units, p.spells, "spell");
    pushExtraBuildings(units, p.buildings || (p.village && p.village.buildings) || p.defenses);

    return {
      raw: p,
      format: "api",
      tag: p.tag || "",
      name: p.name || "Neznámý hráč",
      th: Number(p.townHallLevel) || 0,
      thWeapon: Number(p.townHallWeaponLevel) || 0,
      bh: Number(p.builderHallLevel) || 0,
      expLevel: Number(p.expLevel) || 0,
      trophies: Number(p.trophies) || 0,
      bestTrophies: Number(p.bestTrophies) || 0,
      builderTrophies: Number(p.builderBaseTrophies) || 0,
      warStars: Number(p.warStars) || 0,
      attackWins: Number(p.attackWins) || 0,
      defenseWins: Number(p.defenseWins) || 0,
      donations: Number(p.donations) || 0,
      donationsReceived: Number(p.donationsReceived) || 0,
      capitalContributions: Number(p.clanCapitalContributions) || 0,
      role: p.role || "",
      warPreference: p.warPreference || "",
      clan: p.clan ? { name: p.clan.name, tag: p.clan.tag, level: p.clan.clanLevel } : null,
      league: p.league ? p.league.name : "",
      labels: (p.labels || []).map(function (l) { return l.name; }),
      achievements: p.achievements || [],
      units: units,
      hasBuildings: units.some(function (u) { return u.category === "defense" || u.category === "wall"; })
    };
  }

  /* ------------------------------------------------------------------ B */

  /* Klíče exportu a vesnice, do které patří. */
  var EXPORT_GROUPS = [
    ["buildings", "home"], ["traps", "home"],
    ["units", "home"], ["spells", "home"], ["heroes", "home"],
    ["siege_machines", "home"], ["pets", "home"], ["equipment", "home"],
    ["helpers", "home"],
    ["buildings2", "builder"], ["traps2", "builder"],
    ["units2", "builder"], ["heroes2", "builder"]
  ];

  function looksLikeExport(o) {
    if (!o || typeof o !== "object") return false;
    var arr = o.buildings;
    if (Object.prototype.toString.call(arr) !== "[object Array]" || !arr.length) return false;
    return typeof arr[0].data === "number";
  }

  function hallLevel(list, wantedId) {
    if (!list) return 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].data === wantedId) return Number(list[i].lvl) || 0;
    }
    return 0;
  }

  function normalizeExport(p) {
    var th = hallLevel(p.buildings, TOWN_HALL_ID);
    var bh = hallLevel(p.buildings2, BUILDER_HALL_ID);
    var thWeapon = 0;

    // Nejdřív posbíráme syrové položky, pak je sloučíme podle dataId.
    var groups = {};
    var unknown = {};

    for (var g = 0; g < EXPORT_GROUPS.length; g++) {
      var key = EXPORT_GROUPS[g][0];
      var village = EXPORT_GROUPS[g][1];
      var list = p[key];
      if (Object.prototype.toString.call(list) !== "[object Array]") continue;

      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        if (!e || typeof e.data !== "number") continue;
        if (e.lvl === undefined) continue;    // např. craftovaná obrana bez úrovně

        if (e.data === TOWN_HALL_ID && e.weapon) thWeapon = Number(e.weapon) || 0;

        var info = COC.catalog.item(e.data);
        var groupKey = village + ":" + e.data;
        var entry = groups[groupKey];
        if (!entry) {
          entry = groups[groupKey] = {
            dataId: e.data,
            name: info ? info.n : ("Neznámé #" + e.data),
            category: info ? info.c : (village === "builder" ? "builderOther" : "other"),
            village: village,
            level: 0,
            count: 0,
            instances: [],
            upgrading: 0,
            timers: [],
            maxLevel: info ? info.L.length : 0
          };
          if (!info) unknown[e.data] = true;
        }

        var cnt = Number(e.cnt) || 1;
        var lvl = Number(e.lvl) || 0;
        entry.count += cnt;
        entry.level += lvl * cnt;
        entry.instances.push([lvl, cnt]);
        if (e.timer) {
          entry.upgrading += cnt;
          entry.timers.push({ lvl: lvl, sec: Number(e.timer) || 0 });
        }
      }
    }

    var units = [];
    for (var k in groups) {
      if (Object.prototype.hasOwnProperty.call(groups, k)) units.push(makeUnit(groups[k]));
    }

    return {
      raw: p,
      format: "export",
      tag: p.tag || "",
      name: p.name || "Moje vesnice",
      th: th,
      thWeapon: thWeapon,
      bh: bh,
      expLevel: 0, trophies: 0, bestTrophies: 0, builderTrophies: 0,
      warStars: 0, attackWins: 0, defenseWins: 0,
      donations: 0, donationsReceived: 0, capitalContributions: 0,
      role: "", warPreference: "", clan: null, league: "",
      labels: [], achievements: [],
      exportedAt: p.timestamp ? new Date(p.timestamp * 1000) : null,
      exportedAtSec: p.timestamp ? Number(p.timestamp) : null,
      units: units,
      unknownIds: Object.keys(unknown).map(Number),
      hasBuildings: true
    };
  }

  /* ------------------------------------------------------------ společné */

  function looksLikeApiPlayer(o) {
    return !!o && typeof o === "object" &&
      (o.townHallLevel !== undefined || o.troops !== undefined || o.heroes !== undefined);
  }

  function parseInput(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error("JSON se nepodařilo načíst: " + err.message);
    }
    return fromObject(data);
  }

  function fromObject(data) {
    var warnings = [];
    var list;

    if (Object.prototype.toString.call(data) === "[object Array]") list = data;
    else if (data && Object.prototype.toString.call(data.items) === "[object Array]") list = data.items;
    else if (data && Object.prototype.toString.call(data.players) === "[object Array]") list = data.players;
    else list = [data];

    var villages = [];
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      var v = null;

      if (looksLikeExport(o)) v = normalizeExport(o);
      else if (looksLikeApiPlayer(o)) v = normalizeApiPlayer(o);

      if (!v) {
        warnings.push("Položka #" + (i + 1) + " není rozpoznaný formát (chybí townHallLevel/troops/heroes " +
          "i pole buildings s číselnými ID) – přeskočeno.");
        continue;
      }

      if (!v.th) warnings.push("Vesnice „" + v.name + "“ nemá rozpoznaný Town Hall – analýza bude nepřesná.");
      if (!v.units.length) warnings.push("Vesnice „" + v.name + "“ neobsahuje žádné položky.");
      if (v.unknownIds && v.unknownIds.length) {
        warnings.push("Neznámá herní ID (" + v.unknownIds.length + "): " + v.unknownIds.slice(0, 8).join(", ") +
          (v.unknownIds.length > 8 ? " …" : "") + ". Nejspíš novinka, kterou zabudovaná herní data ještě neznají — " +
          "do analýzy se nezapočítají.");
      }
      villages.push(v);
    }

    if (!villages.length) {
      throw new Error("V datech nebyla nalezena žádná vesnice. Očekává se JSON z /players/{tag}, " +
        "export z herního klienta, nebo pole takových objektů.");
    }
    return { villages: villages, warnings: warnings };
  }

  COC.parse = {
    parseInput: parseInput,
    fromObject: fromObject,
    looksLikeExport: looksLikeExport,
    isDefenseName: isDefenseName
  };
})(window);
