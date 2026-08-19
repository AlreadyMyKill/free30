/* =========================================================================
 * analyze.js — rozbor vesnice
 *
 * Klíčová myšlenka analýzy rushe:
 *   Nerushnutá vesnice na TH N má hotové (aspoň) všechno, co šlo udělat
 *   na TH N-1. Proto se všechno počítá dvakrát:
 *     - "current"    = postup vůči stropu aktuálního TH
 *     - "foundation" = postup vůči stropu předchozího TH  -> míra rushe
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};
  var D = global.COC_DATA;

  /* Váhy kategorií při výpočtu celkového skóre rushe. */
  var RUSH_WEIGHTS = {
    hero: 3.0,
    elixirTroop: 1.2,
    darkTroop: 1.2,
    spell: 1.0,
    darkSpell: 0.8,
    siege: 0.5,
    pet: 0.8,
    equipment: 0.6,
    defense: 2.0,
    wall: 0.8,
    builder: 0.0
  };

  function pct(a, b) { return b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0; }

  function analyzeUnits(village) {
    var th = village.th || 1;
    var prevTH = Math.max(1, th - 1);
    var out = [];
    var locked = [];

    for (var i = 0; i < village.units.length; i++) {
      var u = village.units[i];
      if (u.isSuper) continue;               // super troops kopírují základní jednotku
      if (u.category === "builder") continue; // Builder Base řešíme zvlášť

      var unlock = D.unlockTH(u.name, u.category);
      if (unlock && th < unlock && !u.level) {
        // na tomhle TH ještě není k dispozici — do postupu se nepočítá
        locked.push({ name: u.name, category: u.category, unlockTH: unlock });
        continue;
      }

      var cur = COC.caps.capFor(u, th);
      var found = COC.caps.capFor(u, prevTH);
      var cap = Math.max(cur.cap, u.level);
      var fCap = Math.min(Math.max(found.cap, 0), cap);
      if (unlock && prevTH < unlock) fCap = 0;   // na minulém TH neexistovala -> žádný dluh

      out.push({
        name: u.name,
        category: u.category,
        level: u.level,
        maxLevel: u.maxLevel,
        cap: cap,
        capSource: cur.source,
        confident: cur.confident,
        foundationCap: fCap,
        remaining: Math.max(0, cap - u.level),
        foundationRemaining: Math.max(0, fCap - u.level),
        isBehind: u.level < fCap,
        pct: pct(u.level, cap),
        foundationPct: pct(Math.min(u.level, fCap), fCap),
        globalPct: pct(u.level, u.maxLevel),
        role: D.roleOf(u.name),
        equipped: u.equipped
      });
    }

    out.sort(function (a, b) { return a.pct - b.pct; });
    locked.sort(function (a, b) { return a.unlockTH - b.unlockTH; });
    return { units: out, locked: locked };
  }

  function analyzeBuilderBase(village) {
    var items = [];
    for (var i = 0; i < village.units.length; i++) {
      var u = village.units[i];
      if (u.category !== "builder") continue;
      items.push({
        name: u.name, level: u.level, maxLevel: u.maxLevel,
        pct: pct(u.level, u.maxLevel), category: "builder"
      });
    }
    var lvl = 0, max = 0;
    for (var j = 0; j < items.length; j++) { lvl += items[j].level; max += items[j].maxLevel; }
    return { items: items, level: lvl, cap: max, pct: pct(lvl, max) };
  }

  function analyzeBuildings(village) {
    if (!village.hasBuildings) return null;
    var groups = {};
    var lvl = 0, max = 0, known = 0;
    for (var i = 0; i < village.buildings.length; i++) {
      var b = village.buildings[i];
      var g = groups[b.name] || (groups[b.name] = { name: b.name, count: 0, levelSum: 0, maxLevel: b.maxLevel || 0, category: b.category });
      g.count += b.count;
      g.levelSum += b.level * b.count;
      if (b.maxLevel > g.maxLevel) g.maxLevel = b.maxLevel;
      if (b.maxLevel) { lvl += b.level * b.count; max += b.maxLevel * b.count; known++; }
    }
    var list = [];
    for (var k in groups) {
      if (!Object.prototype.hasOwnProperty.call(groups, k)) continue;
      var gg = groups[k];
      gg.avgLevel = gg.count ? gg.levelSum / gg.count : 0;
      gg.pct = gg.maxLevel ? pct(gg.avgLevel, gg.maxLevel) : null;
      list.push(gg);
    }
    list.sort(function (a, b) { return (a.pct === null ? 999 : a.pct) - (b.pct === null ? 999 : b.pct); });
    return { groups: list, pct: max ? pct(lvl, max) : null, hasMaxLevels: known > 0 };
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
        remaining: 0, confidentCount: 0
      });
      g.items.push(u);
      g.level += u.level;
      g.cap += u.cap;
      g.foundationLevel += Math.min(u.level, u.foundationCap);
      g.foundationCap += u.foundationCap;
      g.remaining += u.remaining;
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

  function verdictFor(foundationPct) {
    if (foundationPct === null) return { key: "unknown", label: "Nelze určit", color: "info", text: "V datech není dost jednotek na to, aby šla míra rushe spočítat." };
    if (foundationPct >= 97) return { key: "clean",   label: "Čistá vesnice",     color: "good",  text: "Nic z předchozího Town Hallu nechybí. Klasický „max“ postup." };
    if (foundationPct >= 88) return { key: "light",   label: "Lehce rushnutá",    color: "okay",  text: "Pár drobností z minulého TH chybí, ale nic dramatického." };
    if (foundationPct >= 70) return { key: "rushed",  label: "Rushnutá",          color: "warn",  text: "Znatelný dluh z předchozího Town Hallu – vyplatí se ho dohnat." };
    if (foundationPct >= 45) return { key: "heavy",   label: "Silně rushnutá",    color: "bad",   text: "Velká část předchozího TH je nedodělaná. Útok i obrana za to platí." };
    return                          { key: "extreme", label: "Extrémně rushnutá", color: "bad",   text: "Vesnice je daleko před svým vývojem. Bez dohánění to nepůjde." };
  }

  function weightedFoundation(byCategory, buildings) {
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
    if (buildings && buildings.pct !== null) {
      num += buildings.pct * RUSH_WEIGHTS.defense;
      den += RUSH_WEIGHTS.defense;
    }
    return den ? num / den : null;
  }

  function heroSummary(units, th) {
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

  function warReadiness(units, th) {
    var heroes = heroSummary(units, th);
    var warCore = units.filter(function (u) {
      return (u.category === "elixirTroop" || u.category === "darkTroop" ||
              u.category === "spell" || u.category === "darkSpell") && u.role.war >= 0.8;
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
    if (heroes.pct < 50 && a.th >= 9) {
      flags.push({ level: "bad", text: "Hrdinové jsou na " + Math.round(heroes.pct) + " % stropu TH" + a.th + ". Bez nich neuděláš tři hvězdy." });
    }
    var lab = a.byCategory.elixirTroop || a.byCategory.darkTroop;
    if (lab && a.labPct < 45 && a.th >= 10) {
      flags.push({ level: "warn", text: "Laboratoř je hluboko pod stropem TH" + a.th + " (" + Math.round(a.labPct) + " %). Vojska nejsou konkurenceschopná." });
    }
    if (a.byCategory.siege && a.byCategory.siege.items.every(function (s) { return s.level === 0; }) && a.th >= 12) {
      flags.push({ level: "warn", text: "Nemáš rozjetý žádný obléhací stroj – v CWL je to zásadní handicap." });
    }
    if (a.byCategory.pet && a.byCategory.pet.pct < 25 && a.th >= 14) {
      flags.push({ level: "warn", text: "Mazlíčci jsou skoro na nule; Pet House je jeden z největších skoků v síle hrdinů." });
    }
    if (!a.village.hasBuildings) {
      flags.push({ level: "info", text: "JSON neobsahuje budovy (oficiální API je neposílá). Obrana a zdi se proto nehodnotí — můžeš je doplnit ručně, viz README." });
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
    var byCategory = groupByCategory(units);
    var buildings = analyzeBuildings(village);
    var builder = analyzeBuilderBase(village);

    var totalLevel = 0, totalCap = 0;
    for (var i = 0; i < units.length; i++) { totalLevel += units[i].level; totalCap += units[i].cap; }

    var labUnits = units.filter(function (u) {
      return u.category === "elixirTroop" || u.category === "darkTroop" ||
             u.category === "spell" || u.category === "darkSpell" || u.category === "siege";
    });
    var labLvl = 0, labCap = 0;
    for (var j = 0; j < labUnits.length; j++) { labLvl += labUnits[j].level; labCap += labUnits[j].cap; }

    var foundationPct = weightedFoundation(byCategory, buildings);

    var a = {
      village: village,
      th: th,
      units: units,
      locked: scan.locked,
      byCategory: byCategory,
      buildings: buildings,
      builder: builder,
      heroes: heroSummary(units, th),
      labUnits: labUnits,
      labPct: pct(labLvl, labCap),
      labRemaining: Math.max(0, labCap - labLvl),
      thProgressPct: pct(totalLevel, totalCap),
      totalRemaining: Math.max(0, totalCap - totalLevel),
      behind: units.filter(function (u) { return u.isBehind; })
                   .sort(function (x, y) { return y.foundationRemaining - x.foundationRemaining; }),
      rush: {
        foundationPct: foundationPct,
        known: foundationPct !== null,
        verdict: verdictFor(foundationPct)
      },
      war: warReadiness(units, th)
    };

    a.flags = makeFlags(a);
    return a;
  }

  COC.analyze = { analyze: analyze, pct: pct, RUSH_WEIGHTS: RUSH_WEIGHTS };
})(window);
