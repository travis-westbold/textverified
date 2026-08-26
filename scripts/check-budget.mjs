import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

/* Performance budget, enforced on every build (local and Vercel — both run
   `npm run build`). The floor is low-end hardware on slow connections; these
   numbers are gzip bytes, set as practical guardrails with headroom for normal
   content growth. Warn at 80%, fail at 100%. Review pages that approach a
   limit and adjust a budget only as an explicit performance decision. */
const BUDGETS = {
  pageHtml: 40_000,
  pageCss: 20_000, // sum of stylesheets a page links
  pageJs: 12_000, // sum of scripts a page links
  pageFirstLoad: 70_000, // html + css + js
  fontsTotal: 48_000, // raw bytes on disk (woff2 is pre-compressed)
};

const distRoot = fileURLToPath(new URL('../dist/', import.meta.url));

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
}

const gzipSize = async (path) => gzipSync(await readFile(path), { level: 9 }).length;

const failures = [];
const warnings = [];
const check = (label, actual, budget) => {
  const line = `${label}: ${(actual / 1000).toFixed(1)}KB of ${(budget / 1000).toFixed(1)}KB`;
  if (actual > budget) failures.push(line);
  else if (actual > budget * 0.8) warnings.push(line);
};

const files = await walk(distRoot).catch(() => null);
if (!files) {
  console.error('Budget check failed: dist/ is missing — run after `astro build`.');
  process.exit(1);
}

const pages = files.filter((file) => file.endsWith('.html'));
const fonts = files.filter((file) => /\.(woff2?|ttf|otf)$/.test(file));

for (const page of pages) {
  const name = relative(distRoot, page);
  const html = await readFile(page, 'utf8');

  /* the public site must be self-contained: no font CDNs, no CMS leakage */
  if (/fonts\.(googleapis|gstatic)\.com/.test(html)) failures.push(`${name}: references Google Fonts`);
  if (/keystatic/i.test(html) && !name.startsWith('keystatic')) failures.push(`${name}: references a Keystatic chunk`);

  const assets = [...new Set([...html.matchAll(/\/_astro\/[^"']+\.(?:css|js)/g)].map((match) => match[0]))];
  let css = 0;
  let js = 0;
  for (const asset of assets) {
    const size = await gzipSize(join(distRoot, asset.slice(1)));
    if (asset.endsWith('.css')) css += size;
    else js += size;
  }
  const htmlSize = gzipSync(html, { level: 9 }).length;

  check(`${name} html`, htmlSize, BUDGETS.pageHtml);
  check(`${name} css`, css, BUDGETS.pageCss);
  check(`${name} js`, js, BUDGETS.pageJs);
  check(`${name} first-load`, htmlSize + css + js, BUDGETS.pageFirstLoad);
}

let fontsTotal = 0;
for (const font of fonts) fontsTotal += (await stat(font)).size;
check('fonts total', fontsTotal, BUDGETS.fontsTotal);

if (warnings.length) console.warn(`Budget warnings (>80%):\n${warnings.join('\n')}`);
if (failures.length) {
  console.error(`Performance budget check failed:\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Performance budget check passed (${pages.length} pages, fonts ${(fontsTotal / 1000).toFixed(1)}KB).`);
}
