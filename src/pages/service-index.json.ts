/* The whole catalogue as one small file, built once and served static.
 *
 * The page ships the first screen of services as HTML — that is what a
 * crawler and a JavaScript-less browser see, and what paints first — but the
 * catalogue is far larger than a page's HTML budget allows (the nav already
 * advertises 900+ services). So the rest is fetched by the search box the
 * first time someone uses it: off the first-load path entirely, one request,
 * cached by the CDN like any other static asset.
 *
 * Keys are one character because they repeat once per service; the shape is
 * documented here rather than guessed at the call site.
 *   n name · q searchable text · m methods (s/v/r) · s SMS · v voice · r rental floor
 *   g slug, present only when /service-icons/<g>.webp exists — the tail of the
 *     catalogue gets its icon the same way the first screen does
 */
import type { APIRoute } from 'astro';
import { hasIcon, services } from '../data/catalogue';

export const prerender = true;

const floor = (values: (number | null)[]) => {
  const priced = values.filter((value): value is number => value !== null);
  return priced.length ? Math.min(...priced) : null;
};

export const GET: APIRoute = () => {
  const payload = services.map((service) => {
    const name = service.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    return {
      n: service.name,
      q: name === service.slug ? name : `${name} ${service.slug}`,
      m: `${service.sms !== null ? 's' : ''}${service.voice !== null ? 'v' : ''}${service.rentals?.length ? 'r' : ''}`,
      s: service.sms,
      v: service.voice,
      r: service.rentals?.length ? floor(service.rentals) : null,
      ...(hasIcon(service.slug) ? { g: service.slug } : {}),
    };
  });

  return new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
