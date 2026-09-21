// Copies embeds/ -- standalone chart pages made for <iframe> embedding, plus the one library
// file they load -- into the built site as dist/embeds/. They are not Framework pages: no site
// chrome, no sitemap entry, noindex. Runs AFTER postprocess-site.mjs, which would otherwise
// demand a canonical URL of each and list it in the sitemap.
//
// Framing needs nothing here: every URL requested with ?embed=... may be framed by any site
// (nginx map on $arg_embed), and the embed codes carry ?embed=chart.
//
// Never fails the build. A page that would break under the site's CSP (a script from another
// origin) or that points at a missing local file is skipped with a warning, and the rest of
// the site still ships.
import {cp, mkdir, readdir, readFile, stat} from "node:fs/promises";
import path from "node:path";

const dist = process.argv[2] || "dist";
const src = path.resolve("embeds");

async function exists(file) {
  try { await stat(file); return true; } catch { return false; }
}

try {
  const entries = await readdir(src, {withFileTypes: true});
  const out = path.join(dist, "embeds");
  await mkdir(out, {recursive: true});
  let copied = 0, skipped = 0;
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    if (entry.isDirectory()) { await cp(from, path.join(out, entry.name), {recursive: true}); continue; }
    if (!entry.name.endsWith(".html")) continue;
    const html = await readFile(from, "utf8");
    const problems = [];
    if (!/<meta name="robots" content="noindex">/.test(html)) problems.push("no noindex meta");
    if (/<script[^>]*\ssrc=["']https?:/i.test(html) || /\bfrom\s*["']https?:/i.test(html)) problems.push("loads a script from another origin (the site CSP blocks it)");
    for (const m of html.matchAll(/\bfrom\s*["'](\.\/[^"']+)["']/g)) {
      if (!await exists(path.join(src, m[1]))) problems.push(`imports missing ${m[1]}`);
    }
    if (problems.length) {
      skipped++;
      console.warn(`copy-embeds: SKIPPED embeds/${entry.name}: ${problems.join("; ")}`);
      continue;
    }
    await cp(from, path.join(out, entry.name));
    copied++;
  }
  console.log(`copy-embeds: ${copied} page(s) -> ${out}${skipped ? `, ${skipped} SKIPPED` : ""}`);
} catch (error) {
  console.warn(`copy-embeds: embeds not shipped this build: ${error.message}`);
}
