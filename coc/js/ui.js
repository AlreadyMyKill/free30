/* =========================================================================
 * ui.js — vykreslování
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};
  var D = global.COC_DATA;

  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function r(n) { return Math.round(Number(n) || 0); }
  function pctText(v) { return (v === null || v === undefined) ? "—" : r(v) + " %"; }
  function nf(n) { return (Number(n) || 0).toLocaleString("cs-CZ"); }

  /* 12 500 000 -> "12,5 M" */
  function short(n) {
    n = Number(n) || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(".", ",") + " mld";
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(".", ",") + " M";
    if (n >= 1e3) return Math.round(n / 1e3) + " k";
    return String(n);
  }

  /* 320000 s -> "3 d 16 h" */
  function duration(sec) {
    sec = Math.round(Number(sec) || 0);
    if (sec <= 0) return "—";
    var d = Math.floor(sec / 86400);
    var h = Math.floor((sec % 86400) / 3600);
    var m = Math.floor((sec % 3600) / 60);
    if (d >= 1) return d + " d" + (h ? " " + h + " h" : "");
    if (h >= 1) return h + " h" + (m ? " " + m + " min" : "");
    return m + " min";
  }

  var RES_SHORT = {
    "Gold": "zlato", "Elixir": "elixír", "Dark Elixir": "temný elixír",
    "Gold or Elixir": "zlato/elixír", "Ore": "ruda",
    "Shiny Ore": "lesklá ruda", "Glowy Ore": "zářivá ruda", "Starry Ore": "hvězdná ruda"
  };
  var WORKSHOP_LABEL = {
    builder: "stavitelé", lab: "laboratoř", hero: "hrdinové",
    forge: "kovárna", pet: "Pet House", other: "ostatní"
  };

  function costText(cost) {
    if (!cost) return "";
    var parts = [];
    for (var res in cost.byResource) {
      if (!Object.prototype.hasOwnProperty.call(cost.byResource, res)) continue;
      if (!cost.byResource[res]) continue;
      parts.push(short(cost.byResource[res]) + " " + (RES_SHORT[res] || res));
    }
    if (cost.seconds) parts.push("⏱ " + duration(cost.seconds));
    return parts.join(" · ");
  }

  function costSummary(cost) {
    if (!cost) return "";
    var h = '<div class="row small" style="gap:8px;margin-top:10px">';
    for (var res in cost.byResource) {
      if (!Object.prototype.hasOwnProperty.call(cost.byResource, res)) continue;
      if (!cost.byResource[res]) continue;
      h += '<span class="pill muted">' + esc(RES_SHORT[res] || res) + ' ' + short(cost.byResource[res]) + '</span>';
    }
    if (cost.byWorkshop) {
      for (var w in cost.byWorkshop) {
        if (!Object.prototype.hasOwnProperty.call(cost.byWorkshop, w)) continue;
        if (!cost.byWorkshop[w]) continue;
        h += '<span class="pill info">' + esc(WORKSHOP_LABEL[w] || w) + ' ' + duration(cost.byWorkshop[w]) + '</span>';
      }
    }
    h += '</div>';
    return h;
  }

  function colorFor(p) {
    if (p >= 90) return "good";
    if (p >= 70) return "okay";
    if (p >= 45) return "warn";
    return "bad";
  }

  function bar(p, cls) {
    var c = cls || colorFor(p);
    return '<div class="bar ' + c + '"><i style="width:' + Math.max(0, Math.min(100, p)) + '%"></i></div>';
  }

  function rowbar(label, value, pct, cls) {
    return '<div class="rowbar"><div class="lbl">' + esc(label) + '</div>' +
      '<div class="val">' + esc(value) + '</div>' + bar(pct, cls) + '</div>';
  }

  function stat(k, v, n) {
    return '<div class="stat"><div class="k">' + esc(k) + '</div><div class="v">' + v +
      '</div>' + (n ? '<div class="n">' + esc(n) + '</div>' : "") + '</div>';
  }

  function catIcon(id) { return (D.categories[id] || {}).icon || "•"; }
  function catLabel(id) { return (D.categories[id] || {}).label || id; }

  /* Popisek množství u položky: „7 ks“, „chybí 2 z 5“ */
  function countLabel(u) {
    if (u.expectedCount <= 1) return "";
    if (u.missingCount > 0) return u.count + " z " + u.expectedCount + " ks — chybí " + u.missingCount;
    return u.expectedCount + " ks";
  }

  /* ================= PŘEHLED ================= */

  function renderOverview(a) {
    var v = a.village;
    var h = "";

    h += '<div class="card">';
    h += '<div class="row" style="justify-content:space-between;align-items:flex-start">';
    h += '<div><h2 style="font-size:22px">' + esc(v.name) + ' <span class="tag">' + esc(v.tag) + '</span></h2>';
    h += '<div class="small muted">' +
      (v.clan ? "Klan " + esc(v.clan.name) + " (" + esc(v.clan.tag) + ")" : (v.format === "export" ? "Export z herního klienta" : "Bez klanu")) +
      (v.league ? " · " + esc(v.league) : "") +
      (v.role ? " · " + esc(v.role) : "") +
      (v.exportedAt ? " · pořízeno " + esc(v.exportedAt.toLocaleDateString("cs-CZ")) : "") + '</div>';
    if (v.labels && v.labels.length) {
      h += '<div style="margin-top:8px">' + v.labels.map(function (l) {
        return '<span class="pill muted" style="margin-right:6px">' + esc(l) + '</span>';
      }).join("") + '</div>';
    }
    h += '</div>';
    h += '<div class="right"><div class="stat" style="min-width:120px"><div class="k">Town Hall</div>' +
      '<div class="v" style="color:var(--gold-2)">' + a.th + '</div>' +
      (v.thWeapon ? '<div class="n">zbraň úr. ' + v.thWeapon + '</div>' : '') + '</div></div>';
    h += '</div></div>';

    h += '<div class="grid c4 section">';
    h += stat("Hrdinové", pctText(a.heroes.pct), a.heroes.totalLevel + " / " + a.heroes.totalCap + " úr.");
    h += stat("Laboratoř", pctText(a.labPct), "zbývá " + a.labRemaining + " úr.");
    h += stat("Základ (anti-rush)", pctText(a.rush.foundationPct), a.rush.verdict.label);
    if (a.hasDefenceData) {
      h += stat("Obrana a zdi", pctText(a.defence.pct), "zbývá " + a.defence.remaining + " úr.");
    } else {
      h += stat("Trofeje", nf(v.trophies), "nejlepší " + nf(v.bestTrophies));
    }
    h += stat("Postup na TH" + a.th, pctText(a.thProgressPct), "zbývá " + nf(a.totalRemaining) + " úr.");
    h += stat("Válka", r(a.war.score) + " / 100", a.war.label);
    if (v.format === "api") {
      h += stat("War stars", nf(v.warStars), "útoky " + nf(v.attackWins));
      h += stat("Donace", nf(v.donations), "přijato " + nf(v.donationsReceived));
    } else {
      h += stat("Builder Hall", a.bh ? String(a.bh) : "—", a.builder.cap ? pctText(a.builder.pct) + " hotovo" : "");
      h += stat("Staví se", String(countUpgrading(a)), "položek právě běží");
    }
    h += '</div>';

    if (a.flags.length) {
      h += '<div class="card section"><h2>Na co si dát pozor</h2><div class="sub">Automaticky nalezené slabiny a poznámky k datům.</div>';
      for (var i = 0; i < a.flags.length; i++) {
        h += '<div class="note ' + a.flags[i].level + '">' + esc(a.flags[i].text) + '</div>';
      }
      h += '</div>';
    }

    h += '<div class="grid c2 section">';

    h += '<div class="card"><h2>Postup po kategoriích</h2>' +
      '<div class="sub">Vůči stropu dostupnému na TH' + a.th + ', u budov včetně počtu kusů.</div>';
    for (var ci = 0; ci < D.categoryOrder.length; ci++) {
      var id = D.categoryOrder[ci];
      var c = a.byCategory[id];
      if (!c || !c.items.length) continue;
      h += rowbar(catIcon(id) + " " + c.label,
        nf(c.level) + " / " + nf(c.cap) + " (" + r(c.pct) + " %)", c.pct);
    }
    h += '</div>';

    h += '<div class="card"><h2>Hrdinové</h2><div class="sub">Nejdůležitější ukazatel síly vesnice.</div>';
    for (var hi = 0; hi < a.heroes.items.length; hi++) {
      var hero = a.heroes.items[hi];
      h += rowbar(hero.name, hero.level + " / " + hero.cap, hero.pct);
    }
    if (!a.heroes.items.length) h += '<div class="small muted">V datech nejsou žádní hrdinové.</div>';
    else h += '<div class="small muted" style="margin-top:10px">Celkem chybí <b>' + a.heroes.missing +
      '</b> úrovní hrdinů do stropu TH' + a.th + '.</div>';
    h += '</div>';

    h += '</div>';

    h += '<div class="card section"><h2>Válečná připravenost</h2>' +
      '<div class="sub">' + esc(a.war.label) + ' — skóre ' + r(a.war.score) + ' / 100.</div>' +
      rowbar("Hrdinové", pctText(a.war.heroPct), a.war.heroPct) +
      rowbar("Válečné jádro vojsk a kouzel", pctText(a.war.corePct), a.war.corePct) +
      rowbar("Obléhací stroje", a.war.siegeCount + " rozjetých", Math.min(100, a.war.siegeCount * 25)) +
      '</div>';

    if (a.builder.items.length) {
      h += '<div class="card section"><h2>🔨 Builder Base (BH' + (a.bh || "?") + ')</h2>' +
        '<div class="sub">Hodnoceno proti stropu Builder Hallu — celkem ' + pctText(a.builder.pct) + '.</div>';
      for (var bi = 0; bi < D.categoryOrder.length; bi++) {
        var bid = D.categoryOrder[bi];
        var bc = a.builderByCategory[bid];
        if (!bc || !bc.items.length) continue;
        h += rowbar(catIcon(bid) + " " + bc.label,
          nf(bc.level) + " / " + nf(bc.cap) + " (" + r(bc.pct) + " %)", bc.pct);
      }
      h += '</div>';
    }

    return h;
  }

  function countUpgrading(a) {
    var n = 0;
    for (var i = 0; i < a.allUnits.length; i++) n += a.allUnits[i].upgrading || 0;
    return n;
  }

  /* ================= JEDNOTKY ================= */

  function renderUnits(a, filter) {
    var all = a.allUnits;
    var h = '<div class="card"><h2>Všechno v vesnici</h2>' +
      '<div class="sub">Úroveň vůči stropu na TH' + a.th +
      '. U budov je uveden součet úrovní všech kusů. Řádky označené ' +
      '<span class="pill bad">dluh</span> měly být hotové už na TH' + Math.max(1, a.th - 1) + '.</div>';

    h += '<div class="row no-print" style="margin-bottom:12px"><span class="small muted">Kategorie:</span>' +
      '<button class="tab' + (!filter ? " active" : "") + '" data-unitfilter="">Vše</button>';
    var groups = {};
    for (var g = 0; g < all.length; g++) groups[all[g].category] = true;
    for (var ci = 0; ci < D.categoryOrder.length; ci++) {
      var id = D.categoryOrder[ci];
      if (!groups[id]) continue;
      h += '<button class="tab' + (filter === id ? " active" : "") + '" data-unitfilter="' + id + '">' +
        catIcon(id) + " " + esc(catLabel(id)) + '</button>';
    }
    h += '</div>';

    h += '<div class="tscroll"><table class="t"><thead><tr><th>Položka</th><th>Kategorie</th>' +
      '<th class="num">Kusy</th><th class="num">Úroveň</th><th class="num">Strop</th>' +
      '<th class="num">Postup</th><th>Stav</th></tr></thead><tbody>';

    var rows = all.filter(function (u) { return !filter || u.category === filter; });
    rows.sort(function (x, y) { return x.pct - y.pct; });

    for (var i = 0; i < rows.length; i++) {
      var u = rows[i];
      var tags = "";
      if (u.missingCount > 0) tags += '<span class="pill bad">chybí ' + u.missingCount + '</span> ';
      else if (u.isBehind) tags += '<span class="pill bad">dluh −' + u.foundationRemaining + '</span> ';
      else if (u.remaining === 0) tags += '<span class="pill good">max</span> ';
      if (u.upgrading) tags += '<span class="pill info">staví se ' + u.upgrading + '</span>';

      h += '<tr>' +
        '<td>' + catIcon(u.category) + " " + esc(u.name) + '</td>' +
        '<td class="muted small">' + esc(catLabel(u.category)) + '</td>' +
        '<td class="num">' + (u.expectedCount > 1 ? u.count + " / " + u.expectedCount : "—") + '</td>' +
        '<td class="num">' + nf(u.level) + '</td>' +
        '<td class="num">' + nf(u.cap) + (u.confident ? "" : '<span class="tag" title="odhadnutý strop">*</span>') + '</td>' +
        '<td class="num">' + r(u.pct) + ' %</td>' +
        '<td>' + tags + '</td>' +
        '</tr>';
    }
    h += '</tbody></table></div>';

    var estimated = rows.filter(function (u) { return !u.confident; }).length;
    if (estimated) {
      h += '<div class="small muted" style="margin-top:12px">* U ' + estimated + ' položek není strop v herních ' +
        'datech a je odhadnutý. Upřesnit ho jde v záložce <b>Data</b>.</div>';
    }
    h += '</div>';

    if (a.locked && a.locked.length) {
      h += '<div class="card section"><h2>Ještě neodemčeno</h2>' +
        '<div class="sub">Do postupu ani do analýzy rushe se nepočítá — na tomhle hallu to mít nemůžeš.</div><div>';
      for (var li = 0; li < a.locked.length; li++) {
        var lk = a.locked[li];
        h += '<span class="pill muted" style="margin:0 6px 6px 0">' + catIcon(lk.category) + " " +
          esc(lk.name) + (lk.unlockTH ? ' · od ' + lk.unlockTH : '') + '</span>';
      }
      h += '</div></div>';
    }

    return h;
  }

  /* ================= RUSH ================= */

  function renderRush(a) {
    var v = a.rush.verdict;
    var h = '<div class="card"><h2>Analýza rushe</h2>' +
      '<div class="sub">Nerushnutá vesnice na TH' + a.th + ' má hotové všechno, co šlo udělat na TH' +
      Math.max(1, a.th - 1) + '. Podle toho se počítá číslo níž.</div>';

    h += '<div class="verdict">';
    h += '<div class="dial" style="--p:' + r(a.rush.foundationPct) + ';--c:var(--' + v.color + ')">' +
      '<div class="in"><b>' + (a.rush.known ? r(a.rush.foundationPct) + '%' : '—') + '</b><span>základ</span></div></div>';
    h += '<div style="flex:1;min-width:240px">' +
      '<div style="font-size:20px;font-weight:800;margin-bottom:4px">' + esc(v.label) + '</div>' +
      '<div class="muted" style="margin-bottom:12px">' + esc(v.text) + '</div>' +
      rowbar("Postup na aktuálním TH" + a.th, pctText(a.thProgressPct), a.thProgressPct) +
      rowbar("Hrdinové", pctText(a.heroes.pct), a.heroes.pct) +
      rowbar("Laboratoř", pctText(a.labPct), a.labPct) +
      (a.hasDefenceData ? rowbar("Obrana, pasti a zdi", pctText(a.defence.pct), a.defence.pct) : "") +
      '</div>';
    h += '</div></div>';

    h += '<div class="card section"><h2>Kde přesně je dluh</h2>' +
      '<div class="sub">Postup vůči stropu TH' + Math.max(1, a.th - 1) + ' po kategoriích — 100 % znamená „tady nic nedlužím“.</div>';
    for (var ci = 0; ci < D.categoryOrder.length; ci++) {
      var id = D.categoryOrder[ci];
      var c = a.byCategory[id];
      if (!c || !c.foundationCap) continue;
      h += rowbar(catIcon(id) + " " + c.label,
        nf(c.foundationLevel) + " / " + nf(c.foundationCap) + " (" + r(c.foundationPct) + " %)", c.foundationPct);
    }
    h += '</div>';

    if (a.behind.length) {
      h += '<div class="card section"><h2>Konkrétní resty (' + a.behind.length + ')</h2>' +
        '<div class="sub">Tohle jsou nejlevnější body síly, které můžeš získat — jsou z předchozího TH, ' +
        'takže stojí zlomek toho, co upgrady na aktuální úrovni.</div><div class="list">';
      for (var i = 0; i < a.behind.length; i++) {
        var u = a.behind[i];
        h += '<div class="item behind"><div class="ic">' + catIcon(u.category) + '</div>' +
          '<div><div class="nm">' + esc(u.name) + '</div>' +
          '<div class="rs">' + esc(catLabel(u.category)) + ' · chybí ' + u.foundationRemaining + ' úr. k základu' +
          (countLabel(u) ? ' · ' + esc(countLabel(u)) : '') + '</div></div>' +
          '<div class="rt"><b>' + nf(u.level) + '</b> → ' + nf(u.foundationCap) + '</div></div>';
      }
      h += '</div></div>';
    } else {
      h += '<div class="card section"><h2>Žádné resty 🎉</h2>' +
        '<div class="sub">Z předchozího Town Hallu nezůstalo nic nedodělaného.</div></div>';
    }

    h += '<div class="card section"><h2>Jak se to počítá</h2><div class="small muted">' +
      '<p>Pro každou položku se zjistí strop na aktuálním TH a na TH o jedna nižším. ' +
      'U budov se strop násobí počtem kusů, na které máš na daném TH nárok — nepostavená budova se tak ' +
      'projeví jako chybějící úrovně. Poměr „kolik mám / kolik jsem mohl mít na minulém TH“ je míra rushe. ' +
      'Kategorie mají různou váhu: hrdinové nejvyšší, obléhací stroje a pasti nejnižší.</p>' +
      '<p>Stropy, ceny i časy pocházejí z herních dat (' + esc(COC.catalog.source) + '). ' +
      'Builder Base se do rushe hlavní vesnice nepočítá.</p>' +
      '</div></div>';

    return h;
  }

  /* ================= PLÁN ================= */

  function renderStrategyPicker(currentId) {
    var h = '<div class="card no-print"><h2>Způsob hraní</h2>' +
      '<div class="sub">Plán se přepočítá podle toho, co je pro tebe důležité.</div><div class="strats">';
    var list = COC.strategies.list;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      h += '<button class="strat' + (s.id === currentId ? " active" : "") + '" data-strategy="' + s.id + '">' +
        '<div class="n"><span class="dot" style="background:' + s.color + '"></span>' + esc(s.name) + '</div>' +
        '<div class="t">' + esc(s.tagline) + '</div>' +
        '<div class="d">' + esc(s.desc) + '</div></button>';
    }
    h += '</div></div>';
    return h;
  }

  function planItem(x, order) {
    var cost = costText(x.cost);
    return '<div class="item' + (x.isBehind || x.missingCount ? " behind" : "") + '">' +
      '<div class="ic">' + (order ? '<span class="ord">' + order + '</span>' : catIcon(x.category)) + '</div>' +
      '<div><div class="nm">' + (order ? catIcon(x.category) + " " : "") + esc(x.name) + '</div>' +
      '<div class="rs">' + esc(x.reason) + (cost ? ' <span class="muted">· ' + esc(cost) + '</span>' : '') + '</div></div>' +
      '<div class="rt"><b>' + nf(x.level) + '</b> → ' + nf(x.cap) + ' <span class="muted">(+' + nf(x.remaining) + ')</span></div></div>';
  }

  function renderPlan(a, plan) {
    var s = plan.strategy;
    var h = renderStrategyPicker(s.id);

    h += '<div class="card section"><h2 style="color:' + s.color + '">' + esc(s.name) + '</h2>' +
      '<div class="sub">' + esc(s.desc) + '</div><h3>Zásady</h3><ul class="small" style="margin:0;padding-left:20px">';
    for (var ri = 0; ri < s.rules.length; ri++) h += '<li style="margin-bottom:5px">' + esc(s.rules[ri]) + '</li>';
    h += '</ul></div>';

    if (plan.advice.length) {
      h += '<div class="card section"><h2>Co ti aplikace radí právě teď</h2>';
      for (var ai = 0; ai < plan.advice.length; ai++) {
        h += '<div class="note ' + plan.advice[ai].level + '">' + esc(plan.advice[ai].text) + '</div>';
      }
      h += '</div>';
    }

    h += '<div class="card section"><h2>Co zbývá do plného TH' + a.th + '</h2>' +
      '<div class="sub">Celkem ' + nf(plan.totalLevels) + ' úrovní ve ' + plan.items.length + ' položkách. ' +
      'Ceny a časy jsou z herních dat, časy platí pro jednoho stavitele.</div>' +
      costSummary(plan.cost) + '</div>';

    var tu = plan.thUp;
    h += '<div class="card section"><h2>Můžeš jít na TH' + (a.th + 1) + '?</h2>' +
      '<div class="sub">Podle kritérií strategie „' + esc(s.name) + '“.</div>';
    h += '<div class="row" style="margin-bottom:14px"><span class="pill ' + (tu.ready ? "good" : "warn") + '" style="font-size:14px;padding:6px 14px">' +
      (tu.ready ? "✅ Ano, jdi nahoru" : "⏳ Ještě ne — chybí " + tu.failed.length + " kritérium/í") + '</span></div>';
    for (var ti = 0; ti < tu.checks.length; ti++) {
      var c = tu.checks[ti];
      h += rowbar((c.ok ? "✔ " : "✘ ") + c.label,
        r(c.value) + " % / cíl " + r(c.target) + " %",
        Math.min(100, c.target ? (c.value / c.target) * 100 : 100),
        c.ok ? "good" : "warn");
    }
    h += '</div>';

    h += '<div class="card section"><h2>Dělej teď (top 6)</h2>' +
      '<div class="sub">Seřazeno podle toho, kolik síly to přinese vzhledem k ceně.</div><div class="list">';
    for (var ni = 0; ni < plan.topNext.length; ni++) h += planItem(plan.topNext[ni], ni + 1);
    if (!plan.topNext.length) h += '<div class="muted small">Není co upgradovat — vesnice je na stropu tohoto TH.</div>';
    h += '</div></div>';

    for (var pi = 0; pi < plan.phases.length; pi++) {
      var ph = plan.phases[pi];
      if (!ph.items.length) continue;
      var levels = ph.items.reduce(function (x, y) { return x + y.remaining; }, 0);
      h += '<div class="card section"><h2>' + esc(ph.title) + '</h2>' +
        '<div class="sub">' + esc(ph.subtitle) + ' — ' + ph.items.length + ' položek, ' + nf(levels) + ' úrovní.</div>' +
        costSummary(ph.cost) +
        '<div class="list" style="margin-top:14px">';
      for (var ii = 0; ii < ph.items.length; ii++) h += planItem(ph.items[ii], 0);
      h += '</div></div>';
    }

    h += '<div class="grid c2 section">';
    h += queueCard("🧪 Pořadí v laboratoři", "Prvních 10 výzkumů v doporučeném pořadí.", plan.labQueue, "Laboratoř je hotová.");
    h += queueCard("👑 Pořadí hrdinů", "Kterého hrdinu dát nahoru dřív.", plan.heroQueue, "Hrdinové jsou na stropu tohoto TH.");
    h += '</div>';

    if (plan.builderQueue.length) {
      h += '<div class="card section">' + queueInner("🔨 Pořadí pro stavitele", "Budovy, zdi a pasti v doporučeném pořadí.", plan.builderQueue, "") + '</div>';
    }

    h += '<div class="row section no-print"><button id="btn-export">⬇ Stáhnout plán (Markdown)</button>' +
      '<button id="btn-print" class="ghost">🖨 Tisk / PDF</button></div>';

    return h;
  }

  function queueInner(title, sub, list, empty) {
    var h = '<h2>' + esc(title) + '</h2><div class="sub">' + esc(sub) + '</div><div class="list">';
    for (var i = 0; i < list.length; i++) {
      var q = list[i];
      var cost = costText(q.cost);
      h += '<div class="item"><div class="ic"><span class="ord">' + (i + 1) + '</span></div>' +
        '<div><div class="nm">' + esc(q.name) + '</div><div class="rs">' + esc(catLabel(q.category)) +
        (cost ? ' · ' + esc(cost) : '') + '</div></div>' +
        '<div class="rt">' + nf(q.level) + ' → ' + nf(q.cap) + '</div></div>';
    }
    if (!list.length) h += '<div class="muted small">' + esc(empty) + '</div>';
    return h + '</div>';
  }

  function queueCard(title, sub, list, empty) {
    return '<div class="card">' + queueInner(title, sub, list, empty) + '</div>';
  }

  /* ================= POROVNÁNÍ ================= */

  function renderCompare(analyses, activeIndex) {
    if (analyses.length < 2) {
      return '<div class="card"><h2>Porovnání vesnic</h2><div class="sub">' +
        'Načti JSON s polem více vesnic (např. export členů klanu) a uvidíš tady žebříček.</div></div>';
    }
    var rows = analyses.map(function (a, i) { return { a: a, i: i }; });
    rows.sort(function (x, y) {
      return (y.a.th * 1000 + y.a.thProgressPct) - (x.a.th * 1000 + x.a.thProgressPct);
    });

    var h = '<div class="card"><h2>Porovnání vesnic (' + analyses.length + ')</h2>' +
      '<div class="sub">Klikni na řádek pro přepnutí aktivní vesnice.</div>' +
      '<div class="tscroll"><table class="t"><thead><tr><th>#</th><th>Vesnice</th><th class="num">TH</th>' +
      '<th class="num">Hrdinové</th><th class="num">Lab</th><th class="num">Obrana</th><th class="num">Základ</th>' +
      '<th>Verdikt</th><th class="num">War</th></tr></thead><tbody>';

    for (var i = 0; i < rows.length; i++) {
      var a = rows[i].a;
      h += '<tr data-village="' + rows[i].i + '" style="cursor:pointer' +
        (rows[i].i === activeIndex ? ';background:rgba(232,169,31,.10)' : '') + '">' +
        '<td class="muted">' + (i + 1) + '</td>' +
        '<td><b>' + esc(a.village.name) + '</b> <span class="tag">' + esc(a.village.tag) + '</span></td>' +
        '<td class="num">' + a.th + '</td>' +
        '<td class="num">' + pctText(a.heroes.pct) + '</td>' +
        '<td class="num">' + pctText(a.labPct) + '</td>' +
        '<td class="num">' + (a.hasDefenceData ? pctText(a.defence.pct) : "—") + '</td>' +
        '<td class="num">' + pctText(a.rush.foundationPct) + '</td>' +
        '<td><span class="pill ' + a.rush.verdict.color + '">' + esc(a.rush.verdict.label) + '</span></td>' +
        '<td class="num">' + r(a.war.score) + '</td>' +
        '</tr>';
    }
    h += '</tbody></table></div></div>';
    return h;
  }


  /* ================= KNIHOVNA VESNIC ================= */

  function dateText(ms) {
    try { return new Date(ms).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }); }
    catch (e) { return ""; }
  }

  function renderLibrary(state) {
    var entries = state.entries;
    var h = '<div class="card"><div class="row" style="justify-content:space-between;align-items:flex-start">' +
      '<div><h2>Moje vesnice</h2><div class="sub">' +
      (entries.length ? entries.length + " uloženo v tomhle prohlížeči · " +
        Math.round(COC.library.storageBytes() / 1024) + " kB"
                      : "Zatím tu nic není.") +
      '</div></div>' +
      '<button id="btn-go-add" class="primary no-print">＋ Přidat vesnici</button></div>';

    if (!entries.length) {
      h += '<div class="empty"><div class="big">🏕️</div>' +
        '<div>Přidej první vesnici — vložením JSONu, nahráním souboru, nebo si zkus ukázku.</div></div></div>';
      return h;
    }

    h += '<div class="list" style="margin-top:14px">';
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var a = state.analyses[i];
      var active = i === state.active;

      h += '<div class="item" style="grid-template-columns:auto 1fr auto' + (active ? ';border-color:var(--gold)' : '') + '">';
      h += '<div class="ic">' + (active ? '👉' : '🏰') + '</div>';
      // Když vesnice nemá jméno, je jejím názvem rovnou tag — neopakovat ho.
      var showTag = e.tag && e.tag !== e.label;
      h += '<div><div class="nm">' + esc(e.label) +
        (showTag ? ' <span class="tag">' + esc(e.tag) + '</span>' : '') + '</div>' +
        '<div class="rs">' +
        (a ? 'TH' + a.th + (a.bh ? ' · BH' + a.bh : '') +
             ' · hrdinové ' + pctText(a.heroes.pct) +
             ' · základ ' + pctText(a.rush.foundationPct) +
             ' · <span class="pill ' + a.rush.verdict.color + '">' + esc(a.rush.verdict.label) + '</span>'
           : '<span style="color:var(--bad)">data se nepodařilo načíst</span>') +
        '</div>' +
        '<div class="rs muted">' + (e.format === "export" ? "export z hry" : "API") +
        ' · přidáno ' + dateText(e.addedAt) +
        (e.updatedAt && e.updatedAt - e.addedAt > 60000 ? ' · aktualizováno ' + dateText(e.updatedAt) : '') +
        '</div></div>';
      h += '<div class="row no-print" style="gap:6px;justify-content:flex-end">' +
        (a ? '<button data-open="' + i + '">Otevřít</button>' : '') +
        '<button class="ghost" data-rename="' + esc(e.id) + '">Přejmenovat</button>' +
        '<button class="ghost" data-delete="' + esc(e.id) + '">Smazat</button>' +
        '</div>';
      h += '</div>';
    }
    h += '</div>';

    h += '<div class="row no-print" style="margin-top:16px">' +
      '<button id="btn-clear-library" class="ghost">Smazat všechny</button>' +
      '<span class="small muted">Vesnice jsou uložené jen v tomhle prohlížeči a nikam se neodesílají.</span></div>';
    h += '</div>';

    if (entries.length > 1) {
      h += '<div class="card section"><h2>Tip</h2><div class="small muted">' +
        'Když načteš stejnou vesnici znovu (stejný tag), přepíše se ta uložená — hodí se ' +
        'na sledování postupu. V záložce <b>Porovnání</b> vidíš všechny vesnice vedle sebe ' +
        'a s víc vesnicemi se zpřesňují i odhady stropů u novinek, které herní data ještě neznají.' +
        '</div></div>';
    }
    return h;
  }

  /* Nápověda k formátům — používá ji obrazovka přidání. */
  function renderFormatHelp() {
    return '<div class="card section"><h2>Odkud vzít data</h2>' +
      '<h3>Export z herního klienta</h3>' +
      '<div class="small muted">Obsahuje úplně všechno — budovy, zdi, pasti i Builder Base. ' +
      'Položky jsou v něm číselná ID, která si aplikace přeloží sama. Pozná se automaticky.</div>' +
      '<h3>Oficiální Clash of Clans API</h3>' +
      '<ol class="small" style="padding-left:20px;line-height:1.8">' +
      '<li>Na <b>developer.clashofclans.com</b> si vytvoř API klíč pro svoji IP adresu.</li>' +
      '<li>Zavolej <code>https://api.clashofclans.com/v1/players/%23TVUJTAG</code> ' +
      's hlavičkou <code>Authorization: Bearer &lt;klíč&gt;</code> — křížek se píše jako <code>%23</code>.</li>' +
      '<li>Odpověď ulož jako .json a nahraj sem.</li></ol>' +
      '<div class="note info">Tenhle formát neobsahuje budovy, takže obrana a zdi se z něj hodnotit nedají. ' +
      'Doplnit je jde ručně polem <code>"buildings"</code> — viz README.</div>' +
      '<div class="note info">Všechno zpracování běží u tebe v prohlížeči, nic se nikam neposílá.</div>' +
      '</div>';
  }

  /* ================= DATA ================= */

  function renderData() {
    var learned = COC.caps.getLearned();
    var count = 0;
    for (var k in learned) if (Object.prototype.hasOwnProperty.call(learned, k)) count++;

    var h = '<div class="card"><h2>Herní data</h2>' +
      '<div class="sub">Zdroj stropů, cen a časů: <b>' + esc(COC.catalog.source) + '</b> — ' +
      Object.keys(COC.catalog.raw.items || {}).length + ' položek, TH až ' + COC.catalog.maxTH +
      ', BH až ' + COC.catalog.maxBH + '.</div>' +
      '<div class="note info">Stropy pocházejí přímo z herních tabulek, takže nejde o odhady. ' +
      'Když Supercell přidá novinku dřív, než se data aktualizují, aplikace u ní použije odhad ' +
      'a označí ho hvězdičkou. Přegenerovat data jde příkazem <code>npm run gamedata</code>.</div>';

    h += '<h3>Naučené stropy</h3><div class="small muted">Z importovaných vesnic je naučeno <b>' + count +
      '</b> položek. Používají se jen tam, kde herní data chybí.</div>' +
      '<div class="row" style="margin-top:10px"><button id="btn-reset-learned" class="ghost">Zapomenout naučené</button></div>';

    h += '<h3>Ruční přepis stropů</h3><div class="small muted">JSON ve tvaru ' +
      '<code>{"Root Rider": {"15": 2, "16": 3}}</code> (klíč = Town Hall, hodnota = maximální úroveň) ' +
      'nebo <code>{"Root Rider": [0,0,...,4]}</code> (pole od TH1). Přepis má přednost před herními daty.</div>' +
      '<textarea id="override-json" spellcheck="false">' +
      esc(JSON.stringify(COC.caps.getOverrides(), null, 2)) + '</textarea>' +
      '<div class="row" style="margin-top:10px"><button id="btn-save-override" class="primary">Uložit</button>' +
      '<button id="btn-reset-override" class="ghost">Vymazat</button>' +
      '<span id="override-msg" class="small muted"></span></div>';

    h += '<h3>Stropy hrdinů podle Town Hallu</h3><div class="tscroll"><table class="t"><thead><tr><th>Hrdina</th>';
    for (var th = 7; th <= COC.catalog.maxTH; th++) h += '<th class="num">TH' + th + '</th>';
    h += '</tr></thead><tbody>';

    var items = COC.catalog.raw.items || {};
    for (var id in items) {
      if (!Object.prototype.hasOwnProperty.call(items, id)) continue;
      if (items[id].c !== "hero") continue;
      h += '<tr><td>' + esc(items[id].n) + '</td>';
      for (var t = 7; t <= COC.catalog.maxTH; t++) {
        var cap = COC.catalog.capAtHall(Number(id), t);
        h += '<td class="num' + (cap ? '' : ' muted') + '">' + (cap || "—") + '</td>';
      }
      h += '</tr>';
    }
    h += '</tbody></table></div></div>';
    return h;
  }

  /* ================= EXPORT ================= */

  function planToMarkdown(a, plan) {
    var L = [];
    var v = a.village;
    L.push("# Plán postupu — " + v.name + " (" + v.tag + ")");
    L.push("");
    L.push("- **Town Hall:** " + a.th + (a.bh ? " · **Builder Hall:** " + a.bh : ""));
    L.push("- **Strategie:** " + plan.strategy.name + " — " + plan.strategy.tagline);
    L.push("- **Hrdinové:** " + a.heroes.totalLevel + " / " + a.heroes.totalCap + " (" + pctText(a.heroes.pct) + ")");
    L.push("- **Laboratoř:** " + pctText(a.labPct));
    if (a.hasDefenceData) L.push("- **Obrana a zdi:** " + pctText(a.defence.pct));
    L.push("- **Základ / rush:** " + pctText(a.rush.foundationPct) + " — " + a.rush.verdict.label);
    L.push("- **Zbývá celkem:** " + plan.totalLevels + " úrovní · " + costText(plan.cost));
    L.push("");
    L.push("## Můžeš jít na TH" + (a.th + 1) + "?");
    L.push("");
    L.push(plan.thUp.ready ? "**Ano** — všechna kritéria strategie jsou splněná." : "**Ještě ne.**");
    for (var i = 0; i < plan.thUp.checks.length; i++) {
      var c = plan.thUp.checks[i];
      L.push("- " + (c.ok ? "[x] " : "[ ] ") + c.label + ": " + r(c.value) + " % (cíl " + r(c.target) + " %)");
    }
    L.push("");
    L.push("## Dělej teď");
    L.push("");
    for (var j = 0; j < plan.topNext.length; j++) {
      var it = plan.topNext[j];
      L.push((j + 1) + ". **" + it.name + "** " + it.level + " → " + it.cap +
        (costText(it.cost) ? " (" + costText(it.cost) + ")" : "") + " — " + it.reason);
    }
    L.push("");
    for (var p = 0; p < plan.phases.length; p++) {
      var ph = plan.phases[p];
      if (!ph.items.length) continue;
      L.push("## " + ph.title);
      L.push("");
      L.push("_" + ph.subtitle + "_");
      L.push("");
      L.push("Celkem: " + costText(ph.cost));
      L.push("");
      for (var k = 0; k < ph.items.length; k++) {
        var x = ph.items[k];
        L.push("- " + x.name + " (" + catLabel(x.category) + "): " + x.level + " → " + x.cap +
          " (+" + x.remaining + ")" +
          (x.missingCount ? " — chybí " + x.missingCount + " ks" : (x.isBehind ? " — dluh z minulého TH" : "")));
      }
      L.push("");
    }
    L.push("## Zásady strategie");
    L.push("");
    for (var s = 0; s < plan.strategy.rules.length; s++) L.push("- " + plan.strategy.rules[s]);
    L.push("");
    L.push("---");
    L.push("Vygenerováno v Clash of Clans Village Planner. Herní data: " + COC.catalog.source + ".");
    return L.join("\n");
  }

  COC.ui = {
    esc: esc,
    bar: bar,
    rowbar: rowbar,
    short: short,
    duration: duration,
    renderOverview: renderOverview,
    renderUnits: renderUnits,
    renderRush: renderRush,
    renderPlan: renderPlan,
    renderCompare: renderCompare,
    renderLibrary: renderLibrary,
    renderFormatHelp: renderFormatHelp,
    renderData: renderData,
    planToMarkdown: planToMarkdown
  };
})(window);
