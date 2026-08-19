/* =========================================================================
 * main.js — stav aplikace a propojení UI
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};
  var LS_STRAT = "coc-planner-strategy-v1";

  var state = {
    entries: [],      // záznamy z knihovny
    villages: [],     // rozparsované vesnice (stejné pořadí jako entries)
    analyses: [],
    active: 0,
    strategyId: null,
    unitFilter: "",
    warnings: [],
    message: null,
    updatingId: null,   // když aktualizujeme konkrétní vesnici
    tab: "library"
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- knihovna -> stav ---------- */

  function reload() {
    state.entries = COC.library.all();
    state.villages = [];
    state.analyses = [];

    for (var i = 0; i < state.entries.length; i++) {
      var e = state.entries[i];
      try {
        var res = COC.parse.fromObject(e.raw);
        var v = res.villages[0];
        v.libraryId = e.id;
        v.libraryLabel = e.label;
        state.villages.push(v);
      } catch (err) {
        // Poškozený záznam přeskočíme, ale řekneme o něm.
        state.warnings.push("Vesnici „" + e.label + "“ se nepodařilo načíst: " + err.message);
        state.villages.push(null);
      }
    }

    var usable = state.villages.filter(Boolean);
    COC.caps.learnFrom(usable);

    for (var j = 0; j < state.villages.length; j++) {
      state.analyses.push(state.villages[j] ? COC.analyze.analyze(state.villages[j]) : null);
    }

    var activeId = COC.library.activeId();
    state.active = 0;
    for (var k = 0; k < state.entries.length; k++) {
      if (state.entries[k].id === activeId && state.analyses[k]) { state.active = k; break; }
    }
  }

  function recomputeAnalyses() {
    for (var i = 0; i < state.villages.length; i++) {
      state.analyses[i] = state.villages[i] ? COC.analyze.analyze(state.villages[i]) : null;
    }
  }

  function activeAnalysis() { return state.analyses[state.active] || null; }
  function hasData() { return state.analyses.some(Boolean); }

  function strategy() {
    return COC.strategies.byId(state.strategyId || COC.strategies.defaultId);
  }

  function setActive(index) {
    state.active = index;
    var e = state.entries[index];
    if (e) COC.library.setActive(e.id);
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

  /* ---------- render ---------- */

  function render() {
    var main = $("#main");
    var a = activeAnalysis();

    $$(".tab[data-tab]").forEach(function (b) {
      var t = b.getAttribute("data-tab");
      b.disabled = (["library", "add", "data"].indexOf(t) === -1 && !hasData());
    });

    $("#village-switch").innerHTML = renderVillageSwitch();

    if (state.tab === "add") { main.innerHTML = renderAdd(); bindAdd(); return; }
    if (state.tab === "library") { main.innerHTML = COC.ui.renderLibrary(state); bindLibrary(); return; }
    if (state.tab === "data") { main.innerHTML = COC.ui.renderData(); bindData(); return; }

    if (!a) {
      main.innerHTML = '<div class="empty"><div class="big">📥</div>' +
        '<div>Nejdřív přidej vesnici v záložce <b>Přidat</b>.</div></div>';
      return;
    }

    if (state.tab === "overview") main.innerHTML = COC.ui.renderOverview(a);
    else if (state.tab === "now") main.innerHTML = COC.ui.renderNow(a, COC.planner.build(a, strategy()));
    else if (state.tab === "units") { main.innerHTML = COC.ui.renderUnits(a, state.unitFilter); bindUnits(); }
    else if (state.tab === "rush") main.innerHTML = COC.ui.renderRush(a);
    else if (state.tab === "plan") {
      var plan = COC.planner.build(a, strategy());
      main.innerHTML = COC.ui.renderPlan(a, plan);
      bindPlan(a, plan);
    }
    else if (state.tab === "progress") main.innerHTML = COC.ui.renderProgress(a, state.entries[state.active]);
    else if (state.tab === "compare") { main.innerHTML = COC.ui.renderCompare(state.analyses, state.active); bindCompare(); }
  }

  function renderVillageSwitch() {
    var usable = state.analyses.filter(Boolean).length;
    if (usable < 2) return "";
    var h = '<select id="village-select" style="width:auto;min-width:190px">';
    for (var i = 0; i < state.analyses.length; i++) {
      if (!state.analyses[i]) continue;
      h += '<option value="' + i + '"' + (i === state.active ? " selected" : "") + '>' +
        COC.ui.esc(state.entries[i].label) + " — TH" + state.analyses[i].th + '</option>';
    }
    h += '</select>';
    return h;
  }

  /* ---------- obrazovka přidání ---------- */

  function renderAdd() {
    var target = state.updatingId ? COC.library.get(state.updatingId) : null;

    var h = '<div class="card"><h2>' + (target ? "Aktualizovat vesnici" : "Přidat vesnici") + '</h2>';
    if (target) {
      h += '<div class="note info">Aktualizuješ <b>' + COC.ui.esc(target.label) + '</b>' +
        (target.tag && target.tag !== target.label ? ' (' + COC.ui.esc(target.tag) + ')' : '') +
        ' — poslední data ' + COC.ui.esc(COC.ui.whenText(target.updatedAt || target.addedAt)) +
        '. Nahraj nový export téže vesnice; přepíše se a uvidíš, co se změnilo.</div>';
    } else {
      h += '<div class="sub">Vesnice se uloží do knihovny v prohlížeči — můžeš jich mít kolik chceš ' +
        'a přepínat mezi nimi. Vesnice se stejným tagem se aktualizuje místo přidání.</div>';
    }

    h += '<div class="drop" id="drop"><strong>Přetáhni sem .json soubor</strong>' +
      'nebo <button id="btn-file" class="ghost" style="margin-top:8px">vyber soubor</button>' +
      '<input type="file" id="file" accept=".json,application/json" class="hide" multiple></div>';

    h += '<h3>Nebo vlož JSON</h3>' +
      '<textarea id="json-input" spellcheck="false" placeholder=\'Export z herního klienta nebo odpověď z /players/{tag}\'></textarea>' +
      '<div id="input-error" class="hide"></div>' +
      '<div class="row" style="margin-top:12px">' +
      '<button id="btn-load" class="primary">' + (target ? "Aktualizovat" : "Přidat do knihovny") + '</button>' +
      '<button id="btn-clear" class="ghost">Vymazat pole</button>' +
      (target ? '<button id="btn-cancel-update" class="ghost">Zrušit aktualizaci</button>' : '');

    if (!target) {
      var samples = COC.samples.list;
      h += '<span class="small muted" style="margin-left:8px">Ukázka:</span>';
      for (var i = 0; i < samples.length; i++) {
        h += '<button class="ghost" data-sample="' + samples[i].id + '">' + COC.ui.esc(samples[i].label) + '</button>';
      }
    }
    h += '</div>';

    if (state.message) {
      h += '<div class="note ' + state.message.level + '" style="margin-top:14px">' + COC.ui.esc(state.message.text) + '</div>';
    }
    if (state.warnings.length) {
      h += '<h3>Poznámky k datům</h3>';
      for (var w = 0; w < state.warnings.length; w++) {
        h += '<div class="note warn">' + COC.ui.esc(state.warnings[w]) + '</div>';
      }
    }
    h += '</div>';

    h += COC.ui.renderFormatHelp();
    return h;
  }

  function showError(msg) {
    var box = $("#input-error");
    if (!box) return;
    if (!msg) { box.className = "hide"; box.textContent = ""; return; }
    box.className = "note bad";
    box.textContent = msg;
  }

  /* ---------- přidávání dat ---------- */

  function addFromText(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      showError("JSON se nepodařilo načíst: " + err.message);
      return false;
    }
    return addFromObject(data);
  }

  function addFromObject(data) {
    state.warnings = [];
    var target = state.updatingId ? COC.library.get(state.updatingId) : null;
    var targetTag = target ? target.tag : null;

    var res = COC.library.addRaw(data);
    if (res.error) { showError(res.error); return false; }
    showError("");

    state.warnings = res.warnings || [];
    reload();

    // Po aktualizaci zůstaneme u té vesnice, jinak skočíme na naposledy přidanou.
    var focusId = target ? target.id : (state.entries.length ? state.entries[state.entries.length - 1].id : null);
    for (var i = 0; i < state.entries.length; i++) {
      if (state.entries[i].id === focusId) { setActive(i); break; }
    }

    if (targetTag && res.added) {
      state.warnings.push("Nahraná data mají jiný tag než „" + target.label + "“, takže se přidala jako nová vesnice.");
    }

    var parts = [];
    if (res.added) parts.push("přidáno " + res.added);
    if (res.updated) parts.push("aktualizováno " + res.updated);
    if (res.unchanged) parts.push("beze změny " + res.unchanged);
    state.message = {
      level: res.unchanged && !res.added && !res.updated ? "info" : "good",
      text: res.unchanged && !res.added && !res.updated
        ? "Data jsou stejná jako naposledy — v historii se nic nezaložilo."
        : "Hotovo — " + parts.join(", ") + ". V knihovně máš " + COC.library.count() + " vesnic."
    };

    var wasUpdate = !!target;
    state.updatingId = null;
    setTab(res.updated && wasUpdate ? "progress" : ((res.added || res.updated) ? "now" : "add"));
    return true;
  }

  function bindAdd() {
    var ta = $("#json-input");

    $("#btn-load").addEventListener("click", function () {
      var text = ta.value.trim();
      if (!text) { showError("Nejdřív vlož JSON nebo nahraj soubor."); return; }
      addFromText(text);
    });

    $("#btn-clear").addEventListener("click", function () {
      ta.value = "";
      showError("");
    });

    var cancel = $("#btn-cancel-update");
    if (cancel) cancel.addEventListener("click", function () {
      state.updatingId = null;
      setTab("library");
    });

    $$("[data-sample]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = COC.samples.byId(b.getAttribute("data-sample"));
        if (s) addFromObject(s.data);
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

  /* Každý nahraný soubor se přidá jako samostatná vesnice. */
  function readFiles(files) {
    if (!files || !files.length) return;
    var pending = files.length;
    var objects = [];
    var bad = 0;

    Array.prototype.forEach.call(files, function (f) {
      var reader = new FileReader();
      reader.onload = function () {
        try { objects.push(JSON.parse(String(reader.result))); }
        catch (e) { bad++; }
        if (--pending === 0) done();
      };
      reader.onerror = function () { bad++; if (--pending === 0) done(); };
      reader.readAsText(f);
    });

    function done() {
      if (!objects.length) {
        showError(bad ? "Žádný z " + bad + " souborů nebyl platný JSON." : "Soubory se nepodařilo přečíst.");
        return;
      }
      var merged = [];
      for (var i = 0; i < objects.length; i++) {
        if (Object.prototype.toString.call(objects[i]) === "[object Array]") merged = merged.concat(objects[i]);
        else merged.push(objects[i]);
      }
      addFromObject(merged.length === 1 ? merged[0] : merged);
      if (bad) state.warnings.push(bad + " souborů nebylo platným JSONem a přeskočilo se.");
    }
  }

  /* ---------- knihovna ---------- */

  function bindLibrary() {
    $$("[data-open]").forEach(function (b) {
      b.addEventListener("click", function () {
        setActive(Number(b.getAttribute("data-open")));
        setTab("overview");
      });
    });

    $$("[data-rename]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-rename");
        var entry = COC.library.get(id);
        var name = global.prompt("Nový název vesnice:", entry ? entry.label : "");
        if (name === null) return;
        COC.library.rename(id, name);
        reload();
        render();
      });
    });

    $$("[data-delete]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-delete");
        var entry = COC.library.get(id);
        if (!global.confirm("Opravdu smazat „" + (entry ? entry.label : "") + "“?")) return;
        COC.library.remove(id);
        reload();
        render();
      });
    });

    var clearAll = $("#btn-clear-library");
    if (clearAll) clearAll.addEventListener("click", function () {
      if (!global.confirm("Smazat všech " + COC.library.count() + " vesnic z knihovny?")) return;
      COC.library.clear();
      reload();
      render();
    });

    $$("[data-update]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.updatingId = b.getAttribute("data-update");
        state.message = null;
        setTab("add");
      });
    });

    var addBtn = $("#btn-go-add");
    if (addBtn) addBtn.addEventListener("click", function () {
      state.updatingId = null;
      setTab("add");
    });
  }

  /* ---------- ostatní obrazovky ---------- */

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
        setActive(Number(row.getAttribute("data-village")));
        setTab("overview");
      });
    });
  }

  /* Uložení souboru. Hostitelské prostředí (claude.ai artefakt) stahování
     zprostředkovává vlastním API; při běhu z disku se použije odkaz na blob. */
  function saveTextFile(filename, text, btn) {
    function say(msg) {
      if (!btn) return;
      var orig = btn.textContent;
      btn.textContent = msg;
      setTimeout(function () { btn.textContent = orig; }, 2500);
    }

    function viaBlob() {
      var url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
      var link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    var api = global.claude;
    if (!api || typeof api.use !== "function") { viaBlob(); return; }

    api.use("downloads").then(function (downloads) {
      if (!downloads) { viaBlob(); return; }
      return downloads.save({ filename: filename, data: text }).then(function () {
        say("✔ Uloženo");
      }, function (err) {
        if (err && err.code === "declined") return;
        say("Uložení se nepovedlo");
      });
    }, function () { viaBlob(); });
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
      var name = "plan-" + (a.village.libraryLabel || a.village.name || "vesnice").replace(/[^\w\-]+/g, "_") +
        "-" + plan.strategy.id + ".md";
      saveTextFile(name, COC.ui.planToMarkdown(a, plan), exp);
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
        recomputeAnalyses();
        msg.textContent = "Uloženo a přepočítáno.";
        msg.style.color = "var(--good)";
      } catch (e) {
        msg.textContent = "Neplatný JSON: " + e.message;
        msg.style.color = "var(--bad)";
      }
    });

    $("#btn-reset-override").addEventListener("click", function () {
      COC.caps.resetOverrides();
      recomputeAnalyses();
      render();
    });

    $("#btn-reset-learned").addEventListener("click", function () {
      COC.caps.resetLearned();
      recomputeAnalyses();
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
        setActive(Number(e.target.value));
        render();
      }
    });

    COC.library.migrateLegacy();
    reload();

    // S jednou vesnicí není co vybírat, rovnou do přehledu.
    var usable = state.analyses.filter(Boolean).length;
    setTab(usable === 0 ? "add" : (usable === 1 ? "now" : "library"));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  COC.state = state;
})(window);
