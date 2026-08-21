# Agent Guide

This file contains repository-specific rules. `main` is the production branch;
if the default branch is renamed, use that name rather than assuming `master`.

## Git workflow

Before editing:

1. Run `git status --short --branch`.
2. Run `git fetch origin --prune`.
3. Start a branch for the requested page, feature, or fix.

If `main` is clean, update it before branching:

```sh
git switch main
git merge --ff-only origin/main
git switch -c <branch-name>
```

If `main` already has local commits or changes, create a branch from its current
state first. Do not reset, pull, rebase, or stash before the work is preserved.
If changes of uncertain ownership overlap the task, stop and ask.

Branch names describe the work: `design/<change>`, `dev/<feature>`,
`fix/<issue>`, or `docs/<topic>`. Use hyphens instead of `/` if the local Git
environment requires it. Keep unrelated work on separate branches.

Before handoff or merge:

```sh
git fetch origin --prune
git merge origin/main
npm run build
```

Push the branch and report its name, latest commit, build result, preview URL,
and readiness. Merge to `main` only after explicit approval such as "ship it".
Approved work may merge at the end of the day; unfinished work stays committed
and pushed on its branch. Never push directly to `main` or force-push shared
work. Delete a branch only after confirming its commit is on `origin/main`.

## Stack and commands

- Astro 5 static site; React 18 is installed primarily for Keystatic.
- Keystatic is the only conditional non-static surface. Public pages must stay
  prerendered and must not load Keystatic assets.
- `npm run check`: link policy and Astro diagnostics.
- `npm run build`: full check, static build, and performance budget. Run before
  declaring a branch ready.

Use the versions in `package-lock.json`; do not upgrade framework packages as
part of an unrelated task.

## Non-obvious implementation rules

### Content and links

- Editable copy lives in `src/content/` and is validated by
  `src/content.config.ts`.
- Outbound destinations live in `src/content/links.json`; their allowed keys
  live in `src/config/link-keys.ts`. Access them through
  `src/config/links.ts`, not hard-coded component URLs.
- Public pages are English-only and static-first.

### Astro and browser behavior

- Use Astro components for markup and data known at build time.
- For a small browser interaction, use a native custom element and keep its
  state and DOM access inside the element.
- Use an Astro `<template>` for repeated elements created after a browser API
  request. Use Astro components instead when the content is build-time data.
- Hydrate React only when it substantially clarifies a complex interaction.
  Astro islands limit where React loads; they do not make its runtime smaller.
- Scope scripts to the page or component that uses them.

For example, an API-backed announcements feed can use a custom element and
`<template>`; the build-known products content should use Astro components.

### Design and motion

- Reuse tokens when possible, such as from `src/styles/global.css`: `--brand`, `--brand-light`,
  `--cyan`, `--text`, `--text-muted`, `--surface-subtle`, `--surface-blue`,
  `--border`, `--border-blue`, `--header-height`, `--shell`, and `--font`.
- Reuse `.shell` and the existing `.button*` variants before adding equivalents.
- The font is the self-hosted Plus Jakarta Sans variable file in `public/fonts/`
- Animated demos must use `runWhileVisible` from `src/scripts/demo.ts` so loops
  pause off-screen and cannot stack. Preserve reduced-motion and reduced-data
  behavior.
- Treat large scroll effects, broad backdrop-filter surfaces, and many continuously animated elements as performance-sensitive. Prefer small compositor-friendly animations, pause them off-screen, respect reduced motion, and be mobile and Firefox friendly.
- **The Swoosh underlines only the emphasised (blue) words.** `<span
  class="mark">` wraps the `<em>` and nothing else; any preceding words go
  outside it. This holds site-wide, headings and heroes alike.
- `Swoosh.astro` headings require a trailing space in `headingPre` before the marked span so words remain separated.
- **Mocks must not resize.** Every mock and demo reserves space for its
  largest state; text and elements inside may change, but the frame around
  them must never grow or shrink mid-demo, and its content must never
  overflow the space reserved for it. The designer treats any such movement
  as a defect. Check swapping copy (status banners, typed fields) and
  anything that appears or disappears, at mobile widths as well as desktop.

## Safety boundary

Preserve unexpected work. Do not use destructive Git commands, discard files,
or delete unmerged branches unless the user explicitly requests it.
