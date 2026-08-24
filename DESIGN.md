# Design System

How a new page is built so it looks like it belongs. `AGENTS.md` holds the
rules and the Git workflow; `WORKFLOW.md` holds the review process; this file
holds the visual system. Read `AGENTS.md` first — the two rules under
**Design and motion** there (the Swoosh, and mocks never resizing) are the ones
most often broken, and they are restated here with the reasoning.

The site is Astro 5, static, English-only. Copy lives in YAML under
`src/content/`, gated by zod schemas in `src/content.config.ts`. Layout,
icons and motion are code. A page is a thin `.astro` file that reads its YAML
and arranges components — put no copy in the page itself.

---

## 1. Page skeleton

```astro
<BaseLayout title={meta.title} description={meta.description} canonical={meta.canonical}>
  <Header current="products" />   {/* omit `current` unless the page is under Products */}
  <main>
    …hero, then alternating sections…
    <SignupCta {...signupCta} />  {/* the blue closing band — every page ends here */}
  </main>
  <Footer />
</BaseLayout>
```

`BaseLayout` owns `<head>`, the font preload, and the no-JS fallback. The
header is `position: fixed` and white, so the first section pads for it:
`padding-top: calc(var(--header-height) + clamp(2.75rem, 5.5vw, 5.25rem))`.
Anything with an `id` that gets linked to needs
`scroll-margin-top: var(--header-height)`.

New page checklist: `src/pages/<name>.astro`, `src/content/pages/<name>.yaml`,
a collection in `src/content.config.ts`, and outbound URLs referenced by key
through `src/config/links.ts` — never hard-coded.

**One YAML trap, and it fails silently.** Inside a flow mapping —
`- { title: …, text: … }` — a comma ends the value. Copy written that way is
cut at its first comma, the remainder is parsed as another key, and zod drops
it as unknown, so the build passes and the sentence is simply short on the
page. Write any copy that contains a comma as a block scalar instead:

```yaml
- title: Queue your run.
  text: >-
    Create verifications for any of our supported services, one at a
    time or thousands in parallel.
```

---

## 2. Tokens

From `src/styles/global.css`. Use these before inventing a value.

| Token | Value | Use |
|---|---|---|
| `--brand` | `#0069a8` | primary blue on light grounds |
| `--brand-light` | `#1e8fd6` | gradient partner for `--brand` |
| `--cyan` | `#38d3ff` | emphasis on dark grounds, focus ring |
| `--text` | `#0f172b` | body text on light |
| `--text-muted` | `#53627a` | secondary text on light (default) |
| `--text-muted-dark` | `#a9bcd8` | secondary text on dark grounds |
| `--text-muted-card` | `#5b6b82` | secondary text in card bodies |
| `--surface-subtle` | `#f5f7fa` | quiet fills |
| `--surface-blue` | `#f2f8ff` | selected / active tint |
| `--border` | `#e5eaf0` | hairlines on light |
| `--border-blue` | `#d9ebfa` | hairlines on blue tint |
| `--header-height` | `4.85rem` | fixed header (`4.5rem` under 560px) |
| `--shell` | `min(80rem, 92vw)` | page gutter, via `.shell` |
| `--font` | Plus Jakarta Sans variable 200–800 | self-hosted, latin subset |

Recurring values that are **not** tokens but are conventions:

- **Easing:** `cubic-bezier(.22,1,.36,1)` everywhere. There is no second curve.
- **Status colours** (from `mock.css`): ok `#0f8a55` on `#eafaf1`; warn
   `#a86f0d` on `#fff7e8`; info `#1d6fa8` on `#eaf4fd`; danger `#c93a3a`.
- **Accent trio** for multi-item animation, when one blue would read flat:
   `#3ba9ff` blue, `#37e0a0` green, `#a877ff` purple (see `UseCases.astro`).

---

## 3. Grounds and the page rhythm

Four grounds. Sections alternate — **never two of the same ground in a row.**

```css
.dark  { color: white; background: linear-gradient(180deg, #070d1a 0%, #0a1424 55%, #0f172b 100%); }
.deep  { color: white; background: linear-gradient(180deg, #0f172b 0%, #070d1a 100%); }
.light { color: var(--text); background: linear-gradient(180deg, white 0%, #f2f5f9 100%); }
```

Plus the blue CTA band, used once, to close: `linear-gradient(112deg, #3358ef, #2f7fe8 42%, #25a6f2)`.

The products page is the reference rhythm: dark hero → light → dark → light →
dark → light → deep → light → dark → blue CTA. `deep` is a darker beat used
sparingly to keep a long dark run from looking identical to the last one.

Two rules that follow from this and are easy to get wrong:

- A `tone` prop must set the **kicker, heading emphasis, lede, and step
  markers** together — not just the background. Grep `.product.light` in
  `ProductSection.astro` for the full set.
- White cards on a dark section must re-declare `color: var(--text)`, or the
  section's white text cascades in and the titles go invisible. This has
  happened; see the comment in `ExtrasGrid.astro`.

---

## 4. Section anatomy

Almost every full-width section is: **kicker → h2 → lede → content**, centred,
on a `.shell`. Copy this and change the content, rather than restyling.

```astro
<section class:list={['thing', tone]} aria-labelledby="thing-heading" data-reveal>
  <div class="shell">
    <header class="head up">
      <span class="kicker">{kicker}</span>
      <h2 id="thing-heading">{heading}</h2>
      <p>{lede}</p>
    </header>
    …
  </div>
</section>
```

```css
.thing  { padding: clamp(3.75rem, 7.5vw, 6.25rem) 0; }
.head   { max-width: 44rem; margin: 0 auto clamp(2.1rem, 4.5vw, 3.25rem); text-align: center; }
.kicker { display: inline-flex; padding: .38rem .88rem; border-radius: 999px;
          font-size: .72rem; font-weight: 700; letter-spacing: .13em; text-transform: uppercase;
          color: var(--brand); background: rgb(0 105 168 / 8%); border: 1px solid rgb(0 105 168 / 25%); }
/* on dark: */
.dark .kicker { color: #8fd8f5; background: rgb(17 177 234 / 10%); border-color: rgb(17 177 234 / 30%); }
h2      { margin: 1rem 0 0; font-size: clamp(1.63rem, 3vw, 2.5rem); font-weight: 800;
          letter-spacing: -.028em; line-height: 1.14; }
.head p { margin: .95rem 0 0; font-size: clamp(.94rem, 1.15vw, 1.06rem); line-height: 1.7; }
```

Hero `h1` is the only larger step: `clamp(2rem, 3.9vw, 3.25rem)`,
`letter-spacing: -.03em`, `line-height: 1.12`. There is no `h3` scale in
section bodies — card titles are `<strong>` at `.97rem/800`.

**Two-column sections** (copy beside a device mock) use `ProductSection.astro`
rather than hand-rolled markup: `minmax(0,.92fr) minmax(0,1.08fr)`, gap
`clamp(2.1rem, 5vw, 4.75rem)`, with `flip` to swap sides and copy always first
once stacked.

---

## 5. Cards

One card recipe, used by `ExtrasGrid` and `UseCases`. Don't fork it.

```css
.card { padding: 1.38rem; background: white; border-radius: 1.13rem;
        border: 1px solid rgb(15 23 43 / 9%);
        box-shadow: 0 1px 2px rgb(15 23 43 / 5%), 0 1.13rem 2.5rem -1.88rem rgb(15 23 43 / 50%); }
.card:hover { border-color: rgb(0 105 168 / 35%); transform: translateY(-3px); }
.card strong { display: block; font-size: .97rem; font-weight: 800; }
.card p      { margin: .5rem 0 0; color: var(--text-muted-card); font-size: .84rem; line-height: 1.6; }
```

Grid gap is `clamp(.88rem, 1.8vw, 1.38rem)`. Icon chips are 2.38rem, radius
.75rem, `rgb(0 105 168 / 9%)` fill with a `rgb(0 105 168 / 22%)` border and a
1.1rem stroked SVG at `stroke-width: 2`.

**Card copy must be concise** — keep body text to **1–2 lines**. This ensures cards
remain roughly even in length across a row and the grid doesn't read lopsided.
If a card needs more than 2 lines, trim the copy; never stretch sibling cards to
match it. Test at mobile widths as well as desktop, since text reflow can push
two lines into three.

---

## 6. Buttons

Global, in `global.css`. Reuse; do not add variants.

| Class | Use |
|---|---|
| `.button .button-primary` | the one real action per section; blue gradient pill |
| `.button .button-inverse` | secondary **on dark** |
| `.button .button-outline` | secondary **on light** |
| `.button .button-quiet` | tertiary, header-weight |
| `+ .button-large` | hero sizing (`min-height: 3.15rem`) |

Primary buttons carry a trailing `<span aria-hidden="true">→</span>`. Under
560px, hero buttons go full-width (`flex: 1 1 100%`).

---

## 7. The Swoosh

The hand-drawn underline. `<span class="mark">` wraps **only** the emphasised
`<em>` — preceding and following words sit outside it.

```astro
{hero.mark.pre} <span class="mark"><em>{hero.mark.em}</em><Swoosh /></span> {hero.mark.post}
```

- `<em>` is not italic; it takes `--cyan` on dark, `--brand` on light.
- **`ink` must track the ground.** Default is cyan with a glow, for dark
  grounds. `<Swoosh ink />` is solid `#0069a8` for light grounds. A cyan
  swoosh on white is a bug.
- The `mark` schema is `{ pre?, em, post? }`. `post` exists so the emphasis can
  sit mid-phrase — "SMS *and* Voice" — rather than always trailing.
- It draws itself once on scroll-in, and is drawn immediately under reduced
  motion. One `<Swoosh />` per heading.

---

## 8. Motion

Three separate mechanisms. Pick the right one.

**a. Entrance choreography** — every section. Put `data-reveal` on the section
and `.up` on the things that arrive; the page's IntersectionObserver
(threshold `0.18`) adds `.revealed` once and stops watching.

*Threshold detail:* `0.18` triggers entrance when ~18% of a section is visible.
If sections feel "too early" or "too late", test values between `0.12–0.25`.
Adjust in `ProductSection.astro` and test across mobile widths, where scroll
speed and section heights vary most.

```css
.up { opacity: 0; transform: translateY(1.5rem);
      transition: opacity 800ms cubic-bezier(.22,1,.36,1), transform 800ms cubic-bezier(.22,1,.36,1); }
.thing.revealed .up { opacity: 1; transform: none; }
.card.up:nth-child(2) { transition-delay: 90ms; }  /* 90ms per sibling */
```

**b. A sequence that plays once** — declare it with `both` fill and
`animation-play-state: paused`, then release it on `.revealed`. Pausing holds
the delay too, so a staggered sequence can't be half-missed by a late scroll.

```css
.piece { animation: name 6s ease-in-out both; animation-delay: var(--delay); animation-play-state: paused; }
.thing.revealed .piece { animation-play-state: running; }
```

**c. A looping demo** — must use `runWhileVisible` from `src/scripts/demo.ts`,
which sets `data-animation-state` and is backed by a global rule that pauses
every descendant animation off-screen. Loops that don't use it stack up.

Rules for all three:

- Animate `transform` and `opacity` only. No `backdrop-filter`. No scroll- or
  pointer-driven transforms on **large layered elements** (more than 3 overlapping
  stacked z-index layers, or any composited layer spanning >50% viewport height).
  No infinite animation across a whole field of elements.
- Stagger with a fixed table of unordered delays, not `index * n` — an
  arithmetic sequence reads as a top-to-bottom wave rather than as arrival.
  Fixed, not random, so every build and visitor sees the same thing.
- Every animation needs a `prefers-reduced-motion: reduce` **and**
  `prefers-reduced-data: reduce` branch that settles on the finished state —
  not the starting one.
- `overflow: hidden` silently creates a scroll container, which captures a
  `view-timeline` declared inside it. If a scroll-linked effect does nothing,
  this is why: name the timeline on the element that actually scrolls.

---

## 9. Mocks must not resize

The strongest rule on this site, and the one the designer is most sensitive to.

Every mock, demo and animated row **reserves space for its largest state**.
Text and elements inside may change; the frame around them must never grow or
shrink mid-demo, and content must never overflow the space reserved for it.

In practice: a status banner that swaps between three messages gets a
`min-height` sized to the longest one; a field that types gets a `min-height`;
a word that fades in is laid out from the first frame at `opacity: 0` rather
than being inserted. Check swapping copy and anything that appears or
disappears **at mobile widths as well as desktop** — narrow columns are where
a one-line box becomes two.

---

## 10. Mocks and device frames

The product screenshots are rebuilt as live DOM — there are no images on this
site. `Laptop.astro` and `Monitor.astro` are the frames; both take a `width`
and establish a container-query context, so a screen sizes itself off the
frame:

```astro
<Laptop width="min(40rem, 100%)"><SmsScreen /></Laptop>
```

Everything inside is scoped under `.tvm` and sized in `em` from one
`font-size: 1.45cqw` (with a px fallback), so a mock scales with its device
instead of with the viewport. Shared chrome — app shell, modal, browser
window, terminal, payment screen, the four-bar brand loader — is in
`products/mock.css`. Build a new screen from those classes before adding any.

Never show real numbers, addresses or customer data in a mock.

---

## 11. Brand marks

`src/data/icons.ts` holds ~50 inline brand paths on a 24×24 viewBox, keyed by
name (`gmail`, `discord`, `coinbase`…). Components look them up and should
throw at build time on an unknown key, so a content edit fails the build
rather than rendering a hole. If copy names a brand, check the key exists
before writing it into YAML.

`Loader.astro` is the four bars of the Textverified mark in their checkmark
formation. Reuse that geometry for anything "verifying" — it is the brand's
own motion, and reinventing a checkmark makes the page look off-brand.

---

## 12. Performance budget

`npm run build` fails on the budget in `scripts/check-budget.mjs`, per page,
in gzip bytes: **html 26,000 · css 13,000 · js 6,000 · first-load 42,000 ·
fonts 35,000 total**. Warns at 90%.

The homepage already sits at ~98% of the HTML budget. If a change fails it,
**optimise the change — do not raise the number.** Inline SVG is usually the
culprit; run it through svgo at a precision suited to its viewBox. The budget
ratchets down as pages get lighter, never up without a decision.

The build also fails if a page references Google Fonts or leaks a Keystatic
chunk. The floor is low-end hardware on a slow connection.

---

## 13. Before calling a page done

- `npm run build` passes — checks, types and budget.
- Grounds alternate; no two adjacent sections share one.
- Each `Swoosh` underlines only the blue words, and `ink` matches its ground.
- Nothing resizes mid-animation, at mobile width as well as desktop.
- Reduced-motion and reduced-data settle on the finished state.
- Copy is in YAML, links are by key, and no new colour was hard-coded where a
  token exists.
