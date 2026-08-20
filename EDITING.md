# Editing the site (for everyone in the org)

All the words on the site — headlines, prices, FAQ answers, reviews, menu
labels, link destinations — live in small files under `src/content/`, and you
edit them through a friendly form UI called **Keystatic**. You never touch
code, and you can't break the live site: every change is checked when the
site rebuilds, and if a change doesn't pass, the current site simply stays up.

## How to edit

1. Open `https://textverified-astro.vercel.app/keystatic` and sign in with
   your **GitHub account** (you need access to the
   `travis-westbold/textverified-redesign` repository — ask a developer to
   invite you once).
2. Pick what to edit from the sidebar:
   - **Pages** → Homepage / Products page (headlines, section text, buttons)
   - **Content** → Reviews, Pricing plans, FAQ
   - **Site** → Header navigation, Footer, Link destinations
3. Make your change and press **Save**. That's it — the change becomes a
   commit and the site redeploys itself in a couple of minutes.

Notes:
- Fields labelled "before underline" / "underlined phrase" exist because the
  design draws its hand-drawn underline on the second part.
- FAQ answers and feature bodies allow plain text plus simple links written
  as `<a href="https://…">link text</a>`. Anything else is rejected at build
  time.
- Every item has an **Order** number that controls its position on the page.
- Which pictures, icons and demo screens appear where is layout — that stays
  with the developers.

## For developers

- Dev: `npm run dev` and open `/keystatic` — edits write straight to the
  files in `src/content/`; commit them like any other change.
- The Keystatic field config (`keystatic.config.ts`) mirrors the zod schemas
  in `src/content.config.ts`. If they drift, the build fails loudly — update
  both together.
- The admin is only mounted in production when the GitHub App env vars exist;
  without them the deploy is 100% static (`astro.config.mjs`).

### One-time production setup (not yet done)

1. **Vercel Git integration** — connect the `textverified-astro` Vercel
   project to `travis-westbold/textverified-redesign` (Root Directory
   `astro-prototype`, Production Branch `astro-prototype`). This requires
   installing Vercel's GitHub App on the account — do it in the Vercel
   dashboard under Project → Settings → Git. Until then, saves commit to
   GitHub but nothing redeploys automatically.
2. **Keystatic GitHub App** — run `npm run dev`, open
   `http://127.0.0.1:4321/keystatic`, and follow Keystatic's GitHub-mode
   setup wizard (or create the App manually per keystatic.com/docs). Then set
   on Vercel: `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`,
   `KEYSTATIC_SECRET`, and `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`.
3. Keystatic opens the repo's **default branch**; our production branch is
   `astro-prototype`. Either make it the default branch or have editors pick
   it in Keystatic's branch switcher (top left). Merging the app to `main`
   eventually removes this wrinkle.
4. Editors need GitHub accounts with repo access — if org policy can't
   allow that, revisit the CMS choice (see PROJECT-GUIDE.md).
