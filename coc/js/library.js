/* =========================================================================
 * library.js — knihovna uložených vesnic
 *
 * Vesnice se ukládají do localStorage v syrové podobě (tak, jak přišly),
 * takže se dají kdykoliv znovu rozparsovat novější verzí aplikace.
 * Klíčem je vlastní id; tag slouží k rozpoznání, že jde o aktualizaci
 * už uložené vesnice.
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};
  var LS_KEY = "coc-planner-library-v1";
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
      return { added: 0, updated: 0, error: err.message, warnings: [] };
    }

    var list = Object.prototype.toString.call(rawObject) === "[object Array]"
      ? rawObject
      : (rawObject && Object.prototype.toString.call(rawObject.items) === "[object Array]"
        ? rawObject.items
        : [rawObject]);

    var added = 0, updated = 0;

    for (var i = 0; i < parsed.villages.length; i++) {
      var v = parsed.villages[i];
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
        raw: raw
      };

      var existing = v.tag ? findByTag(v.tag) : null;
      if (existing) {
        entry.id = existing.id;
        entry.label = existing.label;
        entry.addedAt = existing.addedAt;
        entries[entries.indexOf(existing)] = entry;
        updated++;
      } else {
        entries.push(entry);
        added++;
      }
    }

    var saved = persist();
    if (!saved.ok) {
      // Vrátíme knihovnu do stavu před uložením, ať UI neukazuje něco, co se neuložilo.
      entries = load();
      return { added: 0, updated: 0, error: saved.error, warnings: parsed.warnings };
    }
    return { added: added, updated: updated, error: null, warnings: parsed.warnings };
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
    storageBytes: storageBytes
  };
})(window);
