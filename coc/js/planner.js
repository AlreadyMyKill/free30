/* =========================================================================
 * planner.js — sestavení plánu postupu podle zvolené strategie
 *
 * Skóre jedné položky:
 *   score = váha kategorie
 *         * (0,5 + 0,5 * role jednotky ve zvolené strategii)
 *         * podíl chybějících úrovní
 *         * bonus za "dluh z minulého TH"
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};

  function round1(n) { return Math.round(n * 10) / 10; }

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
    // (síla bonusu se řídí tím, jak moc je ten hrdina pro daný styl hraní důležitý)
    if (u.category === "hero" && u.level === 0 && u.cap > 0) score *= 1.6 + 1.2 * role;
    // vybavení hrdinů se platí rudou, ne stavitelem – levné body síly navíc
    if (u.category === "equipment" && u.equipped) score *= 1.25;

    return score;
  }

  function reasonFor(u, strategy) {
    if (u.category === "hero" && u.level === 0) return "Hrdina není vůbec rozjetý — největší jednotlivá ztráta síly.";
    if (u.isBehind) return "Dluh z TH" + Math.max(1, u.thRef - 1) + ": chybí " + u.foundationRemaining + " úr. k tomu, co už dávno mohlo být hotové.";
    if (u.category === "hero") return "Hrdinové jsou u strategie „" + strategy.name + "“ nejvyšší priorita.";
    if (u.role[strategy.roleKey] >= 0.85) return "Nosná jednotka pro tenhle styl hraní.";
    if (u.remaining === 0) return "Hotovo na strop aktuálního TH.";
    return "Zbývá " + u.remaining + " úr. do stropu TH" + u.thRef + ".";
  }

  function buildItems(analysis, strategy) {
    var items = [];
    for (var i = 0; i < analysis.units.length; i++) {
      var u = analysis.units[i];
      if (u.remaining <= 0) continue;
      var copy = {
        name: u.name,
        category: u.category,
        level: u.level,
        cap: u.cap,
        remaining: u.remaining,
        foundationRemaining: u.foundationRemaining,
        isBehind: u.isBehind,
        confident: u.confident,
        capSource: u.capSource,
        pct: u.pct,
        role: u.role,
        equipped: u.equipped,
        thRef: analysis.th
      };
      copy.score = scoreItem(u, strategy);
      copy.reason = reasonFor(copy, strategy);
      items.push(copy);
    }
    items.sort(function (a, b) { return b.score - a.score; });
    return items;
  }

  function buildPhases(items, strategy) {
    var phase1 = [], phase2 = [], phase3 = [];

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.isBehind) phase1.push(it);
      else if (it.score >= 0.18 || it.category === "hero") phase2.push(it);
      else phase3.push(it);
    }

    var phases = [];
    if (phase1.length) {
      phases.push({
        id: "catchup",
        title: "Fáze 1 — dohnat základ",
        subtitle: "Věci, které už měly být hotové na předchozím Town Hallu. Jsou levné, rychlé a dávají nejvíc síly za surovinu.",
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
    if (analysis.buildings && analysis.buildings.pct !== null) {
      checks.push({
        label: "Obrana a zdi",
        value: analysis.buildings.pct,
        target: Math.round(t.foundationPct * (strategy.categoryWeights.defense || 0.5)),
        ok: analysis.buildings.pct >= t.foundationPct * (strategy.categoryWeights.defense || 0.5)
      });
    }

    var failed = checks.filter(function (c) { return !c.ok; });
    return {
      checks: checks,
      ready: failed.length === 0,
      failed: failed
    };
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
      out.push({ level: "info", text: "Zbývá celkem " + analysis.totalRemaining + " úrovní vojsk a hrdinů do plného stropu TH" + th + "." });
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
      out.push({ level: "info", text: "Skladiště a sběrače oficiální API neposílá; pokud si je doplníš do JSONu (viz README), zohledním je i tady." });
    }

    if (strategy.id === "push" || strategy.id === "defense") {
      if (!analysis.village.hasBuildings) {
        out.push({ level: "warn", text: "Bez dat o budovách umím u téhle strategie hodnotit jen útočnou půlku. Doplň pole \"buildings\" do JSONu pro plný obrázek." });
      }
    }

    if (analysis.behind.length) {
      var top = analysis.behind.slice(0, 3).map(function (u) { return u.name + " (+" + u.foundationRemaining + ")"; });
      out.push({ level: "warn", text: "Největší dluhy z minulého TH: " + top.join(", ") + "." });
    }

    return out;
  }

  function labQueue(items) {
    return items.filter(function (i) {
      return i.category === "elixirTroop" || i.category === "darkTroop" ||
             i.category === "spell" || i.category === "darkSpell" || i.category === "siege";
    }).slice(0, 10);
  }

  function heroQueue(items) {
    return items.filter(function (i) { return i.category === "hero"; });
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
      labQueue: labQueue(items),
      heroQueue: heroQueue(items),
      effort: effort,
      totalLevels: items.reduce(function (s, i) { return s + i.remaining; }, 0),
      topNext: items.slice(0, 6)
    };
  }

  COC.planner = { build: build, round1: round1 };
})(window);
