/* =========================================================================
 * planner.js — sestavení plánu postupu podle zvolené strategie
 *
 * Skóre jedné položky:
 *   score = váha kategorie
 *         * (0,5 + 0,5 * role jednotky ve zvolené strategii)
 *         * podíl chybějících úrovní
 *         * bonus za "dluh z minulého TH"
 *
 * Ceny a časy pocházejí z herních dat, takže nejde o odhady — u budov
 * se počítá každý kus zvlášť a nepostavené budovy včetně ceny stavby.
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};

  /* Kategorie, které staví stavitel (vs. laboratoř / kovárna). */
  var BUILDER_WORK = ["defense", "trap", "wall", "resource", "army", "other", "helper"];
  var LAB_WORK = ["elixirTroop", "darkTroop", "spell", "darkSpell", "siege"];

  function workshopOf(category) {
    if (BUILDER_WORK.indexOf(category) !== -1) return "builder";
    if (LAB_WORK.indexOf(category) !== -1) return "lab";
    if (category === "hero") return "hero";
    if (category === "equipment") return "forge";
    if (category === "pet") return "pet";
    return "other";
  }

  /* Skutečná cena a čas dodělání položky do stropu aktuálního TH. */
  function costOf(u) {
    if (!u.dataId || !COC.catalog.available) return null;

    var byResource = {};
    var seconds = 0;
    var known = false;

    function add(fromLevel, times) {
      var c = COC.catalog.costBetween(u.dataId, fromLevel, u.capPerUnit);
      for (var r in c.byResource) {
        if (!Object.prototype.hasOwnProperty.call(c.byResource, r)) continue;
        byResource[r] = (byResource[r] || 0) + c.byResource[r] * times;
        known = true;
      }
      seconds += c.seconds * times;
    }

    var instances = u.instances && u.instances.length ? u.instances : [[u.level, 1]];
    for (var i = 0; i < instances.length; i++) {
      var lvl = instances[i][0];
      var cnt = instances[i][1] || 1;
      if (lvl < u.capPerUnit) add(lvl, cnt);
    }
    if (u.missingCount > 0) add(0, u.missingCount);   // ještě nepostavené kusy

    if (!known && !seconds) return null;
    return { byResource: byResource, seconds: seconds, workshop: workshopOf(u.category) };
  }

  function scoreItem(u, strategy) {
    var catW = strategy.categoryWeights[u.category];
    if (catW === undefined) catW = 0.5;

    var role = u.role[strategy.roleKey];
    if (typeof role !== "number") role = 0.5;

    var deficit = u.cap > 0 ? u.remaining / u.cap : 0;
    var foundationShare = u.remaining > 0 ? u.foundationRemaining / u.remaining : 0;
    var catchUp = 1 + strategy.foundationBonus * foundationShare;

    var score = catW * (0.5 + 0.5 * role) * deficit * catchUp;

    // hrdina, který ještě nikdy nebyl odemčený/upgradovaný, je absolutní priorita
    if (u.category === "hero" && u.level === 0 && u.cap > 0) score *= 1.6 + 1.2 * role;
    // vybavení hrdinů se platí rudou, ne stavitelem – levné body síly navíc
    if (u.category === "equipment") {
      if (u.equipped) score *= 1.25;
      // Kusů vybavení jsou desítky a rudy je málo; ty, do kterých hráč zatím
      // nic nedal, nemají zabírat první místa v plánu.
      else if (u.level <= 1) score *= 0.3;
    }
    // úplně nepostavená budova je levnější bod síly než dotažení té poslední
    if (u.missingCount > 0) score *= 1.3;

    return score;
  }

  function reasonFor(u, strategy) {
    if (u.category === "hero" && u.level === 0) return "Hrdina není vůbec rozjetý — největší jednotlivá ztráta síly.";
    if (u.missingCount > 0) return "Nepostaveno " + u.missingCount + " z " + u.expectedCount + " kusů, na které máš na TH" + u.hall + " nárok.";
    if (u.isBehind) return "Dluh z TH" + Math.max(1, u.hall - 1) + ": chybí " + u.foundationRemaining + " úr. k tomu, co už dávno mohlo být hotové.";
    if (u.category === "hero") return "Hrdinové jsou u strategie „" + strategy.name + "“ nejvyšší priorita.";
    if (u.role[strategy.roleKey] >= 0.85) return "Nosná jednotka pro tenhle styl hraní.";
    if (u.expectedCount > 1) return "Zbývá " + u.remaining + " úr. napříč " + u.expectedCount + " kusy do stropu TH" + u.hall + ".";
    return "Zbývá " + u.remaining + " úr. do stropu TH" + u.hall + ".";
  }

  function buildItems(analysis, strategy) {
    var items = [];
    for (var i = 0; i < analysis.units.length; i++) {
      var u = analysis.units[i];
      if (u.remaining <= 0) continue;
      var copy = {
        name: u.name,
        dataId: u.dataId,
        category: u.category,
        level: u.level,
        cap: u.cap,
        capPerUnit: u.capPerUnit,
        count: u.count,
        expectedCount: u.expectedCount,
        missingCount: u.missingCount,
        instances: u.instances,
        upgrading: u.upgrading,
        remaining: u.remaining,
        foundationRemaining: u.foundationRemaining,
        isBehind: u.isBehind,
        confident: u.confident,
        capSource: u.capSource,
        pct: u.pct,
        role: u.role,
        equipped: u.equipped,
        hall: u.hall
      };
      copy.score = scoreItem(u, strategy);
      copy.reason = reasonFor(copy, strategy);
      copy.cost = costOf(u);
      items.push(copy);
    }
    items.sort(function (a, b) { return b.score - a.score; });
    return items;
  }

  /* Sečte ceny a časy skupiny položek. */
  function totalCost(items) {
    var byResource = {};
    var byWorkshop = {};
    var seconds = 0;
    for (var i = 0; i < items.length; i++) {
      var c = items[i].cost;
      if (!c) continue;
      for (var r in c.byResource) {
        if (!Object.prototype.hasOwnProperty.call(c.byResource, r)) continue;
        byResource[r] = (byResource[r] || 0) + c.byResource[r];
      }
      byWorkshop[c.workshop] = (byWorkshop[c.workshop] || 0) + c.seconds;
      seconds += c.seconds;
    }
    return { byResource: byResource, byWorkshop: byWorkshop, seconds: seconds };
  }

  function buildPhases(items, strategy) {
    var phase1 = [], phase2 = [], phase3 = [];

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.isBehind || it.missingCount > 0) phase1.push(it);
      else if (it.score >= 0.18 || it.category === "hero") phase2.push(it);
      else phase3.push(it);
    }

    var phases = [];
    if (phase1.length) {
      phases.push({
        id: "catchup",
        title: "Fáze 1 — dohnat základ",
        subtitle: "Věci, které už měly být hotové na předchozím Town Hallu, plus budovy, které vůbec nestojí. " +
          "Jsou levné, rychlé a dávají nejvíc síly za surovinu.",
        items: phase1
      });
    }
    phases.push({
      id: "core",
      title: (phase1.length ? "Fáze 2" : "Fáze 1") + " — jádro pro tenhle styl hraní",
      subtitle: "To, co u strategie „" + strategy.name + "“ rozhoduje o výsledku.",
      items: phase2
    });
    phases.push({
      id: "rest",
      title: (phase1.length ? "Fáze 3" : "Fáze 2") + " — dodělávky",
      subtitle: "Zbytek do plného stropu aktuálního TH. Dělej průběžně, až když je hotové výše uvedené.",
      items: phase3
    });

    for (var p = 0; p < phases.length; p++) phases[p].cost = totalCost(phases[p].items);
    return phases;
  }

  function thUpChecks(analysis, strategy) {
    var checks = [];
    var t = strategy.thUp;

    checks.push({
      label: "Hrdinové vůči stropu TH" + analysis.th,
      value: analysis.heroes.pct,
      target: t.heroPct,
      ok: analysis.heroes.pct >= t.heroPct
    });
    checks.push({
      label: "Laboratoř (vojska, kouzla, stroje)",
      value: analysis.labPct,
      target: t.labPct,
      ok: analysis.labPct >= t.labPct
    });
    if (analysis.rush.known) {
      checks.push({
        label: "Základ z předchozího TH",
        value: analysis.rush.foundationPct,
        target: t.foundationPct,
        ok: analysis.rush.foundationPct >= t.foundationPct
      });
    }
    if (analysis.hasDefenceData) {
      var target = Math.round(t.foundationPct * (strategy.categoryWeights.defense || 0.5));
      checks.push({
        label: "Obrana, pasti a zdi",
        value: analysis.defence.pct,
        target: target,
        ok: analysis.defence.pct >= target
      });
    }

    var failed = checks.filter(function (c) { return !c.ok; });
    return { checks: checks, ready: failed.length === 0, failed: failed };
  }

  function advice(analysis, strategy) {
    var out = [];
    var th = analysis.th;

    if (strategy.id === "strategic-rush") {
      if (analysis.heroes.pct < 35) {
        out.push({ level: "bad", text: "Tohle už není strategický rush, ale obyčejný rush. Hrdinové na " +
          Math.round(analysis.heroes.pct) + " % znamenají, že novým TH si jen přidáš další dluh. Zastav TH a dohoň hrdiny." });
      } else {
        out.push({ level: "good", text: "Držíš hrdiny nad hladinou — v tom je celý rozdíl mezi strategickým rushem a rozbitou vesnicí." });
      }
      out.push({ level: "info", text: "Doporučené pořadí stavitelů: 1) Laboratoř a Clan Castle, 2) skladiště, 3) armádní tábory, 4) až pak obrana." });
    }

    if (strategy.id === "max") {
      out.push({ level: "info", text: "Zbývá celkem " + analysis.totalRemaining + " úrovní do plného stropu TH" + th + "." });
      if (analysis.rush.known && analysis.rush.foundationPct < 99) {
        out.push({ level: "warn", text: "Max postup nejde dělat se starým dluhem — nejdřív dojeď " + analysis.behind.length + " položek z předchozího TH." });
      }
    }

    if (strategy.id === "war") {
      out.push({ level: analysis.war.score >= 70 ? "good" : "warn",
        text: "Válečná připravenost: " + Math.round(analysis.war.score) + " / 100 — " + analysis.war.label + "." });
      if (analysis.war.siegeCount === 0 && th >= 12) {
        out.push({ level: "bad", text: "Nemáš žádný obléhací stroj. Postav Workshop a rozjeď Wall Wrecker nebo Log Launcher jako první věc." });
      }
      var equip = analysis.byCategory.equipment;
      if (equip && equip.pct < 40) {
        out.push({ level: "warn", text: "Vybavení hrdinů je na " + Math.round(equip.pct) + " %. Ruda se nedá použít na nic jiného — je to nejlevnější síla, kterou máš." });
      }
    }

    if (strategy.id === "farm") {
      var aq = analysis.units.filter(function (u) { return u.name === "Archer Queen"; })[0];
      if (aq && aq.pct < 60) {
        out.push({ level: "warn", text: "Archer Queen na " + Math.round(aq.pct) + " % — pro farmení je to nejdůležitější jednotka ve hře, dej ji nahoru." });
      }
      var res = analysis.byCategory.resource;
      if (res && res.pct < 70) {
        out.push({ level: "warn", text: "Skladiště a sběrače jsou na " + Math.round(res.pct) + " %. Bez kapacity přicházíš o kořist z každého útoku." });
      }
    }

    if ((strategy.id === "push" || strategy.id === "defense") && !analysis.hasDefenceData) {
      out.push({ level: "warn", text: "Bez dat o budovách umím u téhle strategie hodnotit jen útočnou půlku." });
    }

    if (analysis.behind.length) {
      var top = analysis.behind.slice(0, 3).map(function (u) { return u.name + " (+" + u.foundationRemaining + ")"; });
      out.push({ level: "warn", text: "Největší dluhy z minulého TH: " + top.join(", ") + "." });
    }

    return out;
  }

  function queue(items, categories, limit) {
    return items.filter(function (i) { return categories.indexOf(i.category) !== -1; }).slice(0, limit || 10);
  }

  function build(analysis, strategy) {
    var items = buildItems(analysis, strategy);
    var effort = {};
    for (var i = 0; i < items.length; i++) {
      effort[items[i].category] = (effort[items[i].category] || 0) + items[i].remaining;
    }

    return {
      strategy: strategy,
      items: items,
      phases: buildPhases(items, strategy),
      thUp: thUpChecks(analysis, strategy),
      advice: advice(analysis, strategy),
      labQueue: queue(items, COC.analyze.LAB_CATEGORIES, 10),
      heroQueue: queue(items, ["hero"], 10),
      builderQueue: queue(items, BUILDER_WORK, 10),
      cost: totalCost(items),
      effort: effort,
      totalLevels: items.reduce(function (s, i) { return s + i.remaining; }, 0),
      topNext: items.slice(0, 6)
    };
  }

  COC.planner = { build: build, costOf: costOf, totalCost: totalCost, workshopOf: workshopOf };
})(window);
