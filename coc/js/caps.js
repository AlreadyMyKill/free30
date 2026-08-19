/* =========================================================================
 * caps.js — kolik může být daná jednotka maximálně na daném Town Hallu
 *
 * Zdroje stropu (v tomhle pořadí priority):
 *   1) override   – ruční tabulka od uživatele (záložka "Data")
 *   2) hero       – zabudovaná tabulka hrdinů
 *   3) learned    – naučeno z importovaných vesnic (pozorovaná maxima)
 *   4) estimate   – odhad z maxLevel * podíl laboratoře pro daný TH
 *
 * Odhad je vždycky označený jako odhad, aby se s ním v UI dalo pracovat
 * opatrně (a aby analýza rushe věděla, čemu smí věřit).
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};
  var D = global.COC_DATA;

  var LS_LEARNED = "coc-planner-learned-v1";
  var LS_OVERRIDE = "coc-planner-override-v1";

  var learned = load(LS_LEARNED) || {};   // { unitName: { th: maxObservedLevel } }
  var overrides = load(LS_OVERRIDE) || {}; // { unitName: [th1..th17] } nebo { unitName: { th: cap } }

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

  function overrideCap(name, th) {
    var row = overrides[name];
    if (!row) return null;
    if (Object.prototype.toString.call(row) === "[object Array]") {
      // pole indexované od TH1
      var v = row[th - 1];
      return typeof v === "number" && v > 0 ? v : null;
    }
    // objekt { "13": 5 } – bereme nejbližší nižší nebo rovný TH (stropy jsou neklesající)
    var best = null;
    for (var key in row) {
      if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
      var k = Number(key);
      if (k <= th && (best === null || k > best)) best = k;
    }
    return best === null ? null : Number(row[String(best)]) || null;
  }

  function learnedCap(name, th) {
    var row = learned[name];
    if (!row) return null;
    var best = null;
    for (var key in row) {
      if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
      if (Number(key) <= th) {
        var val = Number(row[key]);
        if (best === null || val > best) best = val;
      }
    }
    return best;
  }

  /* Hlavní funkce. `unit` = normalizovaná jednotka z parse.js. */
  function capFor(unit, th) {
    var name = unit.name;
    var globalMax = unit.maxLevel || 0;

    var ov = overrideCap(name, th);
    if (ov) return mk(Math.min(ov, globalMax || ov), "override", true);

    if (unit.category === "hero") {
      var hc = D.heroCap(name, th);
      if (hc) return mk(globalMax ? Math.min(hc, globalMax) : hc, "hero", true);
    }

    var lc = learnedCap(name, th);
    if (lc) {
      // naučená hodnota je spodní odhad – bereme ji, jen když je vyšší než odhad
      var est0 = estimate(unit, th);
      return mk(Math.max(lc, est0), lc >= est0 ? "learned" : "estimate", lc >= est0);
    }

    return mk(estimate(unit, th), "estimate", false);
  }

  function estimate(unit, th) {
    var globalMax = unit.maxLevel || 0;
    if (!globalMax) return unit.level;
    if (unit.category === "hero") {
      var hc = D.heroCap(unit.name, th);
      if (hc) return Math.min(hc, globalMax);
    }

    var unlock = D.unlockTH(unit.name, unit.category);
    if (unlock && th < unlock) return unit.level; // na tomhle TH ještě neexistuje

    var est = Math.round(globalMax * D.fractionSinceUnlock(th, unlock));
    if (est > globalMax) est = globalMax;
    if (est < unit.level) est = unit.level; // hráč nemůže mít víc, než co je možné
    if (est < 1 && unit.level > 0) est = unit.level;
    return est;
  }

  function mk(cap, source, confident) {
    return { cap: Math.max(0, Math.round(cap)), source: source, confident: !!confident };
  }

  /* Naučí se stropy z pozorovaných vesnic: hráč na TH t s jednotkou na levelu L
     dokazuje, že strop na TH t je aspoň L. */
  function learnFrom(villages) {
    var added = 0;
    for (var i = 0; i < villages.length; i++) {
      var v = villages[i];
      if (!v.th) continue;
      for (var j = 0; j < v.units.length; j++) {
        var u = v.units[j];
        if (u.isSuper || u.category === "builder" || !u.level) continue;
        var row = learned[u.name] || (learned[u.name] = {});
        var key = String(v.th);
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

  function getOverrides() { return overrides; }
  function getLearned() { return learned; }

  function resetLearned() { learned = {}; save(LS_LEARNED, learned); }
  function resetOverrides() { overrides = {}; save(LS_OVERRIDE, overrides); }

  COC.caps = {
    capFor: capFor,
    learnFrom: learnFrom,
    setOverrides: setOverrides,
    getOverrides: getOverrides,
    getLearned: getLearned,
    resetLearned: resetLearned,
    resetOverrides: resetOverrides
  };
})(window);
