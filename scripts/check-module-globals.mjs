#!/usr/bin/env node
// Fail the build when a module under src/components/ uses one of Observable
// Framework's implicit globals without importing it.
//
// WHY THIS EXISTS
// `Plot`, `d3`, `Inputs`, `html` and friends are injected by Framework into a
// PAGE's markdown code cells only. An imported ES module gets no such injection,
// so a free `Plot.plot(...)` inside src/components/*.js parses clean, builds
// clean and deploys clean -- then throws "ReferenceError: Plot is not defined"
// the first time a reader opens the page.
//
// The blast radius is the whole page, not one chart. The cell that awaits the
// component import is the one that throws, so every cell downstream of it stays
// unresolved: the page renders its headings, its prose and its <details> caveats
// with no charts, no tables and no visible error.
//
// That is exactly what shipped on 2026-08-21 -- calibration.js missing `Plot`,
// venue-modules.js missing `Plot` and `d3` -- and it blanked every chart on 25
// venue pages for three days. Nothing caught it: `observable build` never
// evaluates a module body, and the browser probe renders 5 of 54 routes, none of
// them affected. A static check is the right shape of alarm for this: it is
// deterministic, it covers every module, and it costs milliseconds.
//
// Run: node scripts/check-module-globals.mjs [dir]

import {readdirSync, readFileSync, existsSync} from "node:fs";
import {join} from "node:path";

const dir = process.argv[2] ?? "src/components";

// The names Framework injects. Derived from the INSTALLED framework's own
// libraries.js (`getImplicitInputImports`) so the list tracks the pinned version
// instead of drifting from a copy, unioned with a floor set that must hold even
// if that file moves -- the cell-runtime builtins live in the runtime, not in
// libraries.js, and are just as undefined inside a module.
const FLOOR = new Set([
  "Plot", "d3", "Inputs", "htl", "html", "svg", "md", "dot", "tex", "mermaid",
  "topojson", "_", "aq", "Arrow", "L", "duckdb", "DuckDBClient", "sql", "echarts",
  "mapboxgl", "vl", "vg", "SQLite", "SQLiteDatabaseClient",
  // Cell-runtime builtins: real inside a page cell, undefined inside a module.
  "display", "view", "width", "now", "invalidation", "visibility", "resize",
  "dark", "FileAttachment", "Generators", "Mutable",
]);

const LIBRARIES = "node_modules/@observablehq/framework/dist/libraries.js";
const implicits = new Set(FLOOR);
let source = "floor set only";
if (existsSync(LIBRARIES)) {
  const lib = readFileSync(LIBRARIES, "utf-8");
  const block = lib.slice(lib.indexOf("function getImplicitInputImports"));
  let n = 0;
  for (const m of block.matchAll(/set\.has\("([^"]+)"\)/g)) {
    if (!implicits.has(m[1])) n++;
    implicits.add(m[1]);
  }
  source = `${LIBRARIES} (+${n} beyond the floor set)`;
}

// Blank out comments and string/template bodies, preserving byte offsets and
// newlines so reported line numbers stay true and so a name mentioned in prose
// or inside a selector string is never mistaken for a reference.
function blankNonCode(src) {
  const out = src.split("");
  const keep = (i) => { if (out[i] !== "\n") out[i] = " "; };
  let i = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") { while (i < src.length && src[i] !== "\n") keep(i++); }
    else if (c === "/" && d === "*") {
      keep(i++); keep(i++);
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) keep(i++);
      keep(i++); keep(i++);
    } else if (c === '"' || c === "'" || c === "`") {
      const q = c; keep(i++);
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") keep(i++);
        // A template's ${...} holds real code; leave it alone.
        else if (q === "`" && src[i] === "$" && src[i + 1] === "{") {
          i += 2;
          for (let depth = 1; i < src.length && depth > 0; i++) {
            if (src[i] === "{") depth++; else if (src[i] === "}") depth--;
          }
          continue;
        }
        keep(i++);
      }
      keep(i++);
    } else i++;
  }
  return out.join("");
}

const IDENT = /[A-Za-z_$][A-Za-z0-9_$]*/g;
const identsIn = (s) => (s.match(IDENT) ?? []);

// Every name bound in the file: imports, declarations, destructuring patterns and
// function parameters. A local that happens to share a Framework name is a shadow,
// not a missing import, so it must not be reported.
function boundNames(code) {
  const bound = new Set();
  const add = (names) => names.forEach((n) => bound.add(n));

  // import ... from "..."  /  import "..."
  for (const m of code.matchAll(/\bimport\s+([^;]*?)\s+from\s/g)) add(identsIn(m[1].replace(/\bas\b/g, " ")));
  // const/let/var, including destructuring, up to the "=" or end of statement
  for (const m of code.matchAll(/\b(?:const|let|var)\s+([^=;\n]+)/g)) add(identsIn(m[1]));
  for (const m of code.matchAll(/\b(?:function|class)\s+([A-Za-z_$][\w$]*)/g)) bound.add(m[1]);
  // catch (e), for (const x of ...) is covered by the const/let/var rule above
  for (const m of code.matchAll(/\bcatch\s*\(([^)]*)\)/g)) add(identsIn(m[1]));
  // Parameter lists: arrow functions, and anything following the `function` keyword.
  for (const m of code.matchAll(/\(([^()]*)\)\s*=>/g)) add(identsIn(m[1]));
  for (const m of code.matchAll(/\bfunction\b[^(]*\(([^()]*)\)/g)) add(identsIn(m[1]));
  // Single-argument arrows without parentheses: `d => ...`
  for (const m of code.matchAll(/([A-Za-z_$][\w$]*)\s*=>/g)) bound.add(m[1]);
  return bound;
}

const files = readdirSync(dir).filter((f) => f.endsWith(".js") || f.endsWith(".mjs")).sort();
const findings = [];

for (const file of files) {
  const path = join(dir, file);
  const code = blankNonCode(readFileSync(path, "utf-8"));
  const bound = boundNames(code);
  for (const name of implicits) {
    if (bound.has(name)) continue;
    // A reference that reaches the global: `Plot.plot(`, `html\``, `width)`, `d3[`.
    const use = new RegExp(`(^|[^\\w$.])${name.replace(/\$/g, "\\$")}\\s*[.(\`\\[]`);
    const line = code.split("\n").findIndex((l) => use.test(l));
    if (line >= 0) findings.push({path, line: line + 1, name});
  }
}

console.log(`check-module-globals: ${files.length} module(s) in ${dir}, ${implicits.size} implicit name(s) from ${source}`);

if (findings.length === 0) {
  console.log("check-module-globals: OK — every Framework global used in a module is imported there.");
  process.exit(0);
}

console.error("\ncheck-module-globals: FAILED — a module uses a Framework implicit global it never imports.");
console.error("Framework injects these into a page's markdown cells only. In an imported module they");
console.error("are undefined, and the throw takes down every cell downstream of the import.\n");
for (const f of findings) console.error(`  ${f.path}:${f.line}  ${f.name} is not defined in this module`);
console.error("\nFix: import it at the top of the module, e.g.");
console.error('  import * as Plot from "npm:@observablehq/plot";');
console.error('  import * as d3 from "npm:d3";');
console.error('  import * as Inputs from "npm:@observablehq/inputs";');
console.error('  import {html} from "npm:htl";');
process.exit(1);
