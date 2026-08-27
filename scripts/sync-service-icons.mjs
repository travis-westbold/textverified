/* Fetch each catalogue service's icon and write it into public/service-icons/.
 *
 *   npm run sync:icons
 *
 * The icons are the ones the app itself serves, at /ico/<serviceId>/icon —
 * derived from the id already in the snapshot, so this needs no API key and
 * can run on its own after `npm run sync:services`.
 *
 * They arrive as ~170px PNGs of 5–22KB, and the catalogue renders them at
 * 36px. Left alone that is roughly 1.5MB of repository and a megabyte and a
 * half over the wire for a grid of thumbnails, so each one is resampled to a
 * 72px WebP (2x the display size) before it is committed. Existing files are
 * left alone unless --force is passed, so a re-run after adding services only
 * fetches the new ones.
 *
 * sharp does the resampling. It is not a declared dependency — it arrives
 * with Astro — so this script says so plainly rather than failing obscurely.
 */
import { mkdir, readFile, readdir, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SIZE = 72;
const force = process.argv.includes('--force');

const root = new URL('../', import.meta.url);
const outDir = fileURLToPath(new URL('public/service-icons/', root));
const catalogue = JSON.parse(await readFile(fileURLToPath(new URL('src/data/catalogue.json', root)), 'utf8'));

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('sync:icons — sharp is not installed. It normally arrives with Astro; otherwise `npm i -D sharp`.');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
const existing = new Set((await readdir(outDir).catch(() => [])).filter((name) => name.endsWith('.webp')));

const wanted = new Set(catalogue.services.map((service) => `${service.slug}.webp`));
let written = 0;
let skipped = 0;
const failed = [];

for (const service of catalogue.services) {
  const file = `${service.slug}.webp`;
  if (!force && existing.has(file)) { skipped += 1; continue; }
  try {
    const response = await fetch(`https://www.textverified.com/ico/${service.id}/icon`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const source = Buffer.from(await response.arrayBuffer());
    /* `contain` on a transparent ground: a square icon is untouched, and a
       wordmark that is not square is letterboxed rather than stretched. */
    const output = await sharp(source)
      .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 82, effort: 6 })
      .toBuffer();
    await writeFile(fileURLToPath(new URL(file, `file://${outDir}`)), output);
    written += 1;
  } catch (error) {
    failed.push(`${service.slug} (${error.message})`);
  }
}

/* A service dropped from the catalogue should not leave its icon behind to be
   served forever and counted against the repository. */
const orphans = [...existing].filter((file) => !wanted.has(file));
for (const file of orphans) await unlink(fileURLToPath(new URL(file, `file://${outDir}`)));

console.log(`sync:icons — ${written} written, ${skipped} already present, ${orphans.length} removed`);
if (failed.length) console.log(`  no icon for: ${failed.join(', ')}`);
