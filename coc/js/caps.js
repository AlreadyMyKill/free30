/* =========================================================================
 * caps.js — kolik může být daná položka maximálně na daném Town Hallu
 *
 * Zdroje stropu (v tomhle pořadí priority):
 *   1) override — ruční tabulka od uživatele (záložka "Data")
 *   2) catalog  — vygenerovaná herní data (přesné, včetně cen a časů)
 *   3) hero     — záložní zabudovaná tabulka hrdinů
 *   4) learned  — naučeno z importovaných vesnic (pozorovaná maxima)
 *   5) estimate — odhad z maxLevel a podílu dostupného na daném TH
 *
 * Body 3–5 se uplatní jen u položek, které v herních datech nejsou
 * (typicky když Supercell přidá něco nového dřív, než se aktualizuje balík).
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};
  var D = global.COC_DATA;

  var LS_LEARNED = "coc-planner-learned-v1";
  var LS_OVERRIDE = "coc-planner-override-v1";

  var learned = load(LS_LEARNED) || {};    // { jméno: { th: pozorované maximum } }
  var overrides = load(LS_OVERRIDE) || {}; // { jméno: [th1..thN] } nebo { jméno: { th: strop } }

  function load(key) {
    try {
      var raw = global.localStorage && global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function save(key, value) {
    try {
      if (global.localStorage) global.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* soukromý režim prohlížeče – prostě neukládáme */ }
  }

  function overrideCap(name, hall) {
    var row = overrides[name];
    if (!row) return null;
    if (Object.prototype.toString.call(row) === "[object Array]") {
      var v = row[hall - 1];
      return typeof v === "number" && v > 0 ? v : null;
    }
    var best = null;
    for (var key in row) {
      if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
      var k = Number(key);
      if (k <= hall && (best === null || k > best)) best = k;
    }
    return best === null ? null : Number(row[String(best)]) || null;
  }

  function learnedCap(name, hall) {
    var row = learned[name];
    if (!row) return null;
    var best = null;
    for (var key in row) {
      if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
      if (Number(key) <= hall) {
        var val = Number(row[key]);
        if (best === null || val > best) best = val;
      }
    }
    return best;
  }

  function mk(cap, source, confident) {
    return { cap: Math.max(0, Math.round(cap || 0)), source: source, confident: !!confident };
  }

  /* Hlavní funkce.
     `unit` = normalizovaná položka, `hall` = úroveň TH (u builder base BH). */
  function capFor(unit, hall) {
    var ov = overrideCap(unit.name, hall);
    if (ov) return mk(ov, "override", true);

    if (unit.dataId && COC.catalog.available) {
      var exact = COC.catalog.capAtHall(unit.dataId, hall);
      if (exact !== null) return mk(exact, "catalog", true);
    }

    if (unit.category === "hero") {
      var hc = D.heroCap(unit.name, hall);
      if (hc) return mk(unit.maxLevel ? Math.min(hc, unit.maxLevel) : hc, "hero", true);
    }

    var lc = learnedCap(unit.name, hall);
    var est = estimate(unit, hall);
    if (lc && lc >= est) return mk(lc, "learned", true);
    return mk(est, "estimate", false);
  }

  function estimate(unit, hall) {
    var globalMax = unit.maxLevel || 0;
    if (!globalMax) return unit.level || 0;

    if (unit.category === "hero") {
      var hc = D.heroCap(unit.name, hall);
      if (hc) return Math.min(hc, globalMax);
    }

    var unlock = D.unlockTH(unit.name, unit.category);
    if (unlock && hall < unlock) return unit.level || 0;

    var est = Math.round(globalMax * D.fractionSinceUnlock(hall, unlock));
    if (est > globalMax) est = globalMax;
    if (est < unit.level) est = unit.level;
    if (est < 1 && unit.level > 0) est = unit.level;
    return est;
  }

  /* Naučí se stropy z pozorovaných vesnic: hráč na TH t s jednotkou na
     úrovni L dokazuje, že strop na TH t je aspoň L. */
  function learnFrom(villages) {
    var added = 0;
    for (var i = 0; i < villages.length; i++) {
      var v = villages[i];
      var th = v.th;
      if (!th) continue;
      for (var j = 0; j < v.units.length; j++) {
        var u = v.units[j];
        if (u.isSuper || !u.level) continue;
        if (D.isBuilderCategory(u.category)) continue;   // builder base má vlastní hall
        var row = learned[u.name] || (learned[u.name] = {});
        var key = String(th);
        if (!row[key] || row[key] < u.level) { row[key] = u.level; added++; }
      }
    }
    if (added) save(LS_LEARNED, learned);
    return added;
  }

  function setOverrides(obj) {
    overrides = obj && typeof obj === "object" ? obj : {};
    save(LS_OVERRIDE, overrides);
  }

  COC.caps = {
    capFor: capFor,
    learnFrom: learnFrom,
    setOverrides: setOverrides,
    getOverrides: function () { return overrides; },
    getLearned: function () { return learned; },
    resetLearned: function () { learned = {}; save(LS_LEARNED, learned); },
    resetOverrides: function () { overrides = {}; save(LS_OVERRIDE, overrides); }
  };
})(window);
