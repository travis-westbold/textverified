/* The verifiable-service catalogue behind /services.

   The live catalogue lives in the Blazor app's database and is what the
   current site's search modal queries over its SignalR circuit — there is no
   copy of it in that page's HTML. The one machine-readable route is
   `GET /api/pub/v2/services`, which needs a bearer token.

   What is committed here is a POPULAR SUBSET, not the catalogue. The live
   list is not reachable without a key, so these entries were found by probing
   `/services/<slug>` with a hand-written list of well-known service names:
   155 tried, 116 real. The site's own navigation advertises 900+, so this is
   a sample and the page says so — it is headed "some of our most popular
   services" rather than presented as the full list. `npm run sync:services`
   replaces it with the real catalogue the moment there is an API key.

   So this file is the build-time contract, not the source of truth:
   `services.json` is a committed snapshot, refreshed by
   `npm run sync:services`, and the page is generated from it. Prices are
   build-time data, so they render as static HTML — no request, no spinner,
   no layout shift — and a snapshot that fails this schema fails the BUILD,
   which leaves the last good deploy serving. The trade is staleness: the
   site is only as current as the last sync. `scripts/sync-services.mjs`
   documents how to close that gap. */
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'astro:content';
import snapshot from './catalogue.json';

/* A price of null is not "free" and not "zero" — it means Textverified does
   not currently offer that method for that service, which is a real and
   changing state (SMS is unavailable for PayPal today, for instance). Any
   renderer has to distinguish the three cases. */
const price = z.number().positive().nullable();

const serviceSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  /* the backend's own identifier, stable across renames — the join key when a
     sync has to match a snapshot row to an API record */
  id: z.string().regex(/^trgt_[0-9A-Z]+$/),
  sms: price,
  voice: price,
  /* one price per entry in rentalTiers, or null when the service has no
     rental option at all */
  rentals: z.array(price).nullable(),
  /* promoted on the marketing site; drives the default ordering */
  featured: z.boolean().default(false),
});

const snapshotSchema = z.object({
  generated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(1),
  rentalTiers: z.array(z.string().min(1)).min(1),
  services: z.array(serviceSchema).min(1),
});

const parsed = snapshotSchema.safeParse(snapshot);
if (!parsed.success) {
  throw new Error(
    `src/data/catalogue.json does not match the catalogue schema — re-run \`npm run sync:services\`.\n${parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')}`,
  );
}

/* Derived from the parsed data rather than z.infer: zod 4 no longer exposes
   `z` as a type namespace through the astro:content re-export. */
export type Service = (typeof services)[number];

export const { generated, rentalTiers, services } = parsed.data;

for (const service of services) {
  if (service.rentals && service.rentals.length !== rentalTiers.length) {
    throw new Error(`${service.slug}: ${service.rentals.length} rental prices for ${rentalTiers.length} tiers`);
  }
}

/* US-format money. Whole dollars keep their .00 so a column of prices stays
   on one decimal grid rather than ragged. */
export const money = (value: number) => `$${value.toFixed(2)}`;

/* The cheapest way into a service, which is what someone scanning the
   catalogue is actually pricing. Null when nothing is on sale for it. */
export const cheapest = (service: Service) => {
  const options = [service.sms, service.voice, ...(service.rentals ?? [])].filter(
    (option): option is number => option !== null,
  );
  return options.length ? Math.min(...options) : null;
};

/* The rate card the catalogue advertises. Rental pricing is per-service, but
   most services sit on one standard table, so the page quotes that table and
   says prices vary — quoting the cheapest row would understate most services
   and quoting an average would match none of them. */
export const standardRentalCard = (() => {
  const tally = new Map<string, { prices: number[]; count: number }>();
  for (const service of services) {
    if (!service.rentals || service.rentals.some((entry) => entry === null)) continue;
    const key = service.rentals.join();
    const seen = tally.get(key);
    if (seen) seen.count += 1;
    else tally.set(key, { prices: service.rentals as number[], count: 1 });
  }
  const ranked = [...tally.values()].sort((a, b) => b.count - a.count);
  if (!ranked.length) throw new Error('services.json has no complete rental table to quote');
  return { prices: ranked[0].prices, share: ranked[0].count / services.length };
})();

/* Which services have an icon on disk, read once at build time rather than
   recorded in the snapshot — the files and the JSON are written by two
   different scripts, and a flag that says "has an icon" while the file is
   missing is worse than no flag at all. `npm run sync:icons` fills this
   directory; anything absent falls back to the service's initial.

   Resolved from the project root, not from `import.meta.url`: the adapter
   bundles this module into `.vercel/output/server/` and prerenders from
   there, so a module-relative path looks for the icons next to the bundle
   and fails with ENOENT. Everything that calls `hasIcon` is prerendered, so
   this read only ever happens during the build, where cwd is the root. */
const iconDir = resolve(process.cwd(), 'public/service-icons');
const iconFiles = new Set(
  readdirSync(iconDir)
    .filter((file) => file.endsWith('.webp'))
    .map((file) => file.slice(0, -'.webp'.length)),
);

export const hasIcon = (slug: string) => iconFiles.has(slug);
export const iconPath = (slug: string) => `/service-icons/${slug}.webp`;
