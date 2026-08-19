/* =========================================================================
 * strategies.js — způsoby hraní a jejich priority
 *
 * Každá strategie říká plánovači tři věci:
 *   1) categoryWeights – co je pro ni důležité (hrdinové vs. obrana vs. lab)
 *   2) roleKey         – podle jaké role se váží jednotlivé jednotky
 *   3) thUp            – kdy je podle ní vesnice připravená na další Town Hall
 * ========================================================================= */
(function (global) {
  "use strict";

  var COC = global.COC = global.COC || {};

  var STRATEGIES = [
    {
      id: "strategic-rush",
      name: "Strategický rush",
      tagline: "Rychle nahoru, ale ne slepě",
      color: "#ff8a3d",
      desc: "Ženeš se na vyšší Town Hall kvůli lepší kořisti a novým jednotkám, " +
            "ale držíš tři věci na úrovni: hrdiny, klíčová vojska a ekonomiku. " +
            "Obranu a zdi vědomě odkládáš na později.",
      roleKey: "meta",
      foundationBonus: 0.6,
      categoryWeights: {
        hero: 1.00, equipment: 0.70, pet: 0.75,
        elixirTroop: 0.75, darkTroop: 0.75, spell: 0.70, darkSpell: 0.55,
        siege: 0.45, defense: 0.15, wall: 0.05,
        trap: 0.10, resource: 0.85, army: 0.80, other: 0.20, helper: 0.60
      },
      thUp: { heroPct: 55, labPct: 40, foundationPct: 35 },
      rules: [
        "Hrdiny nikdy nenech stát — když je nemůžeš upgradovat, jdi jinam, ale vrať se hned.",
        "Laboratoř drž pořád zapnutou; nedodělané vojsko je hlavní důvod, proč rush selhává.",
        "Nejdřív skladiště, sběrače a Clan Castle — bez ekonomiky nemáš z rushe nic.",
        "Obranu řeš až po dosažení cílového TH; do té doby počítej s tím, že tě budou drtit.",
        "Klidně dej TH nahoru s nedodělanou obranou, ale NIKDY s hrdiny na nule."
      ]
    },
    {
      id: "max",
      name: "Max base (perfekcionista)",
      tagline: "Nic nezůstane pozadu",
      color: "#4dd18a",
      desc: "Než jdeš na další Town Hall, je hotové úplně všechno — obrana, zdi, " +
            "laboratoř i hrdinové. Nejpomalejší cesta, ale nejsilnější vesnice " +
            "ve válce i v ligách a nikdy nedoháníš staré dluhy.",
      roleKey: "meta",
      foundationBonus: 1.0,
      categoryWeights: {
        hero: 1.00, equipment: 0.85, pet: 0.90,
        elixirTroop: 0.90, darkTroop: 0.90, spell: 0.85, darkSpell: 0.80,
        siege: 0.75, defense: 0.95, wall: 0.80,
        trap: 0.85, resource: 0.85, army: 0.90, other: 0.60, helper: 0.70
      },
      thUp: { heroPct: 100, labPct: 100, foundationPct: 100 },
      rules: [
        "Town Hall nahoru až ve chvíli, kdy nezbývá jediný upgrade.",
        "Zdi ber jako plnohodnotný cíl, ne jako zbytkový elixír.",
        "Jeden builder ať jede pořád na obraně, ostatní na tom, co je nejvíc pozadu.",
        "Laboratoř nesmí nikdy stát — je to nejužší hrdlo maxování."
      ]
    },
    {
      id: "balanced",
      name: "Vyvážený postup",
      tagline: "Doporučeno pro většinu hráčů",
      color: "#4da3ff",
      desc: "Zlatá střední cesta: hrdinové a laboratoř mají přednost, obrana jde " +
            "hned za nimi a na další TH jdeš, když je vesnice zhruba z 85–90 % hotová. " +
            "Postupuješ svižně a přitom nejsi rushnutý.",
      roleKey: "meta",
      foundationBonus: 0.85,
      categoryWeights: {
        hero: 1.00, equipment: 0.80, pet: 0.85,
        elixirTroop: 0.85, darkTroop: 0.85, spell: 0.80, darkSpell: 0.70,
        siege: 0.65, defense: 0.70, wall: 0.45,
        trap: 0.50, resource: 0.75, army: 0.85, other: 0.35, helper: 0.65
      },
      thUp: { heroPct: 88, labPct: 82, foundationPct: 90 },
      rules: [
        "Pravidlo palce: hrdinové aspoň na 85 % stropu TH, než jdeš nahoru.",
        "Laboratoř má přednost před zdmi vždycky.",
        "Obranu dělej průběžně, ne až na konci — jinak se z toho stane týden nudy.",
        "Zdi jsou ideální na přebytečný elixír, který stejně nemáš kam dát."
      ]
    },
    {
      id: "war",
      name: "Válečník (CWL / war)",
      tagline: "Všechno pro tři hvězdy",
      color: "#c46bff",
      desc: "Cíl je jediný — spolehlivě dělat tři hvězdy ve válce. Hrdinové, " +
            "vybavení, mazlíčci a válečné jádro vojsk mají absolutní přednost, " +
            "obrana je až za nimi. Pozor: hrdinové na upgradu ve válce chybí.",
      roleKey: "war",
      foundationBonus: 0.8,
      categoryWeights: {
        hero: 1.00, equipment: 0.95, pet: 0.95,
        elixirTroop: 0.90, darkTroop: 0.90, spell: 0.90, darkSpell: 0.75,
        siege: 0.85, defense: 0.40, wall: 0.20,
        trap: 0.35, resource: 0.60, army: 0.90, other: 0.25, helper: 0.60
      },
      thUp: { heroPct: 92, labPct: 85, foundationPct: 80 },
      rules: [
        "Nikdy nedávej hrdinu na upgrade den před CWL — plánuj to na mimosezónu.",
        "Vybavení hrdinů (ruda) je nejlevnější způsob, jak zesílit útok — nezanedbávej ho.",
        "Obléhací stroj musíš mít; bez něj je útok o klasu horší.",
        "Nauč se jednu armádu pořádně a dolaď ji v labu do konce, než začneš další."
      ]
    },
    {
      id: "farm",
      name: "Farmář (ekonomika)",
      tagline: "Kořist především",
      color: "#ffd24d",
      desc: "Priorita je příjem: skladiště, sběrače, doly na temný elixír a levná " +
            "farmovací vojska. Vesnice roste pomaleji do síly, ale nikdy ti " +
            "nedojdou suroviny na nic, co chceš postavit.",
      roleKey: "farm",
      foundationBonus: 0.5,
      categoryWeights: {
        hero: 0.90, equipment: 0.55, pet: 0.50,
        elixirTroop: 0.80, darkTroop: 0.70, spell: 0.55, darkSpell: 0.45,
        siege: 0.25, defense: 0.30, wall: 0.35,
        trap: 0.25, resource: 1.00, army: 0.70, other: 0.30, helper: 0.75
      },
      thUp: { heroPct: 65, labPct: 55, foundationPct: 55 },
      rules: [
        "Skladiště nahoru dřív než cokoliv jiného — bez kapacity přicházíš o kořist.",
        "Archer Queen je nejlepší farmovací nástroj ve hře, drž ji vysoko.",
        "Levné armády (Goblini, Barch, Sneaky Goblin) šetří víc než rychlé útoky.",
        "Zdi ber jako sklad přebytečných surovin, ne jako prioritu."
      ]
    },
    {
      id: "push",
      name: "Trophy push / Legend",
      tagline: "Nahoru žebříčkem",
      color: "#61e2ff",
      desc: "Cílem jsou trofeje a Legend League. Potřebuješ silné hrdiny a " +
            "spolehlivou armádu na dvě hvězdy, a zároveň obranu, která ti " +
            "trofeje neubere zpátky.",
      roleKey: "push",
      foundationBonus: 0.7,
      categoryWeights: {
        hero: 1.00, equipment: 0.90, pet: 0.90,
        elixirTroop: 0.85, darkTroop: 0.80, spell: 0.85, darkSpell: 0.65,
        siege: 0.55, defense: 0.75, wall: 0.55,
        trap: 0.70, resource: 0.65, army: 0.80, other: 0.30, helper: 0.60
      },
      thUp: { heroPct: 90, labPct: 80, foundationPct: 85 },
      rules: [
        "Hrdinové jsou v pushi všechno — bez nich se v Legend nedá útočit vůbec.",
        "V Legend League hrdiny na upgrade dávat nemůžeš, plánuj to před vstupem.",
        "Obranu drž nahoře, každá obhájená obrana je čistý zisk trofejí.",
        "Nauč se jeden spolehlivý dvouhvězdičkový útok a opakuj ho."
      ]
    },
    {
      id: "defense",
      name: "Obranář",
      tagline: "Ať se o mě zuby vylámou",
      color: "#ff6b8a",
      desc: "Obrana, zdi a pasti mají přednost. Dává smysl hlavně u vyšších TH " +
            "a v klanech, kde se hraje hodně válek — obhájená obrana je stejně " +
            "cenná jako povedený útok.",
      roleKey: "push",
      foundationBonus: 0.9,
      categoryWeights: {
        hero: 0.80, equipment: 0.55, pet: 0.55,
        elixirTroop: 0.60, darkTroop: 0.60, spell: 0.55, darkSpell: 0.45,
        siege: 0.35, defense: 1.00, wall: 0.85,
        trap: 1.00, resource: 0.55, army: 0.60, other: 0.35, helper: 0.55
      },
      thUp: { heroPct: 80, labPct: 70, foundationPct: 95 },
      rules: [
        "Zdi nejsou kosmetika — u vyšších TH dělají obrovský rozdíl.",
        "Nejdřív to, co střílí do vzduchu i na zem (Tesly, X-Bow, Scattershot).",
        "Pasti a bomby jsou nejlevnější obranná hodnota za surovinu.",
        "Bez slušných hrdinů ale nepůjdeš nahoru v ligách — nenech je úplně vyhnít."
      ]
    }
  ];

  var BY_ID = {};
  for (var i = 0; i < STRATEGIES.length; i++) BY_ID[STRATEGIES[i].id] = STRATEGIES[i];

  COC.strategies = {
    list: STRATEGIES,
    byId: function (id) { return BY_ID[id] || STRATEGIES[2]; },
    defaultId: "balanced"
  };
})(window);
