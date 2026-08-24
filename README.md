# Textverified Astro site

The English-only, static-first implementation of the Textverified marketing
site. **This folder is the app** — it renders the homepage and the `/products`
page, brought up to parity with the approved static comps (repo root) as of
the 2026-08 port: verbatim copy, the products page, and the low-end-hardware
performance decisions all carried over.

**Editing content:** everything word-shaped lives in `src/content/` and is
edited through Keystatic at `/keystatic` (see `EDITING.md`). Schemas in
`src/content.config.ts` gate the build. `npm run build` also enforces a
performance budget (`scripts/check-budget.mjs`); the font is self-hosted
(`public/fonts/`), and the iso tile fields are build-time SVG.

## Structure

- `src/pages/index.astro` — homepage: hero, dashboard showcase, offer cards, CTA, reviews, pricing, FAQ
- `src/pages/products.astro` — product overview: six product sections, each demonstrated by a live DOM mock inside a device frame
- `src/components/` — one component per section; shared primitives:
  - `Laptop.astro` / `Monitor.astro` — device frames (render open/static; the old scroll-driven lid hinge was cut for performance)
  - `IsoField.astro` — the isometric app-tile lattice, rendered at build time, deliberately static
  - `Swoosh.astro` — the hand-drawn brand underline; wrap `headingPre` in a `<span>` with a trailing space before `<span class="mark">…<Swoosh /></span>` so the heading and emphasized phrase stay separated
  - `products/` — the six mock screens (`SmsScreen`, `ExtensionScreen`, `VoiceScreen`, `RentalsScreen`, `ApiScreen`, `CreditsScreen`), the `ProductSection` scaffold, `ExtrasGrid`, and `mock.css` (shared screen styles, scoped under `.tvm`)
- `src/scripts/demo.ts` — `runWhileVisible` + `wait`: demos run only while on screen and never stack loops
- `src/data/` — verbatim copy (`content.ts`), demo services (`services.ts`), brand icon paths (`icons.ts`)
- `src/config/links.ts` — every outbound URL, plus the internal `/products` route
- `src/styles/global.css` — design tokens, global reset, and shared primitives

Static content is rendered into HTML by Astro. JavaScript is limited to
progressive enhancement for the navigation, copy button and the demo loops.
Decorative movement is CSS-only, cheap (composited transforms on small
elements), and disabled by `prefers-reduced-motion`.

## Performance floor: low-end hardware

No scroll- or pointer-driven transforms on large layered elements, no
`backdrop-filter`, no infinite animations on element fields. The mock screens
rebuild the old marketing screenshots in DOM — no images, and no real numbers
or addresses on show.

## Run locally

```sh
npm install
npm run dev
```

`npm run build` type-checks (`astro check`) and emits the static site to `dist/`.
