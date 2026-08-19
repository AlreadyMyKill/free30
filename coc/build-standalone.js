#!/usr/bin/env node
/* =========================================================================
 * build-standalone.js — složí z modulů jeden samostatný HTML soubor
 *
 *   node coc/build-standalone.js
 *
 * Vyrobí:
 *   coc/standalone.html   celý soubor včetně <!doctype> — dá se poslat mailem,
 *                         otevřít dvojklikem, nahrát kamkoliv
 *   coc/artifact.html     totéž bez <html>/<head>/<body> — pro publikování
 *                         jako Artifact (ten si obal doplní sám)
 * ========================================================================= */
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = __dirname;
var SCRIPTS = [
  "js/gamedata-generated.js", "js/gamedata.js", "js/catalog.js", "js/caps.js",
  "js/parse.js", "js/analyze.js", "js/strategies.js", "js/planner.js",
  "js/samples.js", "js/ui.js", "js/main.js"
];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }

var css = read("css/app.css");
var js = SCRIPTS.map(function (f) {
  return "/* ---------- " + f + " ---------- */\n" + read(f);
}).join("\n");

/* Hlavičkové značky. <title> musí být v prvních kilobajtech souboru. */
var head = [
  '<title>Village Planner</title>',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
  '<link rel="preconnect" href="https://fonts.googleapis.com" />',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" />',
  '<style>\n' + css + '\n</style>'
].join("\n");

/* Vlastní obsah stránky, vytažený z index.html a s vloženými skripty. */
var content = read("index.html")
  .split("<body>")[1].split("</body>")[0]
  .replace(/\n\s*<script src="[^"]*"><\/script>/g, "")
  .trim() + "\n\n<script>\n" + js + "\n</script>";

/* Artifact si <html>/<head>/<body> doplní sám, proto jen hlavička + obsah. */
var body = head + "\n\n" + content;

var full = [
  "<!DOCTYPE html>",
  '<html lang="cs">',
  "<head>",
  '<meta charset="UTF-8" />',
  '<meta name="theme-color" content="#100f0c" />',
  head,
  "</head>",
  "<body>",
  content,
  "</body>",
  "</html>"
].join("\n");

fs.writeFileSync(path.join(ROOT, "standalone.html"), full);
fs.writeFileSync(path.join(ROOT, "artifact.html"), body);

console.log("standalone.html  " + (full.length / 1024).toFixed(1) + " kB");
console.log("artifact.html    " + (body.length / 1024).toFixed(1) + " kB");
