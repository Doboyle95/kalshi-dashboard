import assert from "node:assert/strict";
import test from "node:test";
import {addDocumentLanguage, sitemapXml} from "../scripts/postprocess-site.mjs";

test("addDocumentLanguage adds lang=en without discarding html attributes", () => {
  assert.equal(
    addDocumentLanguage('<!doctype html><html class="theme"><head></head></html>'),
    '<!doctype html><html lang="en" class="theme"><head></head></html>'
  );
});

test("addDocumentLanguage preserves an existing language", () => {
  const html = '<html lang="fr"><head></head></html>';
  assert.equal(addDocumentLanguage(html), html);
});

test("sitemapXml sorts, deduplicates, and XML-escapes canonical URLs", () => {
  const sitemap = sitemapXml([
    "https://predict-charts.com/volume?view=a&mode=b",
    "https://predict-charts.com/",
    "https://predict-charts.com/"
  ]);
  assert.match(sitemap, /<loc>https:\/\/predict-charts\.com\/</);
  assert.match(sitemap, /view=a&amp;mode=b/);
  assert.equal((sitemap.match(/<url>/g) || []).length, 2);
});
