import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(resolve(projectRoot, 'index.html'), 'utf8');
const publicScript = await readFile(resolve(projectRoot, 'script.js'), 'utf8');
const uiTextMatch = publicScript.match(
  /const UI_TEXT = Object\.freeze\((\{[\s\S]*?\})\);\n\n  const DYNAMIC_TEXT/
);
if (!uiTextMatch) throw new Error('Could not extract the public UI translations.');
const uiText = Function(`"use strict"; return (${uiTextMatch[1]});`)();

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function translateStaticHtml(html, language) {
  const entries = Object.values(uiText)
    .filter((translations) => translations.sq && translations[language])
    .sort((left, right) => right.sq.length - left.sq.length);
  return entries.reduce((page, translations) => {
    if (translations.sq === translations[language]) return page;
    const pattern = translations.sq
      .split(/\s+/)
      .map(escapeRegularExpression)
      .join('\\s+');
    return page.replace(new RegExp(pattern, 'g'), translations[language]);
  }, html);
}

const locales = {
  it: {
    htmlLanguage: 'it-IT',
    ogLocale: 'it_IT',
    path: '/it/',
    title: 'Bar Martiri Spille | Gelato e Lettini vicino al Mare',
    description:
      'Bar Martiri a Spille, Albania: lettini, parcheggio gratuito, gelato, caffè e bibite vicino al mare.',
    socialDescription:
      'Lettini, parcheggio gratuito, gelato, caffè e bibite vicino al mare a Spille, Albania.',
    businessDescription:
      'Bar vicino al mare a Spille con lettini, parcheggio gratuito, gelato, caffè e bibite fresche.',
    servesCuisine: ['Gelato', 'Caffè', 'Bibite'],
    amenityAccess: 'Accesso facile da Rruga e Pishave',
    imageAlt: 'Bar Martiri a Spille, Albania',
  },
  en: {
    htmlLanguage: 'en-GB',
    ogLocale: 'en_GB',
    path: '/en/',
    title: 'Bar Martiri Spille | Ice Cream & Sunbeds by the Sea',
    description:
      'Bar Martiri in Spille, Albania: sunbeds, free parking, ice cream, coffee and cold drinks by the sea.',
    socialDescription:
      'Sunbeds, free parking, ice cream, coffee and cold drinks by the sea in Spille, Albania.',
    businessDescription:
      'Beachside bar in Spille with sunbeds, free parking, ice cream, coffee and cold drinks.',
    servesCuisine: ['Ice Cream', 'Coffee', 'Drinks'],
    amenityAccess: 'Easy access from Rruga e Pishave',
    imageAlt: 'Bar Martiri in Spille, Albania',
  },
};

const ALL_OG_LOCALES = ['sq_AL', ...Object.values(locales).map((l) => l.ogLocale)];

for (const [language, locale] of Object.entries(locales)) {
  const canonical = `https://www.barmartiri.com${locale.path}`;
  let page = source
    .replace('<html lang="sq-AL">', `<html lang="${locale.htmlLanguage}" data-initial-language="${language}">`)
    .replace('<head>', '<head>\n    <base href="/">')
    .replaceAll('href="#', `href="${locale.path}#`)
    .replaceAll('href="/privacy"', `href="${locale.path}privacy"`)
    .replace(
      'content="Bar Martiri në Spille, Shqipëri: shezlone, parkim falas, akullore, kafe dhe pije pranë detit për pushimet tuaja verore."',
      `content="${locale.description}"`
    )
    .replace(
      '<link rel="canonical" href="https://www.barmartiri.com/">',
      `<link rel="canonical" href="${canonical}">`
    )
    .replace(
      /<meta property="og:locale" content="sq_AL">[\s\S]*?<meta property="og:locale:alternate" content="en_GB">/,
      [
        `<meta property="og:locale" content="${locale.ogLocale}">`,
        ...ALL_OG_LOCALES
          .filter((tag) => tag !== locale.ogLocale)
          .map((tag) => `    <meta property="og:locale:alternate" content="${tag}">`),
      ].join('\n')
    )
    .replace(
      'content="Bar Martiri në Spille, Shqipëri"',
      `content="${locale.imageAlt}"`
    )
    .replaceAll('content="Bar Martiri Spille | Akullore dhe Shezlone Pranë Detit"', `content="${locale.title}"`)
    .replaceAll(
      'content="Shezlone, parkim falas, akullore, kafe dhe pije pranë detit në Spille, Shqipëri."',
      `content="${locale.socialDescription}"`
    )
    .replace(
      'content="Shezlone, parkim falas, akullore, kafe dhe pije pranë detit në Spille."',
      `content="${locale.socialDescription}"`
    )
    .replace('content="https://www.barmartiri.com/"', `content="${canonical}"`)
    .replace('<title>Bar Martiri Spille | Akullore dhe Shezlone Pranë Detit</title>', `<title>${locale.title}</title>`)
    .replaceAll('Bar Martiri Spille | Akullore dhe Shezlone Pranë Detit', locale.title)
    .replace(
      'Bar Martiri në Spille me shezlone, parkim falas, akullore, kafe dhe pije pranë detit.',
      locale.description
    )
    .replace(
      'Bar pranë detit në Spille me shezlone, parkim falas, akullore, kafe dhe pije të freskëta.',
      locale.businessDescription
    )
    .replace(
      '"@id": "https://www.barmartiri.com/#webpage"',
      `"@id": "${canonical}#webpage"`
    )
    .replace(
      `"@id": "${canonical}#webpage",\n            "url": "https://www.barmartiri.com/"`,
      `"@id": "${canonical}#webpage",\n            "url": "${canonical}"`
    )
    .replace(
      /("@type": "WebPage"[\s\S]*?"inLanguage": ")sq-AL(")/,
      `$1${locale.htmlLanguage}$2`
    )
    .replace(
      '"servesCuisine": ["Akullore", "Kafe", "Pije"]',
      `"servesCuisine": ${JSON.stringify(locale.servesCuisine)}`
    )
    .replace('"name": "Akses i thjeshtë nga Rruga e Pishave"', `"name": "${locale.amenityAccess}"`);

  page = translateStaticHtml(page, language);

  await writeFile(resolve(projectRoot, language, 'index.html'), page);
}

console.log('Generated localized pages: /it/ and /en/');
