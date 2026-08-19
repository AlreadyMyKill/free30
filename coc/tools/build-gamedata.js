#!/usr/bin/env node
/* =========================================================================
 * build-gamedata.js — vygeneruje js/gamedata-generated.js
 *
 *   cd coc && npm install && node tools/build-gamedata.js
 *
 * Zdrojem je balík `clash-of-clans-data`, který obsahuje kompletní herní
 * tabulky včetně číselných `dataId` (stejná čísla, jaká používá export
 * z herního klienta) a u každé úrovně i požadovaný Town Hall, cenu a čas.
 *
 * Výstup je jeden soubor, který se commituje — kdo appku jen používá,
 * nepotřebuje npm ani nic instalovat.
 * ========================================================================= */
"use strict";

const fs = require("fs");
const path = require("path");
const D = require("clash-of-clans-data");

const OUT = path.join(__dirname, "..", "js", "gamedata-generated.js");
const RESOURCES = ["Gold", "Elixir", "Dark Elixir", "Gold or Elixir", "Ore", "Shiny Ore", "Glowy Ore", "Starry Ore"];

function resIndex(name) {
  const i = RESOURCES.indexOf(name);
  if (i >= 0) return i;
  RESOURCES.push(name);
  return RESOURCES.length - 1;
}

function seconds(t) {
  if (!t) return 0;
  return (t.days || 0) * 86400 + (t.hours || 0) * 3600 + (t.minutes || 0) * 60 + (t.seconds || 0);
}

function rows(cls) {
  try {
    const arr = new D[cls]().get();
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.warn("  ! " + cls + " se nepodařilo načíst: " + e.message);
    return [];
  }
}

/* --- převodníky bran ----------------------------------------------------
   Některé věci nejsou omezené přímo Town Hallem, ale budovou (Hero Hall,
   Blacksmith, Laboratoř, Pet House, Star Lab). Převedeme to na TH už tady,
   ať s tím appka nemusí počítat za běhu.
----------------------------------------------------------------------- */
function gateTable(cls, hallKey) {
  // vrátí pole, kde index = úroveň budovy, hodnota = nejnižší TH/BH, kde ji lze mít
  const b = rows(cls)[0];
  const out = [];
  if (!b || !Array.isArray(b.levels)) return out;
  for (const l of b.levels) out[l.level] = l[hallKey] || l.townHallRequired || l.builderHallRequired || 1;
  return out;
}

const heroHallTH = gateTable("HomeVillageHeroHall", "townHallRequired");
const blacksmithTH = gateTable("HomeVillageBlacksmith", "townHallRequired");
const labTH = gateTable("HomeVillageLaboratory", "townHallRequired");
const petHouseTH = gateTable("HomeVillagePetHouse", "townHallRequired");

function starLabBH() {
  const b = rows("BuilderBaseArmyBuildings").find((x) => /star lab/i.test(x.name));
  const out = [];
  if (!b || !Array.isArray(b.levels)) return out;
  for (const l of b.levels) out[l.level] = l.builderHallRequired || 1;
  return out;
}
const starLabTable = starLabBH();

function viaTable(table, level) {
  if (!level) return 0;
  const v = table[level];
  return typeof v === "number" ? v : 0;
}

/* Požadovaný Town Hall (nebo Builder Hall) pro jednu úroveň položky. */
function requiredHall(lvl, village) {
  const direct = village === "builder"
    ? (lvl.builderHallRequired || lvl.builderHallLevelRequired || 0)
    : (lvl.townHallRequired || 0);

  const gates = [
    direct,
    viaTable(heroHallTH, lvl.heroHallLevelRequired),
    viaTable(blacksmithTH, lvl.blacksmithLevelRequired),
    viaTable(labTH, lvl.laboratoryRequired),
    viaTable(petHouseTH, lvl.petHouseLevelRequired),
    village === "builder" ? viaTable(starLabTable, lvl.starLabRequired) : 0
  ];
  const max = Math.max.apply(null, gates.filter((n) => typeof n === "number"));
  return max > 0 ? max : 1;
}

function costOf(lvl) {
  if (lvl.buildCost !== undefined) return [lvl.buildCost || 0, resIndex(lvl.buildCostResource || "Gold"), seconds(lvl.buildTime)];
  if (lvl.researchCost !== undefined) return [lvl.researchCost || 0, resIndex(lvl.researchCostResource || "Elixir"), seconds(lvl.researchTime)];
  if (lvl.upgradeCost !== undefined) return [lvl.upgradeCost || 0, resIndex(lvl.upgradeCostResource || "Gold"), seconds(lvl.upgradeTime)];
  return [0, 0, 0];
}

/* --- co všechno vytáhnout ---------------------------------------------- */
const SOURCES = [
  // [třída, kategorie v appce, vesnice]
  ["HomeVillageHeroes", "hero", "home"],
  ["HomeVillageHeroEquipment", "equipment", "home"],
  ["HomeVillagePets", "pet", "home"],
  ["HomeVillageTroops", "troop", "home"],          // rozdělí se podle suroviny
  ["HomeVillageSpells", "spell", "home"],          // dtto
  ["HomeVillageSiegeMachines", "siege", "home"],
  ["HomeVillageDefenses", "defense", "home"],
  ["HomeVillageWalls", "wall", "home"],
  ["HomeVillageTraps", "trap", "home"],
  ["HomeVillageResourceBuildings", "resource", "home"],
  ["HomeVillageArmyBuildings", "army", "home"],
  ["HomeVillageBarracks", "army", "home"],
  ["HomeVillageDarkBarracks", "army", "home"],
  ["HomeVillageSpellFactory", "army", "home"],
  ["HomeVillageDarkSpellFactory", "army", "home"],
  ["HomeVillageWorkshop", "army", "home"],
  ["HomeVillageLaboratory", "army", "home"],
  ["HomeVillageClanCastle", "army", "home"],
  ["HomeVillagePetHouse", "army", "home"],
  ["HomeVillageBlacksmith", "army", "home"],
  ["HomeVillageHeroHall", "army", "home"],
  ["HomeVillageHelperHut", "other", "home"],
  ["HomeVillageOtherBuildings", "other", "home"],
  ["HomeVillageTownHall", "townhall", "home"],
  ["HomeVillageHelpers", "helper", "home"],
  ["HomeVillageGuardians", "other", "home"],

  ["BuilderBaseBuilderHall", "builderHall", "builder"],
  ["BuilderBaseDefenses", "builderDefense", "builder"],
  ["BuilderBaseWalls", "builderWall", "builder"],
  ["BuilderBaseTraps", "builderTrap", "builder"],
  ["BuilderBaseTroops", "builderTroop", "builder"],
  ["BuilderBaseHeroes", "builderHero", "builder"],
  ["BuilderBaseArmyBuildings", "builderArmy", "builder"],
  ["BuilderBaseResourceBuildings", "builderResource", "builder"],
  ["BuilderBaseOtherBuildings", "builderOther", "builder"]
];

/* Vojska a kouzla se dělí na elixírová a temná podle suroviny výzkumu. */
function refineCategory(category, item) {
  if (category !== "troop" && category !== "spell") return category;
  const lvl = (item.levels || []).find((l) => l.researchCostResource) || {};
  const dark = /dark/i.test(lvl.researchCostResource || "");
  if (category === "troop") return dark ? "darkTroop" : "elixirTroop";
  return dark ? "darkSpell" : "spell";
}

const items = {};
let maxTH = 0;
let maxBH = 0;
let skipped = 0;

for (const [cls, category, village] of SOURCES) {
  const list = rows(cls);
  for (const item of list) {
    if (typeof item.dataId !== "number") { skipped++; continue; }
    const levels = Array.isArray(item.levels) ? item.levels : [];
    if (!levels.length) { skipped++; continue; }

    const L = [];
    for (const lvl of levels) {
      const hall = requiredHall(lvl, village);
      const [cost, res, time] = costOf(lvl);
      L[lvl.level - 1] = [hall, cost, res, time];
      if (village === "builder") maxBH = Math.max(maxBH, hall);
      else maxTH = Math.max(maxTH, hall);
    }

    // Počty kusů podle Town Hallu — jen tam, kde se číslo mění.
    let A = null;
    if (Array.isArray(item.availablePerTownHall)) {
      A = [];
      let last = null;
      for (const e of item.availablePerTownHall) {
        const th = e.townHallLevel || e.builderHallLevel;
        const cnt = e.count || 0;
        if (cnt !== last) { A.push([th, cnt]); last = cnt; }
      }
      if (!A.length) A = null;
    }

    const entry = {
      n: item.name,
      c: refineCategory(category, item),
      v: village,
      L: L.filter(Boolean)
    };
    if (A) entry.A = A;

    // Kdyby se dvě sady překrývaly, první zápis vyhrává (pořadí v SOURCES).
    if (!items[item.dataId]) items[item.dataId] = entry;
  }
}

/* Balík nemá package.json v "exports", verzi si přečteme přímo ze souboru. */
function sourceVersion() {
  try {
    const p = path.join(__dirname, "..", "node_modules", "clash-of-clans-data", "package.json");
    return "v" + JSON.parse(fs.readFileSync(p, "utf8")).version;
  } catch (e) {
    return "(neznámá verze)";
  }
}

const payload = {
  source: "clash-of-clans-data " + sourceVersion(),
  generated: new Date().toISOString().slice(0, 10),
  maxTH: maxTH,
  maxBH: maxBH,
  resources: RESOURCES,
  items: items
};

const out =
  "/* Generováno skriptem tools/build-gamedata.js — needituj ručně.\n" +
  " * Zdroj: " + payload.source + ", " + payload.generated + "\n" +
  " * Formát položky: { n: jméno, c: kategorie, v: vesnice,\n" +
  " *   L: [[požadovaný TH, cena, index suroviny, sekundy], ...] (index = úroveň-1),\n" +
  " *   A: [[TH, počet kusů], ...] jen tam, kde se počet mění }\n" +
  " */\n" +
  "window.COC_GAMEDATA = " + JSON.stringify(payload) + ";\n";

fs.writeFileSync(OUT, out);

const counts = {};
for (const id in items) counts[items[id].c] = (counts[items[id].c] || 0) + 1;

console.log("Zapsáno " + path.relative(process.cwd(), OUT) + " — " + (out.length / 1024).toFixed(1) + " kB");
console.log("Položek: " + Object.keys(items).length + " (přeskočeno bez dataId/úrovní: " + skipped + ")");
console.log("maxTH " + maxTH + ", maxBH " + maxBH);
console.log("Podle kategorií: " + Object.keys(counts).sort().map((k) => k + " " + counts[k]).join(", "));
