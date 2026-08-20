import linksData from '../content/links.json';
import { LINK_KEYS, type LinkKey } from './link-keys';

/* Destinations live in org-editable src/content/links.json; the key list is
   developer-owned in link-keys.ts. Validate the pairing at module load so a
   bad edit fails the BUILD (every page imports this), never the live site. */
const data = linksData as Record<string, unknown>;

const problems = [
  ...LINK_KEYS.filter((key) => typeof data[key] !== 'string').map((key) => `missing or non-string: ${key}`),
  ...Object.keys(data).filter((key) => !(LINK_KEYS as readonly string[]).includes(key)).map((key) => `unknown key (typo?): ${key}`),
  ...LINK_KEYS.filter((key) => typeof data[key] === 'string' && !/^(\/|https:\/\/)/.test(data[key] as string)).map((key) => `must start with / or https:// — ${key}`),
];
if (problems.length) throw new Error(`src/content/links.json is invalid:\n${problems.join('\n')}`);

export const links = linksData as Record<LinkKey, string>;
export type { LinkKey };
