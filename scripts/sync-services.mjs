/* Refresh src/data/services.json from the live catalogue.
 *
 *   TEXTVERIFIED_API_USERNAME=… TEXTVERIFIED_API_KEY=… npm run sync:services
 *
 * The catalogue is owned by the Blazor backend. The marketing site cannot read
 * it at request time — public pages are prerendered, and putting a key in the
 * browser is not an option — so it is pulled at build time instead and
 * committed, which keeps prices in the HTML and the page static.
 *
 * The three reservation types are fetched separately because Textverified
 * prices and offers them separately: a service can sell SMS verifications but
 * no rental, or a rental but no SMS (PayPal has no SMS verification today).
 * They are merged per service on the backend's own id, not on the name, so a
 * rename does not silently create a second row.
 *
 * Keeping the page current is then a deploy question, not a code one: the
 * catalogue only changes when this is re-run and the site redeployed, so
 * either the backend calls a Vercel deploy hook when a service or a price
 * changes, or a scheduled rebuild runs and the page is at most that stale.
 * Nothing here runs during `astro build` — a build never depends on the
 * network or on a key being present.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BASE = process.env.TEXTVERIFIED_API_BASE ?? 'https://www.textverified.com/api/pub/v2';
const USERNAME = process.env.TEXTVERIFIED_API_USERNAME;
const KEY = process.env.TEXTVERIFIED_API_KEY;

const target = fileURLToPath(new URL('../src/data/catalogue.json', import.meta.url));

const die = (message) => {
  console.error(`sync:services — ${message}`);
  process.exit(1);
};

if (!USERNAME || !KEY) {
  die('set TEXTVERIFIED_API_USERNAME and TEXTVERIFIED_API_KEY (an API key from the account page).\n'
    + '  The committed snapshot is left untouched.');
}

/* v2 trades the API key for a short-lived bearer token; every other call uses
   the token, not the key. */
const authenticate = async () => {
  const response = await fetch(`${BASE}/auth`, {
    method: 'POST',
    headers: { 'X-API-USERNAME': USERNAME, 'X-API-KEY': KEY },
  });
  if (!response.ok) die(`auth failed: ${response.status} ${response.statusText}`);
  const body = await response.json();
  const token = body.token ?? body.bearerToken ?? body.access_token;
  if (!token) die(`auth succeeded but no token in the response: ${JSON.stringify(body).slice(0, 200)}`);
  return token;
};

const fetchList = async (token, reservationType) => {
  const url = `${BASE}/services?numberType=mobile&reservationType=${reservationType}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) die(`${reservationType}: ${response.status} ${response.statusText}`);
  const body = await response.json();
  const rows = Array.isArray(body) ? body : body.data ?? body.services ?? body.items;
  if (!Array.isArray(rows)) {
    die(`${reservationType}: expected a list, got ${JSON.stringify(body).slice(0, 300)}\n`
      + '  The response shape changed — update the field mapping below before trusting a sync.');
  }
  return rows;
};

/* Field names below are the part most likely to drift; each falls back through
   the plausible spellings and the run fails loudly rather than writing nulls. */
const pick = (row, ...names) => {
  for (const name of names) if (row[name] !== undefined && row[name] !== null) return row[name];
  return null;
};

const asPrice = (value) => {
  if (value === null || value === '') return null;
  const number = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/[$,]/g, ''));
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
};

const token = await authenticate();

const previous = JSON.parse(await readFile(target, 'utf8'));
const tiers = previous.rentalTiers;

const merged = new Map();
const row = (id, name, slug) => {
  const existing = merged.get(id);
  if (existing) return existing;
  const fresh = { slug, name, id, sms: null, voice: null, rentals: null, featured: false };
  merged.set(id, fresh);
  return fresh;
};

for (const reservationType of ['verification', 'renewable', 'nonrenewable']) {
  for (const raw of await fetchList(token, reservationType)) {
    const id = pick(raw, 'serviceId', 'targetId', 'id');
    const name = pick(raw, 'serviceName', 'displayName', 'name');
    if (!id || !name) die(`a ${reservationType} row has no id/name: ${JSON.stringify(raw).slice(0, 200)}`);
    const slug = String(pick(raw, 'slug', 'serviceName', 'name')).toLowerCase().replace(/[^a-z0-9]+/g, '');
    const entry = row(id, String(name), slug);

    if (reservationType === 'verification') {
      entry.sms = asPrice(pick(raw, 'smsPrice', 'price'));
      entry.voice = asPrice(pick(raw, 'voicePrice', 'callPrice'));
    } else {
      /* rental pricing arrives per duration; keep it on the tier order the
         page renders rather than whatever order the API returns */
      const byTier = pick(raw, 'prices', 'durations', 'rentalPrices') ?? [];
      const lookup = new Map(
        (Array.isArray(byTier) ? byTier : Object.entries(byTier).map(([k, v]) => ({ duration: k, price: v })))
          .map((item) => [String(pick(item, 'duration', 'label', 'name')).trim(), asPrice(pick(item, 'price', 'amount'))]),
      );
      const prices = tiers.map((tier) => lookup.get(tier) ?? null);
      if (prices.some((price) => price !== null)) entry.rentals = prices;
    }
  }
}

if (merged.size === 0) die('the catalogue came back empty — refusing to overwrite the snapshot');

/* Preserve the curated ordering: anything already promoted keeps its place and
   its flag, new services land alphabetically after it. A sync should never
   silently reshuffle the page. */
const order = new Map(previous.services.map((service, index) => [service.id, index]));
const services = [...merged.values()]
  .map((service) => ({ ...service, featured: previous.services.find((old) => old.id === service.id)?.featured ?? false }))
  .sort((a, b) => (order.get(a.id) ?? 10_000) - (order.get(b.id) ?? 10_000) || a.name.localeCompare(b.name))
  .map(({ featured, ...rest }) => (featured ? { ...rest, featured } : rest));

const before = new Set(previous.services.map((service) => service.id));
const added = services.filter((service) => !before.has(service.id));
const removed = previous.services.filter((service) => !merged.has(service.id));

await writeFile(target, `${JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  source: `${BASE}/services`,
  rentalTiers: tiers,
  services,
}, null, 1)}\n`);

console.log(`sync:services — ${services.length} services written`);
if (added.length) console.log(`  added:   ${added.map((service) => service.slug).join(', ')}`);
if (removed.length) console.log(`  removed: ${removed.map((service) => service.slug).join(', ')}`);
if (!added.length && !removed.length) console.log('  no services added or removed (prices may still have moved)');
