/* =========================================================================
 * analyze.js — rozbor vesnice
 *
 * Klíčová myšlenka analýzy rushe:
 *   Nerushnutá vesnice na TH N má hotové (aspoň) všechno, co šlo udělat
 *   na TH N-1. Proto se všechno počítá dvakrát:
 *     - "current"    = postup vůči stropu aktuálního TH
 *     - "foundation" = postup vůči stropu předchozího TH  -> míra rushe
 *
 * Budovy se počítají po typech: úroveň = součet úrovní všech kusů, strop =
 * strop jednoho kusu krát počet, který na daném TH můžeš mít. Nepostavená
 * budova tak přirozeně vyjde jako chybějící úrovně.
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};
  var D = global.COC_DATA;

  /* Váhy kategorií při výpočtu celkového skóre rushe. */
  var RUSH_WEIGHTS = {
    hero: 3.0,
    // Vybavení hrdinů se platí rudou z hvězdného bonusu, ne surovinami vesnice,
    // a nedá se "zameškat" jako budova — do míry rushe se proto nepočítá.
    pet: 0.8,
    elixirTroop: 1.2,
    darkTroop: 1.2,
    spell: 1.0,
    darkSpell: 0.8,
    siege: 0.5,
    defense: 2.0,
    trap: 0.5,
    wall: 0.8,
    resource: 0.6,
    army: 0.9,
    other: 0.2,
    helper: 0.2,
    townhall: 0
    // Builder Base se do rushe hlavní vesnice nepočítá vůbec.
  };

  var LAB_CATEGORIES = ["elixirTroop", "darkTroop", "spell", "darkSpell", "siege"];
  var DEFENCE_CATEGORIES = ["defense", "trap", "wall"];

  function pct(a, b) { return b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0; }
  function inList(list, x) { return list.indexOf(x) !== -1; }

  function hallFor(village, category) {
    return D.isBuilderCategory(category) ? (village.bh || 0) : (village.th || 1);
  }

  function expectedCount(unit, hall) {
    var fromCatalog = unit.dataId ? COC.catalog.countAtHall(unit.dataId, hall) : 1;
    if (!fromCatalog) fromCatalog = 0;
    return Math.max(fromCatalog, unit.count || 1);
  }

  function analyzeUnits(village) {
    var out = [];
    var locked = [];

    for (var i = 0; i < village.units.length; i++) {
      var u = village.units[i];
      if (u.isSuper) continue;            // super troops kopírují základní jednotku
      if (u.category === "townhall") continue;

      var hall = hallFor(village, u.category);
      var prevHall = Math.max(1, hall - 1);

      var cur = COC.caps.capFor(u, hall);
      var prev = COC.caps.capFor(u, prevHall);

      // Na tomhle hallu ještě není dostupné a hráč to nemá -> do postupu nepatří.
      if (!cur.cap && !u.level) {
        locked.push({
          name: u.name, category: u.category,
          unlockTH: u.dataId ? COC.catalog.unlockHall(u.dataId) : D.unlockTH(u.name, u.category)
        });
        continue;
      }

      var count = expectedCount(u, hall);
      var prevCount = u.dataId ? Math.min(count, COC.catalog.countAtHall(u.dataId, prevHall) || count) : count;

      var capPerUnit = Math.max(cur.cap, 0);
      var capSum = Math.max(capPerUnit * count, u.level);
      var foundationCapSum = Math.min(Math.max(prev.cap, 0) * prevCount, capSum);
      // Vybavení nejde "zameškat" — vypadne z hlášení dluhů.
      if (u.category === "equipment") foundationCapSum = Math.min(u.level, capSum);

      out.push({
        name: u.name,
        dataId: u.dataId,
        category: u.category,
        village: u.village,
        level: u.level,
        count: u.count || 1,
        expectedCount: count,
        missingCount: Math.max(0, count - (u.count || 1)),
        instances: u.instances,
        upgrading: u.upgrading || 0,
        capPerUnit: capPerUnit,
        cap: capSum,
        capSource: cur.source,
        confident: cur.confident,
        foundationCap: foundationCapSum,
        remaining: Math.max(0, capSum - u.level),
        foundationRemaining: Math.max(0, foundationCapSum - u.level),
        isBehind: u.level < foundationCapSum,
        pct: pct(u.level, capSum),
        foundationPct: pct(Math.min(u.level, foundationCapSum), foundationCapSum),
        role: D.roleOf(u.name),
        equipped: u.equipped,
        hall: hall
      });
    }

    out.sort(function (a, b) { return a.pct - b.pct; });
    locked.sort(function (a, b) { return (a.unlockTH || 0) - (b.unlockTH || 0); });
    return { units: out, locked: locked };
  }

  function groupByCategory(units) {
    var by = {};
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      var g = by[u.category] || (by[u.category] = {
        id: u.category,
        label: (D.categories[u.category] || {}).label || u.category,
        icon: (D.categories[u.category] || {}).icon || "•",
        items: [], level: 0, cap: 0, foundationLevel: 0, foundationCap: 0,
        remaining: 0, missingCount: 0, confidentCount: 0
      });
      g.items.push(u);
      g.level += u.level;
      g.cap += u.cap;
      g.foundationLevel += Math.min(u.level, u.foundationCap);
      g.foundationCap += u.foundationCap;
      g.remaining += u.remaining;
      g.missingCount += u.missingCount;
      if (u.confident) g.confidentCount++;
    }
    for (var key in by) {
      if (!Object.prototype.hasOwnProperty.call(by, key)) continue;
      var c = by[key];
      c.pct = pct(c.level, c.cap);
      c.foundationPct = pct(c.foundationLevel, c.foundationCap);
      c.confidence = c.items.length ? c.confidentCount / c.items.length : 0;
    }
    return by;
  }

  /* Souhrn přes kategorie. Procenta se počítají jako vážený průměr procent
     jednotlivých kategorií, ne jako podíl součtů — jinak by zdi (tisíce úrovní)
     přebily hrdiny i obranu dohromady. */
  function sumOver(units, categories, byCategory) {
    var level = 0, cap = 0, remaining = 0;
    var num = 0, den = 0;

    for (var i = 0; i < units.length; i++) {
      if (!inList(categories, units[i].category)) continue;
      level += units[i].level;
      cap += units[i].cap;
      remaining += units[i].remaining;
    }
    for (var c = 0; c < categories.length; c++) {
      var group = byCategory[categories[c]];
      if (!group || !group.cap) continue;
      var w = RUSH_WEIGHTS[categories[c]];
      if (w === undefined) w = 0.5;
      if (!w) continue;
      num += group.pct * w;
      den += w;
    }
    return {
      level: level, cap: cap, remaining: remaining,
      pct: den ? num / den : pct(level, cap)
    };
  }

  /* Vážený postup přes všechny kategorie hlavní vesnice. */
  function weightedProgress(byCategory) {
    var num = 0, den = 0;
    for (var key in byCategory) {
      if (!Object.prototype.hasOwnProperty.call(byCategory, key)) continue;
      var w = RUSH_WEIGHTS[key];
      if (w === undefined) w = 0.5;
      if (!w) continue;
      var c = byCategory[key];
      if (!c.cap) continue;
      num += c.pct * w;
      den += w;
    }
    return den ? num / den : 0;
  }

  function verdictFor(foundationPct) {
    if (foundationPct === null) return { key: "unknown", label: "Nelze určit", color: "info", text: "V datech není dost položek na to, aby šla míra rushe spočítat." };
    if (foundationPct >= 97) return { key: "clean",   label: "Čistá vesnice",     color: "good",  text: "Nic z předchozího Town Hallu nechybí. Klasický „max“ postup." };
    if (foundationPct >= 88) return { key: "light",   label: "Lehce rushnutá",    color: "okay",  text: "Pár drobností z minulého TH chybí, ale nic dramatického." };
    if (foundationPct >= 70) return { key: "rushed",  label: "Rushnutá",          color: "warn",  text: "Znatelný dluh z předchozího Town Hallu – vyplatí se ho dohnat." };
    if (foundationPct >= 45) return { key: "heavy",   label: "Silně rushnutá",    color: "bad",   text: "Velká část předchozího TH je nedodělaná. Útok i obrana za to platí." };
    return                          { key: "extreme", label: "Extrémně rushnutá", color: "bad",   text: "Vesnice je daleko před svým vývojem. Bez dohánění to nepůjde." };
  }

  function weightedFoundation(byCategory) {
    var num = 0, den = 0;
    for (var key in byCategory) {
      if (!Object.prototype.hasOwnProperty.call(byCategory, key)) continue;
      var w = RUSH_WEIGHTS[key];
      if (!w) continue;
      var c = byCategory[key];
      if (!c.foundationCap) continue;
      num += c.foundationPct * w;
      den += w;
    }
    return den ? num / den : null;
  }

  function heroSummary(units) {
    var heroes = units.filter(function (u) { return u.category === "hero"; });
    var lvl = 0, cap = 0;
    for (var i = 0; i < heroes.length; i++) { lvl += heroes[i].level; cap += heroes[i].cap; }
    return {
      items: heroes,
      totalLevel: lvl,
      totalCap: cap,
      pct: pct(lvl, cap),
      missing: Math.max(0, cap - lvl),
      unlockedButLocked: heroes.filter(function (h) { return h.level === 0; }).map(function (h) { return h.name; })
    };
  }

  function warReadiness(units) {
    var heroes = heroSummary(units);
    var warCore = units.filter(function (u) {
      return inList(["elixirTroop", "darkTroop", "spell", "darkSpell"], u.category) && u.role.war >= 0.8;
    });
    var wl = 0, wc = 0;
    for (var i = 0; i < warCore.length; i++) { wl += warCore[i].level; wc += warCore[i].cap; }
    var corePct = pct(wl, wc);

    var sieges = units.filter(function (u) { return u.category === "siege" && u.level > 0; });
    var score = heroes.pct * 0.55 + corePct * 0.35 + Math.min(100, sieges.length * 25) * 0.10;

    return {
      heroPct: heroes.pct,
      corePct: corePct,
      coreUnits: warCore.sort(function (a, b) { return a.pct - b.pct; }),
      siegeCount: sieges.length,
      score: score,
      label: score >= 85 ? "Připraven na CWL" :
             score >= 70 ? "Solidní válečník" :
             score >= 50 ? "Použitelný, ale slabší" : "Do války zatím spíš ne"
    };
  }

  function makeFlags(a) {
    var flags = [];
    var heroes = a.heroes;

    if (heroes.unlockedButLocked.length) {
      flags.push({ level: "bad", text: "Nezačatí hrdinové: " + heroes.unlockedButLocked.join(", ") +
        " — hrdinové jsou nejsilnější věc ve hře, tohle je největší ztráta." });
    }
    if (heroes.totalCap && heroes.pct < 50 && a.th >= 9) {
      flags.push({ level: "bad", text: "Hrdinové jsou na " + Math.round(heroes.pct) + " % stropu TH" + a.th + ". Bez nich neuděláš tři hvězdy." });
    }
    if (a.labPct < 45 && a.th >= 10) {
      flags.push({ level: "warn", text: "Laboratoř je hluboko pod stropem TH" + a.th + " (" + Math.round(a.labPct) + " %). Vojska nejsou konkurenceschopná." });
    }
    if (a.byCategory.siege && a.byCategory.siege.items.every(function (s) { return s.level === 0; }) && a.th >= 12) {
      flags.push({ level: "warn", text: "Nemáš rozjetý žádný obléhací stroj – v CWL je to zásadní handicap." });
    }
    if (a.byCategory.pet && a.byCategory.pet.pct < 25 && a.th >= 14) {
      flags.push({ level: "warn", text: "Mazlíčci jsou skoro na nule; Pet House je jeden z největších skoků v síle hrdinů." });
    }

    var missing = [];
    for (var key in a.byCategory) {
      if (!Object.prototype.hasOwnProperty.call(a.byCategory, key)) continue;
      if (D.isBuilderCategory(key)) continue;
      var c = a.byCategory[key];
      for (var i = 0; i < c.items.length; i++) {
        if (c.items[i].missingCount > 0) missing.push(c.items[i].name + " ×" + c.items[i].missingCount);
      }
    }
    if (missing.length) {
      flags.push({ level: "warn", text: "Nepostavené budovy, na které už máš nárok: " + missing.slice(0, 8).join(", ") +
        (missing.length > 8 ? " a další" : "") + "." });
    }

    if (!a.hasDefenceData) {
      flags.push({ level: "info", text: "Data neobsahují budovy (oficiální API je neposílá). Obrana a zdi se proto nehodnotí." });
    }
    if (a.rush.verdict.key === "clean" && a.thProgressPct > 92) {
      flags.push({ level: "good", text: "Vesnice je prakticky vymaxovaná pro TH" + a.th + " — je čas jít na TH" + (a.th + 1) + "." });
    }
    return flags;
  }

  function analyze(village) {
    var th = village.th || 1;
    var scan = analyzeUnits(village);
    var units = scan.units;

    var home = units.filter(function (u) { return !D.isBuilderCategory(u.category); });
    var builder = units.filter(function (u) { return D.isBuilderCategory(u.category); });

    var byCategory = groupByCategory(home);
    var builderByCategory = groupByCategory(builder);

    var totalLevel = 0, totalCap = 0;
    for (var i = 0; i < home.length; i++) { totalLevel += home[i].level; totalCap += home[i].cap; }

    var lab = sumOver(home, LAB_CATEGORIES, byCategory);
    var def = sumOver(home, DEFENCE_CATEGORIES, byCategory);
    var bbLevel = 0, bbCap = 0;
    for (var b = 0; b < builder.length; b++) { bbLevel += builder[b].level; bbCap += builder[b].cap; }

    var foundationPct = weightedFoundation(byCategory);

    var a = {
      village: village,
      th: th,
      bh: village.bh || 0,
      units: home,
      allUnits: units,
      builderUnits: builder,
      locked: scan.locked,
      byCategory: byCategory,
      builderByCategory: builderByCategory,
      heroes: heroSummary(home),
      labPct: lab.pct,
      labRemaining: lab.remaining,
      defence: def,
      hasDefenceData: def.cap > 0,
      builder: { level: bbLevel, cap: bbCap, pct: pct(bbLevel, bbCap), items: builder },
      thProgressPct: weightedProgress(byCategory),
      totalRemaining: Math.max(0, totalCap - totalLevel),
      behind: home.filter(function (u) { return u.isBehind; })
                  .sort(function (x, y) { return y.foundationRemaining - x.foundationRemaining; }),
      rush: {
        foundationPct: foundationPct,
        known: foundationPct !== null,
        verdict: verdictFor(foundationPct)
      },
      war: warReadiness(home)
    };

    a.flags = makeFlags(a);
    return a;
  }

  COC.analyze = {
    analyze: analyze,
    pct: pct,
    RUSH_WEIGHTS: RUSH_WEIGHTS,
    LAB_CATEGORIES: LAB_CATEGORIES,
    DEFENCE_CATEGORIES: DEFENCE_CATEGORIES
  };
})(window);
