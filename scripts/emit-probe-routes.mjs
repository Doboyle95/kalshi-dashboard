#!/usr/bin/env node
// Emit dist/_probe-routes.json — the route manifest the autopilot browser probe reads
// instead of the five hardcoded routes and five literal heading strings it carried at
// probe_browser.mjs:36-66.
//
// Why this exists: the probe asserted an exact `expectedHeading` per route against the
// FIRST h1 in DOM order. That is brittle against the ongoing redesign — one page header
// change that adds an h1 fails every route at once and reads as a total site outage.
// Deriving the manifest from the build makes the assertion track the site by construction.
//
// Written once, called twice: by .github/workflows/deploy.yml for the Pages build, and by
// the VM's build_site.py for the self-hosted build, so both hosts probe the same routes.
//
// Emitted from the ACTUAL dist/*.html set, never a hand-maintained list.

import {readdirSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";

const dist = process.argv[2] ?? "dist";
const base = process.argv[3] ?? "/";

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));

// The heading must be scoped to <main>. Framework renders the venue nav into
// <header id="observablehq-header"> ABOVE <main>, so an unscoped "first h1" would start
// matching header markup the moment anything there grows a heading.
function headingOf(html) {
  const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (!m) return null;
  const h = m[1].match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h) return null;
  return decode(h[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim() || null;
}

// Every data file the page references, so the probe can assert
// "observed 200s ⊇ declared files" rather than the weaker "at least 2 responses".
function dataFilesOf(html) {
  const out = new Set();
  for (const m of html.matchAll(/data\/([A-Za-z0-9._-]+\.(?:csv|json))/g)) out.add(m[1]);
  return [...out].sort();
}

const routes = [];
for (const f of readdirSync(dist).filter((f) => f.endsWith(".html")).sort()) {
  const name = f.slice(0, -5);
  const html = readFileSync(join(dist, f), "utf-8");
  const heading = headingOf(html);
  routes.push({
    route: name,
    path: name === "index" ? base : base.replace(/\/$/, "") + "/" + name,
    heading,
    dataFiles: dataFilesOf(html),
  });
}

const missing = routes.filter((r) => !r.heading).map((r) => r.route);
const manifest = {
  schema_version: 1,
  base,
  route_count: routes.length,
  // Named rather than silently dropped: a page with no <h1> in <main> is a real finding,
  // but it must not fail the build — the probe simply skips the heading assertion for it.
  routes_without_heading: missing,
  routes,
};

writeFileSync(join(dist, "_probe-routes.json"), JSON.stringify(manifest, null, 1) + "\n");
console.log(
  `_probe-routes.json: ${routes.length} routes` +
  (missing.length ? `, ${missing.length} without a <main> h1: ${missing.join(", ")}` : "")
);
