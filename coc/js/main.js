/* =========================================================================
 * main.js — stav aplikace a propojení UI
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};
  var LS_LAST = "coc-planner-last-json-v1";
  var LS_STRAT = "coc-planner-strategy-v1";

  var state = {
    villages: [],
    analyses: [],
    active: 0,
    strategyId: null,
    unitFilter: "",
    warnings: [],
    tab: "input"
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- načtení dat ---------- */

  function loadJSONText(text, remember) {
    var res;
    try {
      res = COC.parse.parseInput(text);
    } catch (err) {
      showError(err.message);
      return false;
    }

    state.villages = res.villages;
    state.warnings = res.warnings;
    state.active = 0;

    COC.caps.learnFrom(state.villages);   // zpřesní stropy podle toho, co reálně vidíme
    recompute();

    if (remember !== false) {
      try { global.localStorage.setItem(LS_LAST, text); } catch (e) { /* ignore */ }
    }

    showError("");
    setTab("overview");
    return true;
  }

  function recompute() {
    state.analyses = state.villages.map(function (v) { return COC.analyze.analyze(v); });
  }

  function showError(msg) {
    var box = $("#input-error");
    if (!box) return;
    if (!msg) { box.className = "hide"; box.textContent = ""; return; }
    box.className = "note bad";
    box.textContent = msg;
  }

  function activeAnalysis() { return state.analyses[state.active] || null; }

  function strategy() {
    return COC.strategies.byId(state.strategyId || COC.strategies.defaultId);
  }

  /* ---------- záložky ---------- */

  function setTab(tab) {
    state.tab = tab;
    $$(".tab[data-tab]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    render();
    global.scrollTo({ top: 0, behavior: "smooth" });
  }

  function hasData() { return state.analyses.length > 0; }

  /* ---------- render ---------- */

  function render() {
    var main = $("#main");
    var a = activeAnalysis();

    $$(".tab[data-tab]").forEach(function (b) {
      var t = b.getAttribute("data-tab");
      b.disabled = (t !== "input" && t !== "data" && !hasData());
    });

    $("#village-switch").innerHTML = renderVillageSwitch();

    if (state.tab === "input") { main.innerHTML = renderInput(); bindInput(); return; }
    if (state.tab === "data") { main.innerHTML = COC.ui.renderData(); bindData(); return; }

    if (!a) {
      main.innerHTML = '<div class="empty"><div class="big">📥</div>' +
        '<div>Nejdřív načti JSON vesnice v záložce <b>Načíst data</b>.</div></div>';
      return;
    }

    if (state.tab === "overview") main.innerHTML = COC.ui.renderOverview(a);
    else if (state.tab === "units") { main.innerHTML = COC.ui.renderUnits(a, state.unitFilter); bindUnits(); }
    else if (state.tab === "rush") main.innerHTML = COC.ui.renderRush(a);
    else if (state.tab === "plan") {
      var plan = COC.planner.build(a, strategy());
      main.innerHTML = COC.ui.renderPlan(a, plan);
      bindPlan(a, plan);
    }
    else if (state.tab === "compare") { main.innerHTML = COC.ui.renderCompare(state.analyses, state.active); bindCompare(); }
  }

  function renderVillageSwitch() {
    if (state.analyses.length < 2) return "";
    var h = '<select id="village-select" style="width:auto;min-width:200px">';
    for (var i = 0; i < state.analyses.length; i++) {
      var a = state.analyses[i];
      h += '<option value="' + i + '"' + (i === state.active ? " selected" : "") + '>' +
        COC.ui.esc(a.village.name) + " — TH" + a.th + '</option>';
    }
    h += '</select>';
    return h;
  }

  /* ---------- obrazovka načtení ---------- */

  function renderInput() {
    var h = '<div class="card"><h2>Načíst data vesnice</h2>' +
      '<div class="sub">Aplikace čte JSON hráče z oficiálního Clash of Clans API ' +
      '(<code>GET /players/%23TAG</code>). Můžeš vložit jednoho hráče, nebo pole víc hráčů.</div>';

    h += '<div class="drop" id="drop"><strong>Přetáhni sem .json soubor</strong>' +
      'nebo <button id="btn-file" class="ghost" style="margin-top:8px">vyber soubor</button>' +
      '<input type="file" id="file" accept=".json,application/json" class="hide" multiple></div>';

    h += '<h3>Nebo vlož JSON</h3>' +
      '<textarea id="json-input" spellcheck="false" placeholder=\'{ "tag": "#ABC123", "name": "...", "townHallLevel": 14, "heroes": [...], "troops": [...], "spells": [...] }\'></textarea>' +
      '<div id="input-error" class="hide"></div>' +
      '<div class="row" style="margin-top:12px">' +
      '<button id="btn-load" class="primary">Analyzovat</button>' +
      '<button id="btn-clear" class="ghost">Vymazat</button>';

    var samples = COC.samples.list;
    h += '<span class="small muted" style="margin-left:8px">Ukázka:</span>';
    for (var i = 0; i < samples.length; i++) {
      h += '<button class="ghost" data-sample="' + samples[i].id + '">' + COC.ui.esc(samples[i].label) + '</button>';
    }
    h += '</div>';

    if (state.warnings.length) {
      h += '<h3>Poznámky k datům</h3>';
      for (var w = 0; w < state.warnings.length; w++) {
        h += '<div class="note warn">' + COC.ui.esc(state.warnings[w]) + '</div>';
      }
    }
    h += '</div>';

    h += '<div class="card section"><h2>Jak získat JSON své vesnice</h2>' +
      '<ol class="small" style="padding-left:20px;line-height:1.8">' +
      '<li>Zaregistruj se na <b>developer.clashofclans.com</b> a vytvoř API klíč pro svoji IP adresu.</li>' +
      '<li>Zavolej <code>https://api.clashofclans.com/v1/players/%23TVUJTAG</code> ' +
      's hlavičkou <code>Authorization: Bearer &lt;tvůj klíč&gt;</code> — křížek v tagu se píše jako <code>%23</code>.</li>' +
      '<li>Odpověď ulož jako .json a nahraj sem.</li>' +
      '</ol>' +
      '<div class="note info">API klíč je vázaný na IP, takže se z prohlížeče volat nedá — proto se JSON vkládá ručně. ' +
      'Všechno zpracování běží u tebe v prohlížeči, nic se nikam neposílá.</div>' +
      '<h3>Nepovinné rozšíření: budovy</h3>' +
      '<div class="small muted">Oficiální API neposílá úrovně budov. Pokud je do JSONu dopíšeš, ' +
      'zohlední se v analýze obrany:</div>' +
      '<pre class="small" style="background:#0f1721;border:1px solid var(--line);border-radius:9px;padding:12px;overflow:auto">' +
      COC.ui.esc('"buildings": [\n  { "name": "Cannon", "level": 19, "count": 7, "maxLevel": 21 },\n  { "name": "X-Bow", "level": 9, "count": 4, "maxLevel": 11 },\n  { "name": "Wall", "level": 15, "count": 325, "maxLevel": 16 }\n]') +
      '</pre></div>';

    return h;
  }

  /* ---------- eventy ---------- */

  function bindInput() {
    var ta = $("#json-input");
    var last = null;
    try { last = global.localStorage.getItem(LS_LAST); } catch (e) { /* ignore */ }
    if (last && ta && !ta.value) ta.value = last;

    $("#btn-load").addEventListener("click", function () {
      var text = ta.value.trim();
      if (!text) { showError("Nejdřív vlož JSON nebo nahraj soubor."); return; }
      loadJSONText(text);
    });

    $("#btn-clear").addEventListener("click", function () {
      ta.value = "";
      showError("");
      try { global.localStorage.removeItem(LS_LAST); } catch (e) { /* ignore */ }
    });

    $$("[data-sample]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = COC.samples.byId(b.getAttribute("data-sample"));
        if (!s) return;
        var text = JSON.stringify(s.data, null, 2);
        ta.value = text;
        loadJSONText(text);
      });
    });

    var fileInput = $("#file");
    $("#btn-file").addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () { readFiles(fileInput.files); });

    var drop = $("#drop");
    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); });
    });
    drop.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files) readFiles(e.dataTransfer.files);
    });
  }

  /* Načte jeden nebo víc souborů; víc souborů = pole vesnic. */
  function readFiles(files) {
    if (!files || !files.length) return;
    var texts = [];
    var pending = files.length;

    Array.prototype.forEach.call(files, function (f) {
      var reader = new FileReader();
      reader.onload = function () {
        texts.push(String(reader.result));
        if (--pending === 0) merge();
      };
      reader.onerror = function () {
        showError("Soubor „" + f.name + "“ se nepodařilo přečíst.");
        if (--pending === 0) merge();
      };
      reader.readAsText(f);
    });

    function merge() {
      if (!texts.length) return;
      if (texts.length === 1) {
        var ta1 = $("#json-input");
        if (ta1) ta1.value = texts[0];
        loadJSONText(texts[0]);
        return;
      }
      var all = [];
      for (var i = 0; i < texts.length; i++) {
        try {
          var parsed = JSON.parse(texts[i]);
          if (Object.prototype.toString.call(parsed) === "[object Array]") all = all.concat(parsed);
          else all.push(parsed);
        } catch (e) {
          showError("Jeden ze souborů nebyl platný JSON — přeskočen.");
        }
      }
      var text = JSON.stringify(all, null, 2);
      var ta2 = $("#json-input");
      if (ta2) ta2.value = text;
      loadJSONText(text);
    }
  }

  function bindUnits() {
    $$("[data-unitfilter]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.unitFilter = b.getAttribute("data-unitfilter");
        render();
      });
    });
  }

  function bindCompare() {
    $$("[data-village]").forEach(function (row) {
      row.addEventListener("click", function () {
        state.active = Number(row.getAttribute("data-village"));
        setTab("overview");
      });
    });
  }

  function bindPlan(a, plan) {
    $$("[data-strategy]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.strategyId = b.getAttribute("data-strategy");
        try { global.localStorage.setItem(LS_STRAT, state.strategyId); } catch (e) { /* ignore */ }
        render();
      });
    });

    var exp = $("#btn-export");
    if (exp) exp.addEventListener("click", function () {
      var md = COC.ui.planToMarkdown(a, plan);
      var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "plan-" + (a.village.name || "vesnice").replace(/[^\w\-]+/g, "_") + "-" + plan.strategy.id + ".md";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });

    var pr = $("#btn-print");
    if (pr) pr.addEventListener("click", function () { global.print(); });
  }

  function bindData() {
    var msg = $("#override-msg");

    $("#btn-save-override").addEventListener("click", function () {
      var raw = $("#override-json").value.trim() || "{}";
      try {
        var obj = JSON.parse(raw);
        COC.caps.setOverrides(obj);
        recompute();
        msg.textContent = "Uloženo a přepočítáno.";
        msg.style.color = "var(--good)";
      } catch (e) {
        msg.textContent = "Neplatný JSON: " + e.message;
        msg.style.color = "var(--bad)";
      }
    });

    $("#btn-reset-override").addEventListener("click", function () {
      COC.caps.resetOverrides();
      recompute();
      render();
    });

    $("#btn-reset-learned").addEventListener("click", function () {
      COC.caps.resetLearned();
      recompute();
      render();
    });
  }

  /* ---------- start ---------- */

  function init() {
    try { state.strategyId = global.localStorage.getItem(LS_STRAT) || COC.strategies.defaultId; }
    catch (e) { state.strategyId = COC.strategies.defaultId; }

    $$(".tab[data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { setTab(b.getAttribute("data-tab")); });
    });

    document.addEventListener("change", function (e) {
      if (e.target && e.target.id === "village-select") {
        state.active = Number(e.target.value);
        render();
      }
    });

    var last = null;
    try { last = global.localStorage.getItem(LS_LAST); } catch (e) { /* ignore */ }
    if (last) {
      // ticho — když uložená data nedávají smysl, prostě zůstaneme na úvodní obrazovce
      try {
        var res = COC.parse.parseInput(last);
        state.villages = res.villages;
        state.warnings = res.warnings;
        COC.caps.learnFrom(state.villages);
        recompute();
        setTab("overview");
        return;
      } catch (err) { /* ignore */ }
    }
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  COC.state = state;
})(window);
