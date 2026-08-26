import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';

/* The Keystatic admin (/keystatic + its two auth API routes) is the ONLY
   non-static surface; every public page stays fully prerendered, and the
   budget script fails the build if a Keystatic chunk ever leaks into them.
   The admin mounts in dev (local storage: edits write straight to
   src/content/) and in production only when the GitHub App env vars are
   configured on Vercel — a build without them is 100% static. */
const keystaticEnabled = process.env.NODE_ENV === 'development' || Boolean(process.env.KEYSTATIC_GITHUB_CLIENT_ID);

export default defineConfig({
  output: 'static',
  adapter: vercel(),
  redirects: {
    '/contact-us/form': 'https://www.textverified.com/contact-us/form',
  },
  /* Astro's default inlines any bundled stylesheet under ~4kB. With four
     pages sharing the hero field styles that chunk fell under the line and
     was copied into every page's HTML instead of being fetched once and
     cached. Keep stylesheets external: smaller HTML, one shared file. */
  build: { inlineStylesheets: 'never' },
  // Keystatic's client-only React island imports react-dom/client directly.
  // Pre-bundle it so Vite exposes React 18's named client exports in dev.
  // The `createRoot` export is needed to hook into Keystatic.
  vite: { optimizeDeps: { include: ['react-dom/client'] } },
  integrations: [react(), ...(keystaticEnabled ? [keystatic()] : [])],
  vite: {
    optimizeDeps: {
      include: ['lodash/debounce', 'lodash/throttle', 'react-dom/client'],
    },
  },
});
