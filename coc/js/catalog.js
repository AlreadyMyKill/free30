/* =========================================================================
 * catalog.js — přístup k vygenerovaným herním datům (gamedata-generated.js)
 *
 * Formát jedné položky:
 *   { n: jméno, c: kategorie, v: "home"|"builder",
 *     L: [[požadovaný TH/BH, cena, index suroviny, sekundy], ...]  index = úroveň-1
 *     A: [[TH, počet kusů], ...] — jen tam, kde se počet mění }
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};
  var G = global.COC_GAMEDATA || { items: {}, resources: [], maxTH: 17, maxBH: 10 };

  var byName = {};
  for (var id in G.items) {
    if (!Object.prototype.hasOwnProperty.call(G.items, id)) continue;
    var it = G.items[id];
    // Jméno může být sdílené mezi vesnicemi (Cannon vs. builder base) —
    // klíčujeme proto jménem i vesnicí a zvlášť držíme "první vyhrává".
    var key = it.n.toLowerCase();
    if (!byName[key]) byName[key] = Number(id);
    byName[key + "|" + it.v] = Number(id);
  }

  function item(dataId) { return G.items[String(dataId)] || null; }

  function idByName(name, village) {
    if (!name) return null;
    var key = String(name).toLowerCase();
    if (village && byName[key + "|" + village]) return byName[key + "|" + village];
    return byName[key] || null;
  }

  function nameOf(dataId) {
    var it = item(dataId);
    return it ? it.n : null;
  }

  function maxLevelOf(dataId) {
    var it = item(dataId);
    return it ? it.L.length : 0;
  }

  /* Nejvyšší úroveň dosažitelná na daném Town Hallu (u builder base na BH). */
  function capAtHall(dataId, hall) {
    var it = item(dataId);
    if (!it) return null;
    var cap = 0;
    for (var i = 0; i < it.L.length; i++) {
      if (it.L[i][0] <= hall) cap = i + 1;
    }
    return cap;
  }

  /* Kolik kusů dané budovy lze na daném hallu mít (TH, u builder base BH).
     Pro jednotky vrací 1. */
  function countAtHall(dataId, hall) {
    var it = item(dataId);
    if (!it) return 1;
    if (!it.A) return 1;
    var count = 0;
    for (var i = 0; i < it.A.length; i++) {
      if (it.A[i][0] <= hall) count = it.A[i][1];
    }
    return count;
  }

  function hasCounts(dataId) {
    var it = item(dataId);
    return !!(it && it.A);
  }

  /* Cena a čas jedné konkrétní úrovně. */
  function levelCost(dataId, level) {
    var it = item(dataId);
    if (!it || level < 1 || level > it.L.length) return null;
    var row = it.L[level - 1];
    return { cost: row[1], resource: G.resources[row[2]] || "?", seconds: row[3], hall: row[0] };
  }

  /* Součet ceny a času za upgrade z `from` na `to` (obojí včetně cílové úrovně). */
  function costBetween(dataId, from, to) {
    var totals = {};
    var seconds = 0;
    for (var lvl = from + 1; lvl <= to; lvl++) {
      var c = levelCost(dataId, lvl);
      if (!c) continue;
      totals[c.resource] = (totals[c.resource] || 0) + c.cost;
      seconds += c.seconds;
    }
    return { byResource: totals, seconds: seconds };
  }

  function unlockHall(dataId) {
    var it = item(dataId);
    return it && it.L.length ? it.L[0][0] : null;
  }

  COC.catalog = {
    raw: G,
    available: Object.keys(G.items).length > 0,
    source: G.source || "—",
    maxTH: G.maxTH || 17,
    maxBH: G.maxBH || 10,
    item: item,
    idByName: idByName,
    nameOf: nameOf,
    maxLevelOf: maxLevelOf,
    capAtHall: capAtHall,
    countAtHall: countAtHall,
    hasCounts: hasCounts,
    levelCost: levelCost,
    costBetween: costBetween,
    unlockHall: unlockHall
  };
})(window);
