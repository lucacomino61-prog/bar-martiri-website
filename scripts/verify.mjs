import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  'index.html',
  'it/index.html',
  'en/index.html',
  'admin.html',
  'privacy.html',
  'terms.html',
  'it/terms.html',
  'en/terms.html',
  '404.html',
  'image-sitemap.xml',
  'styles.css',
  'admin.css',
  'script.js',
  'product-image-map.js',
  'admin.js',
  'supabase-store.js',
  'supabase/setup.sql',
];

await Promise.all(requiredFiles.map((file) => access(resolve(projectRoot, file))));

const publicHtml = await readFile(resolve(projectRoot, 'index.html'), 'utf8');
const publicScript = await readFile(resolve(projectRoot, 'script.js'), 'utf8');
const menuData = await readFile(resolve(projectRoot, 'menu-data.js'), 'utf8');
const adminHtml = await readFile(resolve(projectRoot, 'admin.html'), 'utf8');
const adminScript = await readFile(resolve(projectRoot, 'admin.js'), 'utf8');
const italianHtml = await readFile(resolve(projectRoot, 'it/index.html'), 'utf8');
const englishHtml = await readFile(resolve(projectRoot, 'en/index.html'), 'utf8');
const productImageMap = await readFile(resolve(projectRoot, 'product-image-map.js'), 'utf8');
const privacyHtml = await readFile(resolve(projectRoot, 'privacy.html'), 'utf8');
const imageSitemap = await readFile(resolve(projectRoot, 'image-sitemap.xml'), 'utf8');
const backupProducts = JSON.parse(
  await readFile(resolve(projectRoot, 'backup/products-2026-08-03.json'), 'utf8')
);

const assertions = [
  [publicHtml.includes('href="/terms"'), 'The footer must link to the terms page'],
  [(publicHtml.match(/<details class="faq-item"/g) || []).length >= 5, 'The FAQ must ship with its questions in the static HTML'],
  [publicHtml.includes('data-scroll-progress') && publicHtml.includes('data-to-top'), 'Scroll progress and back-to-top controls are required'],
  [!publicHtml.includes('data-language-choice="sq" disabled'), 'Language choices must be immediately enabled'],
  [!publicScript.includes('/.netlify/functions/google-reviews'), 'Broken reviews endpoint must not be requested'],
  [!adminHtml.includes('crypto-js.min.js'), 'Production admin must not load local password fallback'],
  [!adminScript.includes('FIXED_AUTH'), 'Production admin must fail closed without Supabase'],
  [publicHtml.includes('hreflang="it-IT"') && publicHtml.includes('hreflang="en-GB"'), 'Localized hreflang links are required'],
  [publicHtml.includes('"@type": "WebPage"') && publicHtml.includes('"menu": "https://www.barmartiri.com/#menu"'), 'WebPage and menu structured data are required'],
  [publicHtml.includes('data-cookie-choice="essential"') && publicHtml.includes('data-cookie-choice="all"'), 'Cookie consent must offer accept and reject controls'],
  [publicScript.includes("if (!getCookiePreference()) showCookieBanner();"), 'Cookie consent must appear on the first visit'],
  [privacyHtml.includes('bar_martiri_language') && privacyHtml.includes('bar_martiri_cookie_pref'), 'The privacy page must document first-party cookies'],
  [imageSitemap.includes('/assets/products/') && imageSitemap.includes('<image:image>'), 'The image sitemap must list catalog images'],
  [
    !['Kalo te permbajtja', 'Cdo dite', 'cokollate', 'Privatesia'].some((text) =>
      publicHtml.includes(text)
    ),
    'Visible Albanian source text must use standard diacritics',
  ],
  [
    ['Çokollatë', 'Ujë Natyral', 'Joalkoolik', 'Jägermeister', 'Disaronno'].every((text) =>
      menuData.includes(text)
    ),
    'Corrected Albanian product names must remain in the menu overrides',
  ],
  [
    italianHtml.includes('rel="canonical" href="https://www.barmartiri.com/it/"') &&
      englishHtml.includes('rel="canonical" href="https://www.barmartiri.com/en/"'),
    'Localized canonical links must use the production domain',
  ],
  [
    italianHtml.includes("L'estate inizia al Bar Martiri.") &&
      englishHtml.includes('Summer starts at Bar Martiri.'),
    'Localized pages must contain crawlable translated body copy',
  ],
  [
    publicHtml.includes('Shezlone') &&
      !publicHtml.includes('Shezlongje') &&
      !publicHtml.includes('Prenoto'),
    'Albanian service copy must use the approved Shezlone and Rezervo wording',
  ],
  [
    (publicHtml.match(/data-language-switcher/g) || []).length === 5,
    'Language controls must be available in the header and all four panels',
  ],
  [
    publicHtml.includes('data-menu-search') && publicHtml.includes('data-category-tabs'),
    'The compact searchable menu controls are required',
  ],
  [
    publicScript.includes("loadScript('assets/vendor/ScrollTrigger.min.js')") &&
      publicScript.includes("id: 'bar-martiri-flavors'"),
    'The five-flavour story must retain its scroll-driven runtime',
  ],
  [
    (publicHtml.match(/data-flavor-card/g) || []).length === 5 &&
      publicHtml.includes('Vazhdo poshtë për të parë të pesë shijet.'),
    'The public page must expose all five ice creams in the scroll story',
  ],
];

for (const [passed, message] of assertions) {
  if (!passed) throw new Error(message);
}

for (const pageName of ['index.html', 'admin.html']) {
  const html = await readFile(resolve(projectRoot, pageName), 'utf8');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`${pageName} has duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
}

const optimizedDirectory = resolve(projectRoot, 'assets/products');
const optimizedFiles = (await readdir(optimizedDirectory)).filter((file) => file.endsWith('.webp'));
const remoteProducts = backupProducts.filter((product) => String(product.image || '').startsWith('http'));
if (optimizedFiles.length !== remoteProducts.length) {
  throw new Error(`Expected ${remoteProducts.length} optimized catalog images, found ${optimizedFiles.length}`);
}
for (const product of remoteProducts) {
  if (!productImageMap.includes(`"${product.id}"`)) {
    throw new Error(`Missing optimized image mapping for ${product.id}`);
  }
}
const oversizedImages = [];
for (const file of optimizedFiles) {
  const details = await stat(resolve(optimizedDirectory, file));
  if (details.size > 110 * 1024) oversizedImages.push(file);
}
if (oversizedImages.length) {
  throw new Error(`Optimized WebP images over 110 KB: ${oversizedImages.join(', ')}`);
}

console.log('Static verification passed.');
