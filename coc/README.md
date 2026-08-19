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
3. **GitHub Pages** — v *Settings → Pages* zapni „Deploy from a branch“ a vyber
   větev (stačí i vývojová, nemusíš mergovat) a složku `/ (root)`. Aplikace pak
   běží na `https://<uživatel>.github.io/<repo>/coc/`.

### Na telefonu (iOS i Android)

Otevři adresu z Pages v prohlížeči a přidej ji na plochu:

* **iPhone / iPad:** Safari → tlačítko *Sdílet* → **Přidat na plochu**.
* **Android:** Chrome → menu ⋮ → **Přidat na plochu** / *Instalovat aplikaci*.

Appka pak má vlastní ikonu, běží na celou obrazovku bez adresního řádku
a díky service workeru funguje i bez signálu. Stahovat HTML soubor do
*Souborů* nemá smysl — iOS ho umí jen zobrazit v náhledu a nahrávání
vlastního JSONu tam nefunguje spolehlivě.

Po každé změně ve zdrojích znovu slož jednosouborovou verzi:

```
node coc/build-standalone.js
```

Vyrobí `coc/standalone.html` (kompletní soubor) a `coc/artifact.html`
(stejný obsah bez `<html>/<head>/<body>` pro publikování jako Artifact).

## Jaká data appka umí

### 1) Export z herního klienta (doporučeno)

Obsahuje **úplně všechno** — budovy, zdi, pasti, Builder Base, rozestavěné
upgrady. Položky jsou v něm číselná `data` ID, která si aplikace přeloží
na jména z herních tabulek:

```json
{ "tag": "#XXXX", "buildings": [ { "data": 1000001, "lvl": 13, "weapon": 1 }, … ],
  "traps": [ … ], "units": [ … ], "heroes": [ … ], "buildings2": [ … ] }
```

Rozpozná se automaticky — stačí ho vložit nebo nahrát. Ukázka je v
`samples/th13-export.json`.

### 2) Oficiální Clash of Clans API

```
GET https://api.clashofclans.com/v1/players/%23TVUJTAG
Authorization: Bearer <API klíč>
```

API klíč se vytváří na [developer.clashofclans.com](https://developer.clashofclans.com)
a je vázaný na IP adresu — proto se nedá volat přímo z prohlížeče a JSON se
vkládá ručně. Tenhle formát **neobsahuje budovy**, takže obrana a zdi se
z něj hodnotit nedají.

Podporované tvary vstupu (u obou formátů):

| Vstup | Co s tím appka udělá |
|---|---|
| jeden objekt | analyzuje jednu vesnici |
| pole objektů | porovnání vesnic |
| `{ "items": [ ... ] }` | totéž (odpověď typu seznam) |
| víc nahraných souborů naráz | spojí je do jednoho seznamu |

Bez vlastních dat jde použít tlačítko **Ukázka** na úvodní obrazovce.

### Nepovinné rozšíření oficiálního formátu: budovy

Pokud používáš API formát a budovy si dopíšeš ručně, zohlední se
v hodnocení obrany, zdí i v kritériích pro přechod na další Town Hall:

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
na TH *N−1*. Každá položka se proto porovnává se dvěma stropy — aktuálním
a „základovým“. U budov se strop násobí počtem kusů, na které máš na daném TH
nárok, takže nepostavená budova vyjde jako chybějící úrovně.

Procenta se počítají jako **vážený průměr přes kategorie**, ne jako podíl
součtu úrovní — jinak by zdi (tisíce úrovní) přebily hrdiny i obranu dohromady.
Hrdinové mají největší váhu, pasti a obléhací stroje nejmenší. Vybavení hrdinů
se do míry rushe nepočítá vůbec: platí se rudou, ne surovinami vesnice, a nedá
se „zameškat“ jako budova. Builder Base se hodnotí zvlášť proti Builder Hallu.

**Plán postupu.** Každá zbývající úroveň dostane skóre:

```
skóre = váha kategorie ve strategii
      × (0,5 + 0,5 × role jednotky pro daný styl hraní)
      × podíl chybějících úrovní
      × bonus za dluh z předchozího TH
```

Výsledek se rozdělí do fází (dohnat základ → jádro stylu hraní → dodělávky),
doplní se doporučené pořadí v laboratoři, u hrdinů a pro stavitele, a kontrolní
seznam „můžeš už jít na další TH?“. U každé položky i u každé fáze je
**skutečná cena a čas** z herních dat. Plán jde stáhnout jako Markdown nebo
vytisknout do PDF.

## Herní data

Stropy podle Town Hallu, počty budov, ceny i časy upgradů se generují
z balíku [`clash-of-clans-data`](https://www.npmjs.com/package/clash-of-clans-data)
do souboru `js/gamedata-generated.js`, který je součástí repozitáře — kdo
appku jen používá, nepotřebuje npm.

Přegenerování po herním updatu:

```
cd coc && npm install && npm run gamedata && npm run build
```

Když Supercell přidá novinku dřív, než se balík aktualizuje, aplikace u ní
sáhne po odhadu a označí ho v tabulce hvězdičkou. Pořadí zdrojů stropu je:
ruční přepis → herní data → naučeno z importovaných vesnic → odhad.
V záložce *Data* jde libovolný strop přepsat; uloží se do prohlížeče.

## Struktura

```
coc/
├── index.html          modulární verze
├── standalone.html     složená jednosouborová verze (generovaná)
├── artifact.html       totéž bez obalu, pro publikování (generovaná)
├── build-standalone.js složí obě generované verze ze zdrojů
├── manifest.json       PWA manifest (ikona a celoobrazovkový režim)
├── sw.js               service worker pro offline režim
├── icon-*.png          ikony aplikace
├── samples/            ukázkové JSONy k vyzkoušení
├── package.json        devDependency s herními daty + npm skripty
├── tools/
│   └── build-gamedata.js  vygeneruje js/gamedata-generated.js
├── css/app.css
└── js/
    ├── gamedata-generated.js  stropy, počty, ceny a časy (generováno)
    ├── gamedata.js    kategorie, role jednotek, záložní tabulky
    ├── catalog.js     přístup k vygenerovaným herním datům
    ├── caps.js        rozhodování o stropu (přepis → data → naučené → odhad)
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
