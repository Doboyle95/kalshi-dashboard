import {readdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const CANONICAL_RE = /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/i;
const DESCRIPTION_RE = /<meta\s+name=["']description["'][^>]+content=["'][^"']+["'][^>]*>/i;

function xml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;"
  })[character]);
}

export function addDocumentLanguage(html) {
  if (/<html\b[^>]*\blang=/i.test(html)) return html;
  const updated = html.replace(/<html(\s[^>]*)?>/i, (_match, attributes = "") => `<html lang="en"${attributes}>`);
  if (updated === html) throw new Error("built page has no <html> element");
  return updated;
}

export function sitemapXml(urls) {
  const unique = [...new Set(urls)].sort();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...unique.map(url => `  <url><loc>${xml(url)}</loc></url>`),
    '</urlset>',
    ''
  ].join("\n");
}

async function htmlFiles(root) {
  const found = [];
  for (const entry of await readdir(root, {withFileTypes: true})) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) found.push(...await htmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) found.push(full);
  }
  return found;
}

export async function postprocessSite(root) {
  const files = await htmlFiles(root);
  if (!files.length) throw new Error(`no built HTML pages found in ${root}`);

  const urls = [];
  for (const file of files) {
    const original = await readFile(file, "utf8");
    const html = addDocumentLanguage(original);
    const canonical = html.match(CANONICAL_RE)?.[1];
    if (!canonical?.startsWith("https://predict-charts.com/")) {
      throw new Error(`${path.relative(root, file)} has no valid Predict Charts canonical URL`);
    }
    if (!DESCRIPTION_RE.test(html)) {
      throw new Error(`${path.relative(root, file)} has no meta description`);
    }
    if (html !== original) await writeFile(file, html, "utf8");
    urls.push(canonical);
  }

  await writeFile(path.join(root, "sitemap.xml"), sitemapXml(urls), "utf8");
  console.log(`postprocess-site: ${files.length} page(s), lang=en, metadata validated, sitemap emitted.`);
  return {pages: files.length, urls: [...new Set(urls)].length};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await postprocessSite(path.resolve(process.argv[2] || "dist"));
}
