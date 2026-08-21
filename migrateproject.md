# Migrating this Astro project to AWS

How to take the site out of Vercel and serve it from AWS. Written for this
repo specifically (`travis-westbold/textverified`) — what it builds, what
Vercel currently does for us, and how to replicate that on AWS.

---

## 1. What this project actually produces

`npm run build` prerenders every public page to plain static files in
**`dist/`**:

```
dist/
├── index.html              ← /
├── products/index.html     ← /products
├── _astro/                 ← content-hashed CSS/JS (safe to cache forever)
├── fonts/                  ← self-hosted woff2 (no Google Fonts request)
├── tvlogo.png, logo-transparent.png, favicon.svg
```

Important properties:

- **There is no server-side code on the public site.** `output: 'static'` in
  `astro.config.mjs`. Any static file host can serve it.
- **No external runtime dependencies.** Fonts are self-hosted; there are no
  CDN scripts. Nothing breaks by changing hosts.
- **The build enforces a performance budget** (`scripts/check-budget.mjs`,
  run automatically after `astro build`). If the build passes, the output is
  good to ship.
- **URLs are directory-style**: `/products` is `products/index.html` on disk.
  Vercel resolves that automatically; on AWS you must configure it (covered
  below — this is the one thing people forget).

The only non-static surface is the **Keystatic admin** (`/keystatic`), which
only mounts when `KEYSTATIC_GITHUB_CLIENT_ID` is set at build time. See §6 —
short version: it will not run on static AWS hosting, and that's fine.

### One-time config change

`astro.config.mjs` uses the `@astrojs/vercel` adapter. It doesn't hurt a
static build, but once Vercel is out of the picture, remove it:

```js
// astro.config.mjs — delete these two lines
import vercel from '@astrojs/vercel';
  adapter: vercel(),
```

and `npm uninstall @astrojs/vercel`. The build then emits `dist/` only.

### What Vercel currently adds (must be replicated)

From `vercel.json` — these headers are sent on every response:

| Header | Value | Why |
| --- | --- | --- |
| `X-Robots-Tag` | `noindex, nofollow` | **This is a preview site.** Keep this until the team decides to go live, then remove it deliberately. |
| `X-Content-Type-Options` | `nosniff` | Standard hardening |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Standard hardening |

---

## 2. Recommended architecture: S3 + CloudFront

For a static marketing site this is the standard AWS setup — cheap
(cents/month at this traffic), globally cached, nothing to patch.

**S3 bucket** (private) + **CloudFront** (CDN + TLS) in front of it.
Do **not** use S3 website hosting mode with a public bucket; keep the bucket
private and let CloudFront read it via Origin Access Control (OAC).

### 2.1 Bucket

```bash
aws s3 mb s3://textverified-site --region us-east-1
# leave "Block all public access" ON — CloudFront reads via OAC
```

### 2.2 CloudFront distribution

- Origin: the S3 bucket, with **Origin Access Control** enabled (the console
  offers to write the bucket policy for you).
- Viewer protocol policy: redirect HTTP → HTTPS.
- Compression: on (Gzip + Brotli).
- Default root object: `index.html`.

### 2.3 Directory URLs — the required CloudFront Function

`Default root object` only fixes `/`, not `/products`. Attach this
CloudFront Function (viewer request) to the default behavior:

```js
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }
  return request;
}
```

This maps `/products` and `/products/` → `/products/index.html`, matching
how Vercel serves the site today.

### 2.4 Headers — Response Headers Policy

Create a custom Response Headers Policy attached to the default behavior:

- `X-Robots-Tag: noindex, nofollow`  ← while this is a preview
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

(CloudFront's managed "SecurityHeadersPolicy" covers the second two, but you
need a custom policy anyway for `X-Robots-Tag`, so put all three in one.)

### 2.5 Caching

Two cache behaviors:

| Path | Cache-Control (set on upload) | Notes |
| --- | --- | --- |
| `/_astro/*` | `public, max-age=31536000, immutable` | Content-hashed filenames — never stale |
| everything else | `public, max-age=0, must-revalidate` | HTML/fonts/images revalidate each deploy |

The `aws s3 sync` commands in §4 set these.

### 2.6 Domain + TLS (when ready)

- Request a cert in **ACM us-east-1** (CloudFront requirement) for the
  domain, DNS-validate it in Route 53 (or wherever DNS lives).
- Add the domain as an Alternate Domain Name on the distribution and point
  DNS at it (Route 53 alias record, or CNAME elsewhere).

Until then the distribution's `dxxxx.cloudfront.net` URL works exactly like
the `*.vercel.app` preview URL.

---

## 3. Alternative: a plain EC2 / Lightsail server with nginx

If the team specifically wants a server box (e.g. to colocate with other
services), serve `dist/` with nginx. Smallest instance is plenty
(t4g.nano / $3.50 Lightsail). The important part is the config:

```nginx
server {
  listen 80;
  server_name _;
  root /var/www/textverified/dist;

  # directory-style URLs, same behavior as Vercel cleanUrls
  location / {
    try_files $uri $uri/index.html $uri/ =404;
  }

  # hashed assets: cache forever
  location /_astro/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  # preview headers — drop X-Robots-Tag at go-live
  add_header X-Robots-Tag "noindex, nofollow" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  gzip on;
  gzip_types text/html text/css application/javascript image/svg+xml;
}
```

Deploy = build locally (or in CI) and rsync:

```bash
npm ci && npm run build
rsync -az --delete dist/ server:/var/www/textverified/dist/
```

Put TLS on it with certbot/Let's Encrypt or an ALB + ACM cert. But note:
you now own OS patching, TLS renewal, and scaling — for a static site,
S3 + CloudFront (§2) does all of that for you.

*(Third option: AWS Amplify Hosting is the closest one-click analog to
Vercel — connect the GitHub repo, it builds and hosts on push. Fine choice
if minimal ops matters more than control; custom headers go in a
`customHttp.yml`.)*

---

## 4. CI/CD from the GitHub repo

The repo already auto-deploys to Vercel on push. The AWS equivalent with
GitHub Actions (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]

permissions:
  id-token: write   # OIDC — no long-lived AWS keys in GitHub
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build   # includes the performance budget check

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<ACCOUNT_ID>:role/textverified-deploy
          aws-region: us-east-1

      # hashed assets first, long cache
      - run: >
          aws s3 sync dist/_astro s3://textverified-site/_astro
          --cache-control "public, max-age=31536000, immutable"
      # everything else, revalidate
      - run: >
          aws s3 sync dist s3://textverified-site
          --exclude "_astro/*" --delete
          --cache-control "public, max-age=0, must-revalidate"

      - run: >
          aws cloudfront create-invalidation
          --distribution-id <DIST_ID> --paths "/*"
```

Set up the `textverified-deploy` IAM role with a GitHub OIDC trust policy
(scoped to `repo:travis-westbold/textverified:ref:refs/heads/main`) and a
policy allowing `s3:PutObject/DeleteObject/ListBucket` on the bucket plus
`cloudfront:CreateInvalidation` on the distribution. This avoids storing
AWS access keys in GitHub secrets entirely.

---

## 5. Cutover checklist

1. [ ] Remove the `@astrojs/vercel` adapter (§1) and confirm `npm run build`
       still passes the budget check.
2. [ ] Stand up S3 + CloudFront (§2) — function, headers policy, caching.
3. [ ] First manual deploy (`aws s3 sync` as in §4), then verify on the
       `*.cloudfront.net` URL:
       - [ ] `/` and `/products` both load (directory rewrite works)
       - [ ] `curl -I` shows `x-robots-tag: noindex, nofollow`
       - [ ] fonts load from same origin (no external requests)
4. [ ] Add the GitHub Actions workflow; verify a push deploys.
5. [ ] Point the real domain via ACM + Route 53 when the team is ready.
6. [ ] **At go-live only:** remove `X-Robots-Tag` from the response headers
       policy and add a `robots.txt`/sitemap if wanted.
7. [ ] Decommission: disconnect the Vercel git integration on the
       `textverified-astro` project (or delete the project) so the two hosts
       don't drift.

---

## 6. Keystatic (content editing) on AWS

The Keystatic admin at `/keystatic` needs its two auth API routes at
runtime, which static hosting can't serve. It is already conditional: builds
without `KEYSTATIC_GITHUB_CLIENT_ID` are 100% static and ship no Keystatic
code (the budget check enforces this). On AWS, either:

- **Keep editing local** (current default): run `npm run dev`, edit at
  `localhost:4321/keystatic`, changes write to `src/content/` and deploy on
  push like any commit. Zero AWS changes needed. **Recommended.**
- Or host the admin separately later (it needs a small serverless runtime —
  Lambda@Edge/Amplify SSR) — only worth it if non-technical editors need a
  hosted UI.

Content itself is just YAML in `src/content/` — it travels with the repo,
nothing to migrate.
