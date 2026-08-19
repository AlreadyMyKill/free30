/* =========================================================================
 * library.js — knihovna uložených vesnic
 *
 * Vesnice se ukládají do localStorage v syrové podobě (tak, jak přišly),
 * takže se dají kdykoliv znovu rozparsovat novější verzí aplikace.
 * Klíčem je vlastní id; tag slouží k rozpoznání, že jde o aktualizaci
 * už uložené vesnice.
 *
 * U každé vesnice se navíc drží historie: při každé aktualizaci se uloží
 * kompaktní otisk úrovní (jen čísla, ne celý JSON), ze kterého se pak dá
 * spočítat, co přesně se od minule posunulo.
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};
  var LS_KEY = "coc-planner-library-v1";
  var MAX_SNAPSHOTS = 12;
  var LS_ACTIVE = "coc-planner-active-v1";
  var LS_LEGACY = "coc-planner-last-json-v1";

  var entries = load();

  function load() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(LS_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return Object.prototype.toString.call(parsed) === "[object Array]" ? parsed : [];
    } catch (e) { return []; }
  }

  function persist() {
    try {
      global.localStorage.setItem(LS_KEY, JSON.stringify(entries));
      return { ok: true };
    } catch (e) {
      // Typicky QuotaExceededError — localStorage má kolem 5 MB.
      return { ok: false, error: "Úložiště prohlížeče je plné. Smaž některé vesnice a zkus to znovu." };
    }
  }

  /* Kompaktní otisk vesnice: klíč -> [součet úrovní, počet kusů].
     Klíčem je herní dataId (číslo), u položek mimo herní data jméno. */
  function snapshotOf(village, analysis) {
    var levels = {};
    for (var i = 0; i < village.units.length; i++) {
      var u = village.units[i];
      if (u.isSuper) continue;
      var key = u.dataId ? String(u.dataId) : u.name;
      levels[key] = [u.level, u.count || 1];
    }
    return {
      at: Date.now(),
      th: village.th || 0,
      bh: village.bh || 0,
      levels: levels,
      summary: analysis ? {
        heroes: Math.round(analysis.heroes.pct),
        lab: Math.round(analysis.labPct),
        defence: analysis.hasDefenceData ? Math.round(analysis.defence.pct) : null,
        foundation: analysis.rush.known ? Math.round(analysis.rush.foundationPct) : null,
        progress: Math.round(analysis.thProgressPct),
        war: Math.round(analysis.war.score)
      } : null
    };
  }

  function sameLevels(a, b) {
    if (!a || !b) return false;
    var ka = Object.keys(a.levels), kb = Object.keys(b.levels);
    if (ka.length !== kb.length) return false;
    if (a.th !== b.th || a.bh !== b.bh) return false;
    for (var i = 0; i < ka.length; i++) {
      var x = a.levels[ka[i]], y = b.levels[ka[i]];
      if (!y || x[0] !== y[0] || x[1] !== y[1]) return false;
    }
    return true;
  }

  function nameForKey(key) {
    if (/^\d+$/.test(key)) {
      var n = COC.catalog.nameOf(Number(key));
      if (n) return n;
      return "Neznámé #" + key;
    }
    return key;
  }

  function categoryForKey(key) {
    if (/^\d+$/.test(key)) {
      var it = COC.catalog.item(Number(key));
      if (it) return it.c;
    }
    return "other";
  }

  /* Porovná dva otisky a vrátí, co se mezi nimi změnilo. */
  function diffSnapshots(older, newer) {
    if (!older || !newer) return null;
    var items = [];
    var built = [];

    for (var key in newer.levels) {
      if (!Object.prototype.hasOwnProperty.call(newer.levels, key)) continue;
      var to = newer.levels[key];
      var from = older.levels[key] || [0, 0];
      var dLevel = to[0] - from[0];
      var dCount = to[1] - from[1];
      if (!dLevel && !dCount) continue;
      var row = {
        key: key,
        name: nameForKey(key),
        category: categoryForKey(key),
        fromLevel: from[0], toLevel: to[0], deltaLevel: dLevel,
        fromCount: from[1], toCount: to[1], deltaCount: dCount
      };
      // Přistavěný kus se počítá i tehdy, když už nějaký kus toho typu stál.
      if (dCount > 0) built.push(row);
      items.push(row);
    }

    items.sort(function (a, b) { return b.deltaLevel - a.deltaLevel; });

    var gained = 0;
    for (var i = 0; i < items.length; i++) if (items[i].deltaLevel > 0) gained += items[i].deltaLevel;

    return {
      from: older, to: newer,
      days: Math.max(0, Math.round((newer.at - older.at) / 86400000)),
      items: items,
      built: built,
      gainedLevels: gained,
      thUp: newer.th - older.th,
      bhUp: newer.bh - older.bh,
      summaryDelta: (older.summary && newer.summary) ? {
        heroes: newer.summary.heroes - older.summary.heroes,
        lab: newer.summary.lab - older.summary.lab,
        defence: (newer.summary.defence !== null && older.summary.defence !== null)
          ? newer.summary.defence - older.summary.defence : null,
        foundation: (newer.summary.foundation !== null && older.summary.foundation !== null)
          ? newer.summary.foundation - older.summary.foundation : null,
        progress: newer.summary.progress - older.summary.progress,
        war: newer.summary.war - older.summary.war
      } : null
    };
  }

  /* Poslední změna u dané vesnice (nejnovější dva otisky). */
  function latestDiff(id) {
    var e = get(id);
    if (!e || !e.snapshots || e.snapshots.length < 2) return null;
    return diffSnapshots(e.snapshots[e.snapshots.length - 2], e.snapshots[e.snapshots.length - 1]);
  }

  /* Změna od úplně prvního otisku. */
  function totalDiff(id) {
    var e = get(id);
    if (!e || !e.snapshots || e.snapshots.length < 2) return null;
    return diffSnapshots(e.snapshots[0], e.snapshots[e.snapshots.length - 1]);
  }

  function newId() {
    return "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function labelFor(village, index) {
    if (village.name && village.name !== "Moje vesnice" && village.name !== "Neznámý hráč") return village.name;
    if (village.tag) return village.tag;
    return "Vesnice " + (index + 1);
  }

  /* Přidá jednu nebo víc vesnic ze syrového JSON objektu.
     Vrací { added, updated, error } — vesnice se stejným tagem se aktualizuje. */
  function addRaw(rawObject) {
    var parsed;
    try {
      parsed = COC.parse.fromObject(rawObject);
    } catch (err) {
      return { added: 0, updated: 0, unchanged: 0, error: err.message, warnings: [] };
    }

    var list = Object.prototype.toString.call(rawObject) === "[object Array]"
      ? rawObject
      : (rawObject && Object.prototype.toString.call(rawObject.items) === "[object Array]"
        ? rawObject.items
        : [rawObject]);

    var added = 0, updated = 0, unchanged = 0;

    for (var i = 0; i < parsed.villages.length; i++) {
      var v = parsed.villages[i];
      var analysis = null;
      try { analysis = COC.analyze.analyze(v); } catch (e) { /* otisk bude bez souhrnu */ }
      var snap = snapshotOf(v, analysis);
      // Syrová data téhle vesnice — parser zachovává pořadí vstupu.
      var raw = v.raw || list[i];
      var entry = {
        id: newId(),
        label: labelFor(v, entries.length + added),
        tag: v.tag || "",
        th: v.th || 0,
        bh: v.bh || 0,
        format: v.format,
        addedAt: Date.now(),
        updatedAt: Date.now(),
        raw: raw,
        snapshots: [snap]
      };

      var existing = v.tag ? findByTag(v.tag) : null;
      if (existing) {
        var history = existing.snapshots || [];
        var last = history[history.length - 1];

        // Stejná data podruhé nezakládají nový otisk — jen se posune čas.
        if (sameLevels(last, snap)) {
          existing.updatedAt = Date.now();
          existing.raw = raw;
          unchanged++;
        } else {
          history = history.concat([snap]);
          if (history.length > MAX_SNAPSHOTS) history = history.slice(history.length - MAX_SNAPSHOTS);
          entry.snapshots = history;
          entry.id = existing.id;
          entry.label = existing.label;
          entry.addedAt = existing.addedAt;
          entries[entries.indexOf(existing)] = entry;
          updated++;
        }
      } else {
        entries.push(entry);
        added++;
      }
    }

    var saved = persist();
    if (!saved.ok) {
      // Vrátíme knihovnu do stavu před uložením, ať UI neukazuje něco, co se neuložilo.
      entries = load();
      return { added: 0, updated: 0, unchanged: 0, error: saved.error, warnings: parsed.warnings };
    }
    return { added: added, updated: updated, unchanged: unchanged, error: null, warnings: parsed.warnings };
  }

  function findByTag(tag) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].tag && entries[i].tag === tag) return entries[i];
    }
    return null;
  }

  function get(id) {
    for (var i = 0; i < entries.length; i++) if (entries[i].id === id) return entries[i];
    return null;
  }

  function remove(id) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === id) { entries.splice(i, 1); break; }
    }
    persist();
    if (activeId() === id) setActive(entries.length ? entries[0].id : null);
  }

  function rename(id, label) {
    var e = get(id);
    if (!e) return;
    e.label = String(label || "").trim() || e.tag || "Vesnice";
    e.updatedAt = Date.now();
    persist();
  }

  function clear() {
    entries = [];
    persist();
    setActive(null);
  }

  function all() { return entries.slice(); }
  function count() { return entries.length; }

  function activeId() {
    try { return global.localStorage.getItem(LS_ACTIVE) || null; }
    catch (e) { return null; }
  }

  function setActive(id) {
    try {
      if (id) global.localStorage.setItem(LS_ACTIVE, id);
      else global.localStorage.removeItem(LS_ACTIVE);
    } catch (e) { /* ignore */ }
  }

  /* Přenese vesnici uloženou starší verzí aplikace do knihovny. */
  function migrateLegacy() {
    var raw;
    try { raw = global.localStorage.getItem(LS_LEGACY); } catch (e) { return 0; }
    if (!raw) return 0;
    var moved = 0;
    try {
      var res = addRaw(JSON.parse(raw));
      moved = res.added + res.updated;
    } catch (e) { /* nevadí, prostě se nepřenese */ }
    try { global.localStorage.removeItem(LS_LEGACY); } catch (e) { /* ignore */ }
    return moved;
  }

  /* Odhad zabraného místa, ať uživatel ví, na čem je. */
  function storageBytes() {
    try { return JSON.stringify(entries).length; } catch (e) { return 0; }
  }

  COC.library = {
    addRaw: addRaw,
    all: all,
    get: get,
    count: count,
    remove: remove,
    rename: rename,
    clear: clear,
    findByTag: findByTag,
    activeId: activeId,
    setActive: setActive,
    migrateLegacy: migrateLegacy,
    storageBytes: storageBytes,
    latestDiff: latestDiff,
    totalDiff: totalDiff,
    diffSnapshots: diffSnapshots,
    snapshotOf: snapshotOf
  };
})(window);
