/* =========================================================================
 * parse.js — načtení a normalizace JSON dat vesnice
 *
 * Podporované vstupy:
 *   1) Oficiální JSON hráče z Clash of Clans API  (/players/%23TAG)
 *   2) Pole takových objektů  [ {...}, {...} ]      -> porovnání více vesnic
 *   3) Odpověď typu { "items": [ ... ] }
 *   4) Rozšíření (nepovinné) – budovy, které oficiální API neposílá:
 *        "buildings": [ { "name": "Cannon", "level": 15, "count": 8 }, ... ]
 *      nebo zkrácené zápisy:
 *        "buildings": { "Cannon": 15 }
 *        "buildings": { "Cannon": [15, 15, 14, 14] }
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};
  var D = global.COC_DATA;

  var DEFENSE_HINTS = [
    "Cannon", "Archer Tower", "Mortar", "Air Defense", "Wizard Tower",
    "Air Sweeper", "Hidden Tesla", "Bomb Tower", "X-Bow", "Inferno Tower",
    "Eagle Artillery", "Scattershot", "Builder's Hut", "Spell Tower",
    "Monolith", "Multi-Archer Tower", "Ricochet Cannon", "Firespitter",
    "Multi-Gear Tower", "Giga Tesla", "Giga Inferno"
  ];

  function isDefenseName(name) {
    for (var i = 0; i < DEFENSE_HINTS.length; i++) {
      if (name.indexOf(DEFENSE_HINTS[i]) !== -1) return true;
    }
    return false;
  }

  function classify(entry, source) {
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

  function pushUnits(target, arr, source) {
    if (!arr || !arr.length) return;
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      if (!e || typeof e.name !== "string") continue;
      var level = Number(e.level) || 0;
      var maxLevel = Number(e.maxLevel) || 0;
      target.push({
        name: e.name,
        level: level,
        maxLevel: maxLevel,
        village: e.village || "home",
        category: classify(e, source),
        isSuper: D.isSuperTroop(e.name),
        superActive: !!e.superTroopIsActive,
        equipped: !!e.equipped
      });
    }
  }

  /* Budovy umí uživatel dodat v několika tvarech – všechny sjednotíme. */
  function normalizeBuildings(input) {
    var out = [];
    if (!input) return out;

    function add(name, level, count, maxLevel) {
      if (!name) return;
      var lvl = Number(level) || 0;
      out.push({
        name: name,
        level: lvl,
        count: Number(count) || 1,
        maxLevel: Number(maxLevel) || 0,
        category: isDefenseName(name) ? "defense"
          : (name.toLowerCase().indexOf("wall") === 0 ? "wall" : "defense")
      });
    }

    if (Object.prototype.toString.call(input) === "[object Array]") {
      for (var i = 0; i < input.length; i++) {
        var b = input[i];
        if (!b) continue;
        if (typeof b === "object" && b.levels && b.levels.length) {
          for (var j = 0; j < b.levels.length; j++) add(b.name, b.levels[j], 1, b.maxLevel);
        } else {
          add(b.name, b.level, b.count, b.maxLevel);
        }
      }
      return out;
    }

    if (typeof input === "object") {
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
    return out;
  }

  function normalizePlayer(p) {
    if (!p || typeof p !== "object") return null;

    var units = [];
    pushUnits(units, p.heroes, "hero");
    pushUnits(units, p.heroEquipment, "equipment");
    pushUnits(units, p.troops, "troop");
    pushUnits(units, p.spells, "spell");

    var buildings = normalizeBuildings(p.buildings || (p.village && p.village.buildings) || p.defenses);

    var wallEntry = p.walls || (p.village && p.village.walls);
    if (wallEntry) {
      var w = normalizeBuildings(
        Object.prototype.toString.call(wallEntry) === "[object Array]" ? wallEntry : { "Wall": wallEntry }
      );
      for (var i = 0; i < w.length; i++) { w[i].category = "wall"; buildings.push(w[i]); }
    }

    return {
      raw: p,
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
      league: p.league ? p.league.name : (p.leagueName || ""),
      labels: (p.labels || []).map(function (l) { return l.name; }),
      achievements: p.achievements || [],
      units: units,
      buildings: buildings,
      hasBuildings: buildings.length > 0
    };
  }

  function looksLikePlayer(o) {
    return !!o && typeof o === "object" &&
      (o.townHallLevel !== undefined || o.troops !== undefined || o.heroes !== undefined);
  }

  /* Vrací { villages: [...], warnings: [...] } nebo vyhodí Error s čitelnou hláškou. */
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
    var list = [];

    if (Object.prototype.toString.call(data) === "[object Array]") {
      list = data;
    } else if (data && Object.prototype.toString.call(data.items) === "[object Array]") {
      list = data.items;
    } else if (data && Object.prototype.toString.call(data.players) === "[object Array]") {
      list = data.players;
    } else {
      list = [data];
    }

    var villages = [];
    for (var i = 0; i < list.length; i++) {
      if (!looksLikePlayer(list[i])) {
        warnings.push("Položka #" + (i + 1) + " nevypadá jako JSON hráče (chybí townHallLevel / troops / heroes) – přeskočeno.");
        continue;
      }
      var v = normalizePlayer(list[i]);
      if (v.th === 0) warnings.push("Hráč „" + v.name + "“ nemá townHallLevel – analýza bude nepřesná.");
      if (!v.units.length) warnings.push("Hráč „" + v.name + "“ nemá žádná vojska ani hrdiny.");
      villages.push(v);
    }

    if (!villages.length) {
      throw new Error("V datech nebyl nalezen žádný hráč. Očekává se JSON z endpointu /players/{tag} " +
        "nebo pole takových objektů.");
    }
    return { villages: villages, warnings: warnings };
  }

  COC.parse = {
    parseInput: parseInput,
    fromObject: fromObject,
    normalizePlayer: normalizePlayer,
    isDefenseName: isDefenseName
  };
})(window);
