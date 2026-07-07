30 DNÍ ČISTÁ HLAVA — instalace z telefonu (PWA)

1) Otevři github.com v prohlížeči (přihlas se) a vytvoř nový veřejný repozitář, např. "cista-hlava".
2) V repu klepni na "Add file" → "Upload files" a nahraj VŠECHNY soubory z tohoto zipu
   (index.html, app.js, sw.js, manifest.json, icon-192.png, icon-512.png, apple-touch-icon.png).
   Commitni.
3) Settings → Pages → Source: "Deploy from a branch" → Branch: main, složka "/ (root)" → Save.
4) Za minutu až dvě bude appka na adrese:
   https://TVOJE-JMENO.github.io/cista-hlava/
5) Otevři tu adresu v Chrome na telefonu → menu (⋮) → "Přidat na plochu" / "Instalovat aplikaci".

Hotovo — appka běží na celou obrazovku, funguje offline a data se ukládají v telefonu (localStorage).
Pozn.: Data jsou vázaná na prohlížeč — nemaž data Chromu, jinak přijdeš o počítadlo.
