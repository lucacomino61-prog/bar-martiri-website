import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png'];
const EXCLUDED_FILES = new Set(['favicon-48.png', 'favicon-96.png', 'apple-touch-icon.png']);

const productIds = (await readdir(resolve(projectRoot, 'assets/products')))
  .filter((file) => file.endsWith('.webp'))
  .map((file) => file.replace(/\.webp$/, ''))
  .sort();
if (!productIds.length) throw new Error('No optimized catalog images were found.');

const optimizedFiles = (await readdir(resolve(projectRoot, 'assets/optimized')))
  .filter((file) => IMAGE_EXTENSIONS.some((ext) => file.endsWith(ext)) && !EXCLUDED_FILES.has(file))
  .sort();
if (!optimizedFiles.length) throw new Error('No optimized site images were found.');

const imageLocations = [
  ...optimizedFiles.map((file) => `assets/optimized/${file}`),
  ...productIds.map((id) => `assets/products/${id}.webp`),
];
// Google treats <image:title> as a relevance signal for image search. Only
// images we can name truthfully get a title: the hand-named site assets, plus
// any product whose id appears in the local catalogue. The Supabase-backed
// catalogue images are named by UUID, so they are left untitled rather than
// given a meaningless one.
const menuSource = await readFile(resolve(projectRoot, 'menu-data.js'), 'utf8');
const menuSandbox = {};
new Function('window', menuSource)(menuSandbox);
const catalogue = menuSandbox.BAR_MARTIRI_MENU ?? {};

const productNames = new Map();
for (const product of catalogue.products ?? []) {
  if (product?.id && product?.name) productNames.set(String(product.id), String(product.name));
}

const BRAND = 'Bar Martiri, Spille';
const UUID_NAMED = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function titleFor(path) {
  const file = path.split('/').pop().replace(/\.[a-z]+$/i, '');
  const productName = productNames.get(file);
  if (productName) return productName + ' \u2014 ' + BRAND;
  if (UUID_NAMED.test(file)) return null;
  const humanized = file
    .replace(/[-_]+/g, ' ')
    .replace(/(^|\s)([a-z])/g, (match, lead, letter) => lead + letter.toUpperCase())
    .trim();
  return humanized ? humanized + ' \u2014 ' + BRAND : null;
}

const escapeXml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const images = imageLocations
  .map(
    (path) =>
      `    <image:image><image:loc>https://www.barmartiri.com/${path}</image:loc>${titleFor(path) ? `<image:title>${escapeXml(titleFor(path))}</image:title>` : ''}</image:image>`
  )
  .join('\n');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://www.barmartiri.com/</loc>
${images}
  </url>
</urlset>
`;

await writeFile(resolve(projectRoot, 'image-sitemap.xml'), sitemap);
console.log(`Generated image sitemap with ${imageLocations.length} images.`);
