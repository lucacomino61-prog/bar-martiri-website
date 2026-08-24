import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import * as esbuild from 'esbuild';

const distRoot = new URL('../dist/', import.meta.url);

const minifyTargets = [
  { path: 'styles.css', loader: 'css' },
  { path: 'script.js', loader: 'js' },
];

for (const { path, loader } of minifyTargets) {
  const fileUrl = new URL(path, distRoot);
  const source = await readFile(fileUrl, 'utf8');
  const { code } = await esbuild.transform(source, { loader, minify: true });
  await writeFile(fileUrl, code);
  console.log(`Minified ${path}: ${source.length} -> ${code.length} bytes`);
}

// Cache keys used to be hand-maintained (?v=20260824-1) across nine assets. That
// is a footgun in two directions: files changed without the string moving, so a
// returning visitor got stale code against new markup; and the strings drifted
// apart, with menu-data.js referenced as two different versions on different
// pages at once. Derive every key from the bytes actually served instead.
//
// Assets are discovered from the HTML rather than listed here, so a new script
// or stylesheet is fingerprinted automatically and this never needs editing.
const ASSET_REFERENCE = /(?:href|src)="([^"?:]+\.(?:css|js))(\?v=[^"]*)?"/g;

const htmlFiles = (await readdir(distRoot, { recursive: true }))
  .map((name) => name.split('\\').join('/'))
  .filter((name) => name.endsWith('.html'));

async function fingerprintOf(assetPath, cache) {
  if (cache.has(assetPath)) return cache.get(assetPath);
  let hash = null;
  try {
    const fileUrl = new URL(assetPath, distRoot);
    if ((await stat(fileUrl)).isFile()) {
      hash = createHash('sha256').update(await readFile(fileUrl)).digest('hex').slice(0, 10);
    }
  } catch {
    // Referenced but not shipped (external or generated elsewhere) — leave it be.
  }
  cache.set(assetPath, hash);
  return hash;
}

const cache = new Map();
let rewritten = 0;

for (const name of htmlFiles) {
  const fileUrl = new URL(name, distRoot);
  const html = await readFile(fileUrl, 'utf8');
  const replacements = [];

  for (const match of html.matchAll(ASSET_REFERENCE)) {
    const assetPath = match[1];
    // Resolve relative to dist root: pages in /it/ and /en/ reference "styles.css"
    // but the file lives at the root, which is what <base href="/"> already means
    // for the browser.
    const resolved = assetPath.replace(/^\.?\//, '');
    const hash = await fingerprintOf(resolved, cache);
    if (hash) replacements.push([match[0], `${match[0].split('=')[0]}="${assetPath}?v=${hash}"`]);
  }

  let next = html;
  for (const [from, to] of replacements) next = next.split(from).join(to);
  if (next !== html) {
    await writeFile(fileUrl, next);
    rewritten += 1;
  }
}

const fingerprinted = [...cache].filter(([, hash]) => hash);
console.log(
  `Fingerprinted ${fingerprinted.length} asset(s) across ${rewritten} HTML file(s): ` +
    fingerprinted.map(([path, hash]) => `${path}?v=${hash}`).join(', ')
);
