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
  /* procenta, která nemusí být známá (např. u vesnice bez dostatku dat) */
  function pctText(v) { return (v === null || v === undefined) ? "—" : r(v) + " %"; }
  function nf(n) { return (Number(n) || 0).toLocaleString("cs-CZ"); }

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

  /* ================= PŘEHLED ================= */

  function renderOverview(a) {
    var v = a.village;
    var h = "";

    h += '<div class="card">';
    h += '<div class="row" style="justify-content:space-between;align-items:flex-start">';
    h += '<div><h2 style="font-size:22px">' + esc(v.name) + ' <span class="tag">' + esc(v.tag) + '</span></h2>';
    h += '<div class="small muted">' +
      (v.clan ? "Klan " + esc(v.clan.name) + " (" + esc(v.clan.tag) + ")" : "Bez klanu") +
      (v.league ? " · " + esc(v.league) : "") +
      (v.role ? " · " + esc(v.role) : "") + '</div>';
    if (v.labels.length) {
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
    h += stat("Hrdinové", r(a.heroes.pct) + " %", a.heroes.totalLevel + " / " + a.heroes.totalCap + " úr.");
    h += stat("Laboratoř", r(a.labPct) + " %", "zbývá " + a.labRemaining + " úr.");
    h += stat("Základ (anti-rush)", pctText(a.rush.foundationPct), a.rush.verdict.label);
    h += stat("Trofeje", nf(v.trophies), "nejlepší " + nf(v.bestTrophies));
    h += stat("War stars", nf(v.warStars), "útoky " + nf(v.attackWins));
    h += stat("Donace", nf(v.donations), "přijato " + nf(v.donationsReceived));
    h += stat("Zkušenost", "úr. " + nf(v.expLevel), v.warPreference ? "war: " + esc(v.warPreference) : "");
    h += stat("Builder Hall", v.bh ? String(v.bh) : "—", v.builderTrophies ? nf(v.builderTrophies) + " trofejí" : "");
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
      '<div class="sub">Vůči stropu, který je dostupný na TH' + a.th + '.</div>';
    for (var ci = 0; ci < D.categoryOrder.length; ci++) {
      var id = D.categoryOrder[ci];
      var c = a.byCategory[id];
      if (!c || !c.items.length) continue;
      h += rowbar(catIcon(id) + " " + c.label,
        c.level + " / " + c.cap + " (" + r(c.pct) + " %)", c.pct);
    }
    if (a.buildings && a.buildings.pct !== null) {
      h += rowbar("🏰 Obrana a zdi (z tvých dat)", r(a.buildings.pct) + " %", a.buildings.pct);
    }
    h += '</div>';

    h += '<div class="card"><h2>Hrdinové</h2><div class="sub">Nejdůležitější ukazatel síly vesnice.</div>';
    for (var hi = 0; hi < a.heroes.items.length; hi++) {
      var hero = a.heroes.items[hi];
      h += rowbar(hero.name, hero.level + " / " + hero.cap, hero.pct);
    }
    h += '<div class="small muted" style="margin-top:10px">Celkem chybí <b>' + a.heroes.missing +
      '</b> úrovní hrdinů do stropu TH' + a.th + '.</div>';
    h += '</div>';

    h += '</div>';

    h += '<div class="card section"><h2>Válečná připravenost</h2>' +
      '<div class="sub">' + esc(a.war.label) + ' — skóre ' + r(a.war.score) + ' / 100.</div>' +
      rowbar("Hrdinové", r(a.war.heroPct) + " %", a.war.heroPct) +
      rowbar("Válečné jádro vojsk a kouzel", r(a.war.corePct) + " %", a.war.corePct) +
      rowbar("Obléhací stroje", a.war.siegeCount + " rozjetých", Math.min(100, a.war.siegeCount * 25)) +
      '</div>';

    return h;
  }

  /* ================= JEDNOTKY ================= */

  function renderUnits(a, filter) {
    var h = '<div class="card"><h2>Všechny jednotky</h2>' +
      '<div class="sub">Úroveň vůči stropu na TH' + a.th +
      '. Řádky označené <span class="pill bad">dluh</span> měly být hotové už na TH' + Math.max(1, a.th - 1) + '.</div>';

    h += '<div class="row no-print" style="margin-bottom:12px"><span class="small muted">Kategorie:</span>' +
      '<button class="tab' + (!filter ? " active" : "") + '" data-unitfilter="">Vše</button>';
    for (var ci = 0; ci < D.categoryOrder.length; ci++) {
      var id = D.categoryOrder[ci];
      if (!a.byCategory[id] || !a.byCategory[id].items.length) continue;
      h += '<button class="tab' + (filter === id ? " active" : "") + '" data-unitfilter="' + id + '">' +
        catIcon(id) + " " + esc(catLabel(id)) + '</button>';
    }
    h += '</div>';

    h += '<div class="tscroll"><table class="t"><thead><tr><th>Jednotka</th><th>Kategorie</th>' +
      '<th class="num">Úroveň</th><th class="num">Strop TH' + a.th + '</th>' +
      '<th class="num">Globální max</th><th class="num">Postup</th><th></th></tr></thead><tbody>';

    var rows = a.units.filter(function (u) { return !filter || u.category === filter; });
    rows.sort(function (x, y) { return x.pct - y.pct; });

    for (var i = 0; i < rows.length; i++) {
      var u = rows[i];
      h += '<tr>' +
        '<td>' + catIcon(u.category) + " " + esc(u.name) + '</td>' +
        '<td class="muted small">' + esc(catLabel(u.category)) + '</td>' +
        '<td class="num">' + u.level + '</td>' +
        '<td class="num">' + u.cap + (u.confident ? "" : '<span class="tag" title="odhadnutý strop">*</span>') + '</td>' +
        '<td class="num muted">' + u.maxLevel + '</td>' +
        '<td class="num">' + r(u.pct) + ' %</td>' +
        '<td>' + (u.isBehind ? '<span class="pill bad">dluh −' + u.foundationRemaining + '</span>' :
          (u.remaining === 0 ? '<span class="pill good">max</span>' : "")) + '</td>' +
        '</tr>';
    }
    h += '</tbody></table></div>';
    h += '<div class="small muted" style="margin-top:12px">* Strop není v tabulce jistý a je odhadnutý ' +
      'z globálního maxima. Můžeš ho upřesnit v záložce <b>Data</b> nebo importem víc vesnic.</div>';
    h += '</div>';

    if (a.locked && a.locked.length) {
      h += '<div class="card section"><h2>Ještě neodemčeno na TH' + a.th + '</h2>' +
        '<div class="sub">Tyhle jednotky se do postupu ani do analýzy rushe nepočítají — na tomhle ' +
        'Town Hallu je mít nemůžeš.</div><div>';
      for (var li = 0; li < a.locked.length; li++) {
        var lk = a.locked[li];
        h += '<span class="pill muted" style="margin:0 6px 6px 0">' + catIcon(lk.category) + " " +
          esc(lk.name) + ' · TH' + lk.unlockTH + '</span>';
      }
      h += '</div></div>';
    }

    if (a.builder.items.length) {
      h += '<div class="card section"><h2>🔨 Builder Base</h2>' +
        '<div class="sub">Hodnoceno vůči globálnímu maximu (Builder Hall ' + (a.village.bh || "?") + ').</div>';
      for (var b = 0; b < a.builder.items.length; b++) {
        var bi = a.builder.items[b];
        h += rowbar(bi.name, bi.level + " / " + bi.maxLevel, bi.pct);
      }
      h += '</div>';
    }

    if (a.buildings) {
      h += '<div class="card section"><h2>🏰 Budovy z tvých dat</h2>' +
        '<div class="sub">Průměrná úroveň v rámci typu budovy.</div><div class="tscroll"><table class="t">' +
        '<thead><tr><th>Budova</th><th class="num">Počet</th><th class="num">Prům. úroveň</th>' +
        '<th class="num">Max</th><th class="num">Postup</th></tr></thead><tbody>';
      for (var g = 0; g < a.buildings.groups.length; g++) {
        var gr = a.buildings.groups[g];
        h += '<tr><td>' + esc(gr.name) + '</td><td class="num">' + gr.count + '</td>' +
          '<td class="num">' + (Math.round(gr.avgLevel * 10) / 10) + '</td>' +
          '<td class="num muted">' + (gr.maxLevel || "—") + '</td>' +
          '<td class="num">' + (gr.pct === null ? "—" : r(gr.pct) + " %") + '</td></tr>';
      }
      h += '</tbody></table></div></div>';
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
      rowbar("Postup na aktuálním TH" + a.th, r(a.thProgressPct) + " %", a.thProgressPct) +
      rowbar("Hrdinové", r(a.heroes.pct) + " %", a.heroes.pct) +
      rowbar("Laboratoř", r(a.labPct) + " %", a.labPct) +
      '</div>';
    h += '</div></div>';

    h += '<div class="card section"><h2>Kde přesně je dluh</h2>' +
      '<div class="sub">Postup vůči stropu TH' + Math.max(1, a.th - 1) + ' po kategoriích — 100 % znamená „tady nic nedlužím“.</div>';
    for (var ci = 0; ci < D.categoryOrder.length; ci++) {
      var id = D.categoryOrder[ci];
      var c = a.byCategory[id];
      if (!c || !c.foundationCap) continue;
      h += rowbar(catIcon(id) + " " + c.label,
        c.foundationLevel + " / " + c.foundationCap + " (" + r(c.foundationPct) + " %)", c.foundationPct);
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
          '<div class="rs">' + esc(catLabel(u.category)) + ' · chybí ' + u.foundationRemaining + ' úr. k základu</div></div>' +
          '<div class="rt"><b>' + u.level + '</b> → ' + u.foundationCap + '</div></div>';
      }
      h += '</div></div>';
    } else {
      h += '<div class="card section"><h2>Žádné resty 🎉</h2>' +
        '<div class="sub">Z předchozího Town Hallu nezůstalo nic nedodělaného.</div></div>';
    }

    h += '<div class="card section"><h2>Jak se to počítá</h2><div class="small muted">' +
      '<p>Pro každou jednotku se zjistí strop na aktuálním TH a na TH o jedna nižším. ' +
      'Poměr „kolik mám / kolik jsem mohl mít na minulém TH“ je míra rushe. Kategorie mají různou váhu: ' +
      'hrdinové nejvyšší, obléhací stroje nejnižší.</p>' +
      '<p>Stropy hrdinů jsou pevná tabulka. U vojsk a kouzel se používá <code>maxLevel</code> přímo z tvého JSONu ' +
      '(je vždy aktuální) a podíl, který je na daném TH dosažitelný. Import více vesnic přesnost zpřesňuje — ' +
      'aplikace se stropy učí z toho, co reálně vidí.</p>' +
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

  function renderPlan(a, plan) {
    var s = plan.strategy;
    var h = renderStrategyPicker(s.id);

    /* pravidla strategie */
    h += '<div class="card section"><h2 style="color:' + s.color + '">' + esc(s.name) + '</h2>' +
      '<div class="sub">' + esc(s.desc) + '</div><h3>Zásady</h3><ul class="small" style="margin:0;padding-left:20px">';
    for (var ri = 0; ri < s.rules.length; ri++) h += '<li style="margin-bottom:5px">' + esc(s.rules[ri]) + '</li>';
    h += '</ul></div>';

    /* doporučení */
    if (plan.advice.length) {
      h += '<div class="card section"><h2>Co ti aplikace radí právě teď</h2>';
      for (var ai = 0; ai < plan.advice.length; ai++) {
        h += '<div class="note ' + plan.advice[ai].level + '">' + esc(plan.advice[ai].text) + '</div>';
      }
      h += '</div>';
    }

    /* TH up */
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

    /* dalších 6 kroků */
    h += '<div class="card section"><h2>Dělej teď (top 6)</h2>' +
      '<div class="sub">Seřazeno podle toho, kolik síly to přinese vzhledem k ceně.</div><div class="list">';
    for (var ni = 0; ni < plan.topNext.length; ni++) {
      var it = plan.topNext[ni];
      h += '<div class="item' + (it.isBehind ? " behind" : "") + '">' +
        '<div class="ic"><span class="ord">' + (ni + 1) + '</span></div>' +
        '<div><div class="nm">' + catIcon(it.category) + " " + esc(it.name) + '</div>' +
        '<div class="rs">' + esc(it.reason) + '</div></div>' +
        '<div class="rt"><b>' + it.level + '</b> → ' + it.cap + ' <span class="muted">(+' + it.remaining + ')</span></div></div>';
    }
    if (!plan.topNext.length) h += '<div class="muted small">Není co upgradovat — vesnice je na stropu tohoto TH.</div>';
    h += '</div></div>';

    /* fáze */
    for (var pi = 0; pi < plan.phases.length; pi++) {
      var ph = plan.phases[pi];
      if (!ph.items.length) continue;
      var levels = ph.items.reduce(function (x, y) { return x + y.remaining; }, 0);
      h += '<div class="card section"><h2>' + esc(ph.title) + '</h2>' +
        '<div class="sub">' + esc(ph.subtitle) + ' — ' + ph.items.length + ' položek, ' + levels + ' úrovní.</div>' +
        '<div class="list">';
      for (var ii = 0; ii < ph.items.length; ii++) {
        var x = ph.items[ii];
        h += '<div class="item' + (x.isBehind ? " behind" : "") + '"><div class="ic">' + catIcon(x.category) + '</div>' +
          '<div><div class="nm">' + esc(x.name) + '</div><div class="rs">' + esc(catLabel(x.category)) +
          (x.isBehind ? ' · <span style="color:var(--bad)">dluh z minulého TH</span>' : "") + '</div></div>' +
          '<div class="rt"><b>' + x.level + '</b> → ' + x.cap + ' <span class="muted">(+' + x.remaining + ')</span></div></div>';
      }
      h += '</div></div>';
    }

    /* fronty */
    h += '<div class="grid c2 section">';
    h += '<div class="card"><h2>🧪 Pořadí v laboratoři</h2><div class="sub">Prvních 10 výzkumů v doporučeném pořadí.</div><div class="list">';
    for (var li = 0; li < plan.labQueue.length; li++) {
      var lq = plan.labQueue[li];
      h += '<div class="item"><div class="ic"><span class="ord">' + (li + 1) + '</span></div>' +
        '<div><div class="nm">' + esc(lq.name) + '</div><div class="rs">' + esc(catLabel(lq.category)) + '</div></div>' +
        '<div class="rt">' + lq.level + ' → ' + lq.cap + '</div></div>';
    }
    if (!plan.labQueue.length) h += '<div class="muted small">Laboratoř je hotová.</div>';
    h += '</div></div>';

    h += '<div class="card"><h2>👑 Pořadí hrdinů</h2><div class="sub">Kterého hrdinu dát nahoru dřív.</div><div class="list">';
    for (var qi = 0; qi < plan.heroQueue.length; qi++) {
      var hq = plan.heroQueue[qi];
      h += '<div class="item"><div class="ic"><span class="ord">' + (qi + 1) + '</span></div>' +
        '<div><div class="nm">' + esc(hq.name) + '</div><div class="rs">' + esc(hq.reason) + '</div></div>' +
        '<div class="rt">' + hq.level + ' → ' + hq.cap + '</div></div>';
    }
    if (!plan.heroQueue.length) h += '<div class="muted small">Hrdinové jsou na stropu tohoto TH.</div>';
    h += '</div></div>';
    h += '</div>';

    h += '<div class="row section no-print"><button id="btn-export">⬇ Stáhnout plán (Markdown)</button>' +
      '<button id="btn-print" class="ghost">🖨 Tisk / PDF</button></div>';

    return h;
  }

  /* ================= POROVNÁNÍ ================= */

  function renderCompare(analyses, activeIndex) {
    if (analyses.length < 2) {
      return '<div class="card"><h2>Porovnání vesnic</h2><div class="sub">' +
        'Načti JSON s polem více hráčů (např. export členů klanu) a uvidíš tady žebříček. ' +
        'Zároveň se tím zpřesní odhady stropů.</div></div>';
    }
    var rows = analyses.map(function (a, i) { return { a: a, i: i }; });
    rows.sort(function (x, y) {
      return (y.a.th * 1000 + y.a.thProgressPct) - (x.a.th * 1000 + x.a.thProgressPct);
    });

    var h = '<div class="card"><h2>Porovnání vesnic (' + analyses.length + ')</h2>' +
      '<div class="sub">Klikni na řádek pro přepnutí aktivní vesnice.</div>' +
      '<div class="tscroll"><table class="t"><thead><tr><th>#</th><th>Hráč</th><th class="num">TH</th>' +
      '<th class="num">Hrdinové</th><th class="num">Lab</th><th class="num">Základ</th>' +
      '<th>Verdikt</th><th class="num">War</th></tr></thead><tbody>';

    for (var i = 0; i < rows.length; i++) {
      var a = rows[i].a;
      h += '<tr data-village="' + rows[i].i + '" style="cursor:pointer' +
        (rows[i].i === activeIndex ? ';background:rgba(240,180,41,.08)' : '') + '">' +
        '<td class="muted">' + (i + 1) + '</td>' +
        '<td><b>' + esc(a.village.name) + '</b> <span class="tag">' + esc(a.village.tag) + '</span></td>' +
        '<td class="num">' + a.th + '</td>' +
        '<td class="num">' + r(a.heroes.pct) + ' %</td>' +
        '<td class="num">' + r(a.labPct) + ' %</td>' +
        '<td class="num">' + pctText(a.rush.foundationPct) + '</td>' +
        '<td><span class="pill ' + a.rush.verdict.color + '">' + esc(a.rush.verdict.label) + '</span></td>' +
        '<td class="num">' + r(a.war.score) + '</td>' +
        '</tr>';
    }
    h += '</tbody></table></div></div>';
    return h;
  }

  /* ================= DATA ================= */

  function renderData() {
    var learned = COC.caps.getLearned();
    var count = 0;
    for (var k in learned) if (Object.prototype.hasOwnProperty.call(learned, k)) count++;

    var h = '<div class="card"><h2>Herní data</h2>' +
      '<div class="sub">Verze zabudované tabulky: <b>' + esc(D.version) + '</b></div>' +
      '<div class="note info">Supercell mění stropy každým updatem. Aplikace proto počítá primárně ' +
      'z <code>maxLevel</code>, které posílá samotné API, a tabulku používá jen tam, kde to jinak nejde ' +
      '(hlavně u hrdinů). Cokoliv si můžeš přepsat níž.</div>';

    h += '<h3>Naučené stropy</h3><div class="small muted">Z importovaných vesnic je naučeno <b>' + count +
      '</b> jednotek. Čím víc vesnic (třeba celý klan) načteš, tím přesnější stropy.</div>' +
      '<div class="row" style="margin-top:10px"><button id="btn-reset-learned" class="ghost">Zapomenout naučené</button></div>';

    h += '<h3>Ruční přepis stropů</h3><div class="small muted">JSON ve tvaru ' +
      '<code>{"Root Rider": {"15": 2, "16": 3, "17": 4}}</code> (klíč = Town Hall, hodnota = maximální úroveň) ' +
      'nebo <code>{"Root Rider": [0,0,...,4]}</code> (pole od TH1). Uloží se do prohlížeče.</div>' +
      '<textarea id="override-json" spellcheck="false">' +
      esc(JSON.stringify(COC.caps.getOverrides(), null, 2)) + '</textarea>' +
      '<div class="row" style="margin-top:10px"><button id="btn-save-override" class="primary">Uložit</button>' +
      '<button id="btn-reset-override" class="ghost">Vymazat</button>' +
      '<span id="override-msg" class="small muted"></span></div>';

    h += '<h3>Tabulka hrdinů</h3><div class="tscroll"><table class="t"><thead><tr><th>Hrdina</th>';
    for (var th = 7; th <= D.maxTH; th++) h += '<th class="num">TH' + th + '</th>';
    h += '</tr></thead><tbody>';
    for (var name in D.heroCaps) {
      if (!Object.prototype.hasOwnProperty.call(D.heroCaps, name)) continue;
      h += '<tr><td>' + esc(name) + '</td>';
      for (var t = 7; t <= D.maxTH; t++) {
        var val = D.heroCaps[name][t];
        h += '<td class="num' + (val ? '' : ' muted') + '">' + (val || "—") + '</td>';
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
    L.push("- **Town Hall:** " + a.th);
    L.push("- **Strategie:** " + plan.strategy.name + " — " + plan.strategy.tagline);
    L.push("- **Hrdinové:** " + a.heroes.totalLevel + " / " + a.heroes.totalCap + " (" + r(a.heroes.pct) + " %)");
    L.push("- **Laboratoř:** " + r(a.labPct) + " %");
    L.push("- **Základ / rush:** " + pctText(a.rush.foundationPct) + " — " + a.rush.verdict.label);
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
      L.push((j + 1) + ". **" + it.name + "** " + it.level + " → " + it.cap + " — " + it.reason);
    }
    L.push("");
    for (var p = 0; p < plan.phases.length; p++) {
      var ph = plan.phases[p];
      if (!ph.items.length) continue;
      L.push("## " + ph.title);
      L.push("");
      L.push("_" + ph.subtitle + "_");
      L.push("");
      for (var k = 0; k < ph.items.length; k++) {
        var x = ph.items[k];
        L.push("- " + x.name + " (" + catLabel(x.category) + "): " + x.level + " → " + x.cap +
          " (+" + x.remaining + ")" + (x.isBehind ? " — dluh z minulého TH" : ""));
      }
      L.push("");
    }
    L.push("## Zásady strategie");
    L.push("");
    for (var s = 0; s < plan.strategy.rules.length; s++) L.push("- " + plan.strategy.rules[s]);
    L.push("");
    L.push("---");
    L.push("Vygenerováno v Clash of Clans Village Planner. Herní data: " + D.version + ".");
    return L.join("\n");
  }

  COC.ui = {
    esc: esc,
    bar: bar,
    rowbar: rowbar,
    renderOverview: renderOverview,
    renderUnits: renderUnits,
    renderRush: renderRush,
    renderPlan: renderPlan,
    renderCompare: renderCompare,
    renderData: renderData,
    planToMarkdown: planToMarkdown
  };
})(window);
