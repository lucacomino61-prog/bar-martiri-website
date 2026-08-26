import { cp, mkdir, rm } from 'node:fs/promises';

const outputDirectory = new URL('../dist/', import.meta.url);
const projectRoot = new URL('../', import.meta.url);

const publicFiles = [
  'index.html',
  'admin.html',
  'styles.css',
  'admin.css',
  'script.js',
  'admin.js',
  'menu-data.js',
  'product-image-map.js',
  'supabase-config.js',
  'supabase-store.js',
  'indexnow.js',
  'sw.js',
  'manifest.json',
  '46e297fcd1eacc2d8f7f2cec82e9cfce.txt',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'image-sitemap.xml',
  'privacy.html',
  'terms.html',
  '404.html',
  'vercel-analytics.js',
];

const publicDirectories = ['assets', 'en', 'it'];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await Promise.all([
  ...publicFiles.map((path) =>
    cp(new URL(path, projectRoot), new URL(path, outputDirectory))
  ),
  ...publicDirectories.map((path) =>
    cp(new URL(`${path}/`, projectRoot), new URL(`${path}/`, outputDirectory), {
      recursive: true,
    })
  ),
]);

console.log('Prepared the Vercel static output in dist/.');
