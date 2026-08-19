# Clash of Clans — Village Planner

Webová aplikace, která z JSON dat vesnice vytáhne kompletní přehled a navrhne
nejlepší plán postupu podle zvoleného stylu hraní (strategický rush, max base,
válečník, farmář, trophy push, obranář, vyvážený postup).

Běží celá v prohlížeči, bez serveru a bez build kroku. Data se nikam neposílají.

## Jak to otevřít

1. **Jeden soubor** — `coc/standalone.html`. Celá aplikace včetně stylů a skriptů
   v jediném souboru: otevři dvojklikem, pošli mailem, nahraj kamkoliv.
   Funguje i bez internetu (jen se použije systémové písmo místo staženého).
2. **Z repozitáře** — otevři `coc/index.html`. Stejná aplikace rozdělená do modulů,
   vhodná pro úpravy.
3. **GitHub Pages** — v *Settings → Pages* zapni „Deploy from a branch“ (větev `main`,
   složka `/ (root)`). Aplikace pak běží na
   `https://<uživatel>.github.io/<repo>/coc/` a jde přidat na plochu telefonu.

Po každé změně ve zdrojích znovu slož jednosouborovou verzi:

```
node coc/build-standalone.js
```

Vyrobí `coc/standalone.html` (kompletní soubor) a `coc/artifact.html`
(stejný obsah bez `<html>/<head>/<body>` pro publikování jako Artifact).

## Odkud vzít JSON

Aplikace čte odpověď oficiálního Clash of Clans API:

```
GET https://api.clashofclans.com/v1/players/%23TVUJTAG
Authorization: Bearer <API klíč>
```

API klíč se vytváří na [developer.clashofclans.com](https://developer.clashofclans.com)
a je vázaný na IP adresu — proto se nedá volat přímo z prohlížeče a JSON se
vkládá ručně (vložením textu, nahráním souboru nebo přetažením).

Podporované tvary vstupu:

| Vstup | Co s tím appka udělá |
|---|---|
| jeden objekt hráče | analyzuje jednu vesnici |
| pole objektů hráčů | porovnání vesnic + zpřesnění stropů |
| `{ "items": [ ... ] }` | totéž (odpověď typu seznam) |
| víc nahraných souborů naráz | spojí je do jednoho seznamu |

Bez vlastních dat jde použít tlačítko **Ukázka** na úvodní obrazovce.

## Nepovinné rozšíření: budovy

Oficiální API neposílá úrovně budov. Pokud si je do JSONu dopíšeš, zohlední se
v hodnocení obrany, zdí a v kritériích pro přechod na další Town Hall:

```json
"buildings": [
  { "name": "Cannon",       "level": 19, "count": 7,   "maxLevel": 21 },
  { "name": "X-Bow",        "level": 9,  "count": 4,   "maxLevel": 11 },
  { "name": "Inferno Tower","level": 8,  "count": 3,   "maxLevel": 10 },
  { "name": "Wall",         "level": 15, "count": 325, "maxLevel": 16 }
]
```

Zkrácené zápisy fungují taky:

```json
"buildings": { "Cannon": [19, 19, 18], "X-Bow": { "level": 9, "count": 4, "maxLevel": 11 } }
```

## Co aplikace počítá

**Analýza rushe.** Nerushnutá vesnice na TH *N* má hotové všechno, co šlo udělat
na TH *N−1*. Každá jednotka se proto porovnává se dvěma stropy — aktuálním
a „základovým“. Vážený průměr přes kategorie (hrdinové mají největší váhu,
obléhací stroje nejmenší) dává číslo *Základ* a z něj verdikt od „čistá vesnice“
po „extrémně rushnutá“.

**Plán postupu.** Každá zbývající úroveň dostane skóre:

```
skóre = váha kategorie ve strategii
      × (0,5 + 0,5 × role jednotky pro daný styl hraní)
      × podíl chybějících úrovní
      × bonus za dluh z předchozího TH
```

Výsledek se rozdělí do fází (dohnat základ → jádro stylu hraní → dodělávky),
doplní se doporučené pořadí v laboratoři a u hrdinů a kontrolní seznam
„můžeš už jít na další TH?“. Plán jde stáhnout jako Markdown nebo vytisknout do PDF.

## Přesnost herních dat

Supercell mění stropy každým updatem, takže aplikace je stavěná tak, aby na
zabudované tabulce visela co nejmíň:

1. **Hrdinové** mají pevnou tabulku stropů podle TH (`js/gamedata.js`).
2. **Vojska, kouzla, stroje, mazlíčci** se počítají z `maxLevel`, které posílá
   samotné API — to je vždycky aktuální — a z toho, jaká část je na daném TH
   dosažitelná (počítáno od TH, kde se jednotka odemyká).
3. **Naučené stropy:** když načteš víc vesnic naráz (třeba členy klanu),
   aplikace si z nich odvodí reálně pozorovaná maxima a použije je.
4. **Ruční přepis:** v záložce *Data* jde libovolný strop přepsat a uloží se
   do prohlížeče.

Stropy, které jsou jen odhadnuté, jsou v tabulce jednotek označené hvězdičkou.
Jednotky, které na daném TH ještě nejsou odemčené, se do postupu nepočítají.

## Struktura

```
coc/
├── index.html          modulární verze
├── standalone.html     složená jednosouborová verze (generovaná)
├── artifact.html       totéž bez obalu, pro publikování (generovaná)
├── build-standalone.js složí obě generované verze ze zdrojů
├── samples/            ukázkové JSONy k vyzkoušení
├── css/app.css
└── js/
    ├── gamedata.js    stropy hrdinů, odemykání, role jednotek, kategorie
    ├── caps.js        rozhodování o stropu (override → tabulka → naučené → odhad)
    ├── parse.js       normalizace vstupního JSONu
    ├── analyze.js     rozbor vesnice, analýza rushe, válečná připravenost
    ├── strategies.js  definice stylů hraní a jejich priorit
    ├── planner.js     skórování a sestavení plánu
    ├── samples.js     ukázkové vesnice
    ├── ui.js          vykreslování
    └── main.js        stav aplikace a obsluha událostí
```

Data v prohlížeči (`localStorage`): poslední načtený JSON, zvolená strategie,
naučené a ručně přepsané stropy. Nic dalšího se neukládá a nic se neodesílá.
