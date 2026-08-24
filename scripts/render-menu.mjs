import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dirFlagIndex = process.argv.indexOf('--dir');
const targetRoot = dirFlagIndex !== -1
  ? resolve(projectRoot, process.argv[dirFlagIndex + 1])
  : projectRoot;

const LOCALES = ['sq', 'it', 'en'];
const LOCALE_TAG = { sq: 'sq-AL', it: 'it-IT', en: 'en-GB' };
const PRODUCTS_LABEL = { sq: 'produkte', it: 'prodotti', en: 'products' };
const COMING_SOON = { sq: 'Së shpejti', it: 'Prossimamente', en: 'Coming soon' };
const MENU_NAME = {
  sq: 'Menuja e Bar Martiri',
  it: 'Il menu del Bar Martiri',
  en: 'The Bar Martiri menu',
};
const REVIEW_TEXT = {
  verifiedPrefix: { sq: 'Vlerësimi, i verifikuar për herë të fundit më', it: 'La valutazione, verificata l’ultima volta il', en: 'The rating, last verified on' },
  basedOnSuffix: { sq: 'bazohet në', it: 'si basa su', en: 'is based on' },
  countSuffix: { sq: 'vlerësime në Google.', it: 'recensioni su Google.', en: 'Google reviews.' },
  ratingOutOf5: { sq: 'nga 5', it: 'su 5', en: 'out of 5' },
};
const DEFAULT_REVIEWS = {
  ratingValue: '3.9',
  reviewCount: 31,
  lastVerified: '2026-08-03',
  testimonials: [
    { author: 'Doctor Who', rating: 5, quote: 'That ice-cream was awesome.' },
    { author: 'E Cabej', rating: 5, quote: 'The service is excellent.' },
  ],
};

async function loadMenuData() {
  const menuDataSource = await readFile(resolve(projectRoot, 'menu-data.js'), 'utf8');
  const sandbox = { BAR_MARTIRI_MENU: null };
  const fn = new Function('window', menuDataSource);
  fn(sandbox);
  return sandbox.BAR_MARTIRI_MENU;
}

async function loadLocalProductImages() {
  const source = await readFile(resolve(projectRoot, 'product-image-map.js'), 'utf8');
  const sandbox = { BAR_MARTIRI_LOCAL_PRODUCT_IMAGES: null };
  new Function('window', source)(sandbox);
  return sandbox.BAR_MARTIRI_LOCAL_PRODUCT_IMAGES || {};
}

async function loadOptimizedLocalImages() {
  const source = await readFile(resolve(projectRoot, 'script.js'), 'utf8');
  const match = source.match(/const optimizedLocalImages = (\{[\s\S]*?\n {2}\});/);
  if (!match) throw new Error('Could not extract optimizedLocalImages from script.js.');
  return Function(`"use strict"; return (${match[1]});`)();
}

function resolveImage(product, localProductImages, optimizedLocalImages) {
  const image = String(product.image || '');
  const local = localProductImages[product.id];
  const localProductPrefix = `/assets/products/${product.id}.`;
  const isLegacyLocalImage =
    image.startsWith(localProductPrefix) || image.startsWith(localProductPrefix.slice(1));
  if ((local?.source === image || local?.local === image || isLegacyLocalImage) && local?.local) {
    return local.local;
  }
  return optimizedLocalImages[image] || image;
}

async function fetchLiveProducts() {
  const configSource = await readFile(resolve(projectRoot, 'supabase-config.js'), 'utf8');
  const sandbox = { BAR_MARTIRI_SUPABASE: null };
  new Function('window', configSource)(sandbox);
  const config = sandbox.BAR_MARTIRI_SUPABASE;
  const fields = [
    'id', 'name', 'category', 'description', 'price', 'image', 'sort_order',
    'name_it', 'name_en', 'description_it', 'description_en',
  ];
  const query = new URLSearchParams({
    select: fields.join(','),
    order: 'sort_order.asc,created_at.asc',
  });
  const response = await fetch(`${config.url}/rest/v1/products?${query.toString()}`, {
    headers: { apikey: config.publishableKey, Authorization: `Bearer ${config.publishableKey}` },
  });
  if (!response.ok) throw new Error(`Supabase request failed with ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data) || !data.length) throw new Error('Supabase returned no products');
  return data.map((product) => ({
    id: String(product.id),
    name: String(product.name || ''),
    category: String(product.category || ''),
    description: String(product.description || ''),
    price: product.price === null || product.price === undefined ? '' : String(product.price),
    image: String(product.image || ''),
    sortOrder: Number(product.sort_order ?? 0),
    translations: {
      it: { name: String(product.name_it || ''), description: String(product.description_it || '') },
      en: { name: String(product.name_en || ''), description: String(product.description_en || '') },
    },
  }));
}

async function loadFallbackProducts() {
  console.warn('Falling back to the committed product snapshot (live Supabase fetch failed).');
  const snapshot = JSON.parse(
    await readFile(resolve(projectRoot, 'products-2026-08-03.json'), 'utf8')
  );
  return snapshot.map((product, index) => ({
    id: String(product.id),
    name: String(product.name || ''),
    category: String(product.category || ''),
    description: String(product.description || ''),
    price: product.price === null || product.price === undefined ? '' : String(product.price),
    image: String(product.image || ''),
    sortOrder: Number(product.sort_order ?? index),
    translations: { it: {}, en: {} },
  }));
}

async function fetchReviewSummary() {
  const configSource = await readFile(resolve(projectRoot, 'supabase-config.js'), 'utf8');
  const sandbox = { BAR_MARTIRI_SUPABASE: null };
  new Function('window', configSource)(sandbox);
  const config = sandbox.BAR_MARTIRI_SUPABASE;
  try {
    const query = new URLSearchParams({
      id: 'eq.main',
      select: 'rating_value,review_count,last_verified,testimonials',
    });
    const response = await fetch(`${config.url}/rest/v1/site_reviews?${query.toString()}`, {
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${config.publishableKey}` },
    });
    if (!response.ok) throw new Error(`Supabase request failed with ${response.status}`);
    const rows = await response.json();
    const row = rows?.[0];
    if (!row) throw new Error('No review summary row found');
    return {
      ratingValue: String(row.rating_value ?? DEFAULT_REVIEWS.ratingValue),
      reviewCount: Number(row.review_count ?? DEFAULT_REVIEWS.reviewCount),
      lastVerified: String(row.last_verified ?? DEFAULT_REVIEWS.lastVerified),
      testimonials:
        Array.isArray(row.testimonials) && row.testimonials.length
          ? row.testimonials
          : DEFAULT_REVIEWS.testimonials,
    };
  } catch (error) {
    console.warn(`Review summary fetch failed, using defaults: ${error.message}`);
    return DEFAULT_REVIEWS;
  }
}

function formatVerifiedDate(dateString, locale) {
  try {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function buildReviewsHtml(reviewSummary, language) {
  const locale = LOCALE_TAG[language];
  const copy = `${REVIEW_TEXT.verifiedPrefix[language]} ${formatVerifiedDate(reviewSummary.lastVerified, locale)}, ${REVIEW_TEXT.basedOnSuffix[language]} <strong>${escapeHtml(reviewSummary.reviewCount)}</strong> ${REVIEW_TEXT.countSuffix[language]}`;
  const rows = reviewSummary.testimonials
    .map((testimonial) => {
      const ratingValue = Number(testimonial.rating) || 5;
      return `<article class="review-row"><div class="review-meta"><span class="review-rating" aria-label="${ratingValue} ${escapeHtml(REVIEW_TEXT.ratingOutOf5[language])}">${ratingValue.toFixed(1)} / 5</span><p>${escapeHtml(testimonial.author)} · Google</p></div><blockquote lang="en">“${escapeHtml(testimonial.quote)}”</blockquote></article>`;
    })
    .join('');
  return { ratingValue: reviewSummary.ratingValue, copy, rows };
}

function injectReviews(html, reviewSummary, language) {
  const { ratingValue, copy, rows } = buildReviewsHtml(reviewSummary, language);

  const ratingPattern = /<span data-review-rating>[^<]*<\/span>/;
  if (!ratingPattern.test(html)) throw new Error('Could not find the review rating placeholder.');
  html = html.replace(ratingPattern, `<span data-review-rating>${escapeHtml(ratingValue)}</span>`);

  const copyPattern = /<p data-review-copy>[\s\S]*?<\/p>/;
  if (!copyPattern.test(html)) throw new Error('Could not find the review copy placeholder.');
  html = html.replace(copyPattern, `<p data-review-copy>${copy}</p>`);

  const listPattern = /<div class="reviews-list">[\s\S]*?<\/div>\s*<\/section>/;
  if (!listPattern.test(html)) throw new Error('Could not find the reviews-list container.');
  html = html.replace(listPattern, `<div class="reviews-list">${rows}</div>\n      </section>`);

  const businessMatch = html.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n {4}<\/script>/);
  if (!businessMatch) throw new Error('Could not find the JSON-LD script block to inject reviews into.');
  const data = JSON.parse(businessMatch[1]);
  const businessNode = data['@graph']?.find((node) => {
    const type = node['@type'];
    return Array.isArray(type) ? type.includes('BarOrPub') : type === 'BarOrPub';
  });
  if (!businessNode) throw new Error('Could not find the business node in the JSON-LD graph.');
  // No aggregateRating / review markup on the business node. Google does not
  // allow a business to mark up reviews about itself on its own site
  // ("self-serving reviews"), so this was ineligible for rich results and a
  // manual-action risk. The real star rating already shows in the map pack from
  // Google's own data. The testimonials stay as visible HTML above.
  delete businessNode.aggregateRating;
  delete businessNode.review;
  const serialized = JSON.stringify(data, null, 2)
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');
  html = html.replace(businessMatch[0], `<script type="application/ld+json">\n${serialized}\n    </script>`);

  return html;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalizeWords(value, locale) {
  return String(value || '').replace(/(^|\s)(\S)/g, (match, space, letter) => {
    return `${space}${letter.toLocaleUpperCase(locale)}`;
  });
}

function textFor(product, menuData, language) {
  const localTranslation = menuData.productTranslations?.[product.id]?.[language];
  let name;
  let description;
  if (language === 'sq') {
    name = localTranslation?.name || product.name;
    description = localTranslation?.description || product.description;
  } else {
    const dbTranslation = product.translations?.[language];
    const preferred = dbTranslation?.name || dbTranslation?.description ? dbTranslation : localTranslation;
    name = preferred?.name || product.name;
    description = preferred?.description || product.description;
  }
  return { name: name || '', description: description || '' };
}

function formatPrice(price) {
  const trimmed = String(price ?? '').trim();
  return trimmed ? `${trimmed} ALL` : '';
}

function buildProductGridHtml(products, menuData, language, imageMaps) {
  const locale = LOCALE_TAG[language];
  const byCategory = new Map(menuData.categories.map((category) => [category.id, []]));
  for (const product of products) {
    const categoryId = menuData.categoryOverrides?.[product.id] || product.category;
    if (byCategory.has(categoryId)) byCategory.get(categoryId).push(product);
  }

  return menuData.categories
    .map((category) => {
      const items = byCategory.get(category.id) || [];
      const categoryLabel = capitalizeWords(category.labels?.[language] || category.label, locale);
      const countLabel = items.length
        ? `${items.length} ${PRODUCTS_LABEL[language]}`
        : COMING_SOON[language];

      const cardsHtml = items
        .map((product, index) => {
          const { name, description } = textFor(product, menuData, language);
          const resolvedImage = resolveImage(product, imageMaps.localProductImages, imageMaps.optimizedLocalImages);
          const image = resolvedImage || '/assets/optimized/ice-cream-cone.webp';
          const price = formatPrice(product.price);
          const priceHtml = price ? `<strong>${escapeHtml(price)}</strong>` : '';
          return `<article class="product-card"><img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="${index < 3 && category === menuData.categories[0] ? 'eager' : 'lazy'}" decoding="async" width="560" height="700"><div><h4>${escapeHtml(capitalizeWords(name, locale))}</h4><p>${escapeHtml(description)}</p>${priceHtml}</div></article>`;
        })
        .join('');

      const gridHtml = items.length
        ? `<div class="product-grid">${cardsHtml}</div>`
        : '<div class="product-grid"><p class="empty-category"></p></div>';

      return `<section class="menu-category" id="menu-category-${category.id}" aria-labelledby="menu-category-title-${category.id}"><header><h3 id="menu-category-title-${category.id}">${escapeHtml(categoryLabel)}</h3><span>${escapeHtml(countLabel)}</span></header>${gridHtml}</section>`;
    })
    .join('');
}

function buildMenuSchema(products, menuData, language) {
  const byCategory = new Map(menuData.categories.map((category) => [category.id, []]));
  for (const product of products) {
    const categoryId = menuData.categoryOverrides?.[product.id] || product.category;
    if (byCategory.has(categoryId)) byCategory.get(categoryId).push(product);
  }

  const hasMenuSection = menuData.categories
    .map((category) => {
      const items = byCategory.get(category.id) || [];
      if (!items.length) return null;
      const hasMenuItem = items.map((product) => {
        const { name, description } = textFor(product, menuData, language);
        const item = { '@type': 'MenuItem', name };
        if (description) item.description = description;
        const price = String(product.price ?? '').trim();
        if (price) {
          item.offers = { '@type': 'Offer', price, priceCurrency: 'ALL' };
        }
        return item;
      });
      return {
        '@type': 'MenuSection',
        name: category.labels?.[language] || category.label,
        hasMenuItem,
      };
    })
    .filter(Boolean);

  return {
    '@type': 'Menu',
    name: MENU_NAME[language],
    hasMenuSection,
  };
}

function injectProductGrid(html, gridHtml) {
  const pattern = /<div class="menu-catalog" id="menu-product-grid" data-product-grid aria-live="polite">[\s\S]*?<\/div>\s*<p class="menu-status"/;
  if (!pattern.test(html)) {
    throw new Error('Could not find the menu-product-grid container to inject into.');
  }
  const replacement = `<div class="menu-catalog" id="menu-product-grid" data-product-grid aria-live="polite">${gridHtml}</div>\n        <p class="menu-status"`;
  return html.replace(pattern, replacement);
}

function injectMenuSchema(html, menuSchema) {
  const scriptMatch = html.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n {4}<\/script>/);
  if (!scriptMatch) throw new Error('Could not find the JSON-LD script block to inject the menu into.');

  const data = JSON.parse(scriptMatch[1]);
  const businessNode = data['@graph']?.find((node) => {
    const type = node['@type'];
    return Array.isArray(type) ? type.includes('BarOrPub') : type === 'BarOrPub';
  });
  if (!businessNode) throw new Error('Could not find the business node in the JSON-LD graph.');

  businessNode.hasMenu = menuSchema;

  const serialized = JSON.stringify(data, null, 2)
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');
  return html.replace(scriptMatch[0], `<script type="application/ld+json">\n${serialized}\n    </script>`);
}

const menuData = await loadMenuData();
const imageMaps = {
  localProductImages: await loadLocalProductImages(),
  optimizedLocalImages: await loadOptimizedLocalImages(),
};
let products;
try {
  products = await fetchLiveProducts();
  console.log(`Fetched ${products.length} live products from Supabase.`);
} catch (error) {
  console.warn(`Live product fetch failed: ${error.message}`);
  products = await loadFallbackProducts();
}

const reviewSummary = await fetchReviewSummary();

const pages = {
  sq: 'index.html',
  it: 'it/index.html',
  en: 'en/index.html',
};

for (const language of LOCALES) {
  const filePath = resolve(targetRoot, pages[language]);
  let html = await readFile(filePath, 'utf8');
  const gridHtml = buildProductGridHtml(products, menuData, language, imageMaps);
  const menuSchema = buildMenuSchema(products, menuData, language);
  html = injectProductGrid(html, gridHtml);
  html = injectMenuSchema(html, menuSchema);
  html = injectReviews(html, reviewSummary, language);
  await writeFile(filePath, html);
}

console.log(`Rendered ${products.length} products into the static menu grid for ${LOCALES.join(', ')}.`);
