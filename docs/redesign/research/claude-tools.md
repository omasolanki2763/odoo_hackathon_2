# ReWear: CI, security scanning and free hosting research

- **Date checked:** 2026-11-12 (every row below uses this date unless a different one is shown)
- **Scope:** tools for the `omasolanki2763/odoo_hackathon_2` MERN app. `frontend/` is React 19, Vite, react-router and axios. `backend/` is Express, Mongoose, Cloudinary, jest and supertest. Both use npm. The repo is public, the budget is zero, and the owner is in India.
- **Method:** live WebFetch and WebSearch only, nothing from memory. Anything that could not be confirmed on a live page is marked **UNVERIFIED**.
- **Paid-trap flags:** CARD = a card is required. TRIAL = the free part runs out. REMOVED = a free tier was withdrawn or cut. PAUSE = the service stops when you hit the limit.

### Terms used below (plain words)

| Term | Meaning |
|---|---|
| CI (continuous integration) | A robot that runs your install, lint and tests on every push or pull request, so broken code is caught before merge. |
| Matrix | One job definition that runs several times with different values. Example: once for `frontend` and once for `backend`. |
| Path filter | A rule like "only run this when files under `backend/` changed". |
| Required check | A CI job that must pass before GitHub allows a merge. It is set in a branch ruleset. |
| SAST | Static analysis. A tool reads your source code looking for bug patterns such as injection, without running it. |
| Cold start | The delay when a sleeping free server has to boot before it can answer the first request. |
| Monorepo | One git repo holding several packages. Here that is `frontend/` and `backend/`. |

---

## 1) Recommended shortlist (one pick per need)

| Need | Pick | Why this one | What it costs / limits you |
|---|---|---|---|
| CI runner | **GitHub Actions** | Standard GitHub-hosted runners are free for public repos and don't draw from any quota. | $0. Cache storage is 10 GB per repo. If the repo ever goes private, the Free plan includes $12/month of compute instead. |
| Node setup + caching | **`actions/setup-node@v7`** with `cache: npm` and `cache-dependency-path: \| frontend/package-lock.json backend/package-lock.json` | Caches the npm download cache using both lockfiles as the key. The automatic `package-manager-cache` only turns on when a `packageManager` field exists, so set `cache` explicitly. | $0, MIT. It does not cache `node_modules`; `npm ci` still runs. Assumes each package has its own `package-lock.json`. |
| Matrix | `strategy.matrix: { package: [frontend, backend], node: [24, 26] }` with `fail-fast: false` | One job definition tests both packages. Node 26 has been Active LTS since 2026-10-28. Node 24 is in Maintenance LTS until 2028-04-30. Node 20 reached end of life in March 2026, so leave it out. | Four jobs per run, free on a public repo. Drop to `node: [24]` if runs feel slow. |
| Path filtering + required checks | **`dorny/paths-filter@v4`** inside a `changes` job, plus one always-running `ci-ok` aggregate job marked as the required check | Do **not** use workflow-level `on.push.paths`. GitHub leaves a required check stuck as "Pending" when its workflow is skipped by a path filter, which blocks the merge. A job skipped with `if:` counts as passing. | $0. The licence was not shown on the releases page (UNVERIFIED). |
| Branch protection | **GitHub rulesets** that require `ci-ok` and code scanning results | Rulesets are available on public repos with GitHub Free. | $0. |
| SAST | **CodeQL "default setup"** (Settings → Code security) | One click, no YAML needed. It supports JavaScript/TypeScript with no extra configuration. Code scanning is on by default for public repos. | $0 for public repos. Action v4.39.3 was released 04 Nov 2026. |
| Dependency updates | **Dependabot** with `directories: ["/frontend", "/backend"]`, `groups`, and `cooldown` | Native to GitHub and free. `directories` covers both packages in one entry. `cooldown` delays brand-new releases, with a 3-day default, which reduces exposure to supply-chain attacks. | $0. Expect a weekly batch of pull requests. |
| Vulnerability gate in CI | **`npm audit --omit=dev --audit-level=high`** (run per package) + **`actions/dependency-review-action@v5`** on pull requests | `npm audit` exits non-zero at the chosen severity. Dependency review blocks a PR that *adds* a vulnerable package. | $0. `npm audit` adds no tool to install. Dependency review is MIT and available on public repos (but see conflict note C2). |
| Secret scanning | **GitHub secret scanning + push protection** as the primary layer, plus **`gitleaks/gitleaks-action@v3`** in CI | Push protection rejects a push that contains a known token format before it lands. Gitleaks also catches generic patterns, such as a `MONGO_URI` committed to `.env`. | $0. gitleaks-action needs no licence key on a *personal* account; an organisation would need a free key. Gitleaks is now "feature complete" (security patches only). |
| Supply-chain health score | **`ossf/scorecard-action@v2.5.0`** (later, optional) | Gives a 0–10 score across 18 checks, such as pinned dependencies, token permissions and branch protection. It works as a to-do list for repo hygiene. | $0 for public repos, Apache-2.0. Not needed on day one. |
| Frontend host | **Cloudflare Pages** (or Workers Static Assets) | Static requests are free and unlimited. You get 500 builds a month and there's no non-commercial clause. Vercel Hobby forbids commercial use, and Netlify pauses every site once its 300 credits run out. | $0. 1 concurrent build, 20-min build timeout, 20,000 files, 25 MiB per file. Card requirement UNVERIFIED. |
| Backend host | **Render Free web service** (runner-up: **Northflank Sandbox**, verify at signup) | The free terms are documented in detail. `rootDir: backend` limits deploys to backend changes. Its **"After CI Checks Pass"** auto-deploy waits for green GitHub Actions. | $0, with 512 MB RAM and 0.1 CPU. **Sleeps after 15 min idle, ~1 min cold start.** 750 instance-hours/month, **5 GB outbound/month** (cut from 100 GB in 2026), 500 build minutes/month. Card requirement UNVERIFIED. |
| Database | **MongoDB Atlas M0** | Free forever, no card, and free clusters are available in Mumbai, which keeps latency low from India. | $0. 512 MB storage, 500 connections, 100 ops/s, 10 GB in + 10 GB out per rolling 7 days, one free cluster per project. **Auto-pauses after 30 days with zero connections.** |
| Image storage/CDN | **Cloudinary Free** | Already used by the backend. No card needed. | $0. 25 credits/month, where 1 credit = 1 GB storage, 1 GB bandwidth or 1,000 transformations. Max image 10 MB, max video 100 MB, max 25 MP, Admin API 500 requests/hour. Video bandwidth is paid only. |
| Deploy automation | **Native Git integrations**: Render (`rootDir` + "After CI Checks Pass") and Cloudflare Pages (root dir `frontend`) | You don't write deploy YAML or store deploy secrets in GitHub. The host deploys only after CI is green. | $0. Fallback: call a Render **Deploy Hook** URL with `curl` from Actions. Keep the URL in a repo secret, because anyone with it can trigger deploys. |

**Why not the other backend hosts.**
- **Koyeb** requires a card with a $29 pre-authorisation hold (CARD).
- **Fly.io** gives a $1 / 7-day trial, then a card is required (CARD, TRIAL).
- **Railway** gives a $5 / 30-day trial, then $1/month of credit. That is not enough for a server that stays up all month (TRIAL).

**Cost of the Render pick in plain words.** The first visitor after 15 idle minutes waits about a minute. Also, 5 GB a month is small if the API ever serves images itself. Keep images on Cloudinary so the API only sends JSON.

---

## 2) Full tool table

Legend: Fits = fits this stack. Dates are release or changelog dates. A "(yr inferred)" note means the page showed only day and month, and the year was taken from the © 2026 footer and version ordering.

### 2a. CI (GitHub Actions)

| Tool | URL | Checked | Problem it solves here | Cost / free limits | Licence | Fits? | Maintenance evidence |
|---|---|---|---|---|---|---|---|
| GitHub Actions (hosted runners) | https://docs.github.com/en/billing/concepts/product-billing/github-actions | 2026-11-12 | Runs install/lint/test for both packages on every PR | Public repos: standard runners free, no quota used. Private on Free plan: $12/month of compute, 500 MB artifacts, 10 GB cache per repo. | Proprietary service | Yes. The repo is public. | Billing doc is live. Self-hosted runner fee changes: none mentioned on the page (UNVERIFIED either way). |
| actions/setup-node | https://github.com/actions/setup-node | 2026-11-12 | Installs Node and caches npm downloads keyed on both lockfiles | Free | MIT | Yes. Use `cache: npm` and a multi-line `cache-dependency-path`. | v7.1.0, 08 Oct 2026 (yr inferred), https://github.com/actions/setup-node/releases |
| actions/checkout | https://github.com/actions/checkout/releases | 2026-11-12 | Checks out the repo in each job | Free | MIT (UNVERIFIED, not shown) | Yes | v7.0.1, 20 Jul 2026 (yr inferred). GitHub's Pages docs still show `@v6`; both are valid majors. |
| Matrix strategy | https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations | 2026-11-12 | One job runs for `frontend` and `backend` × Node versions | Free | n/a (feature) | Yes. Use `fail-fast: false` so one failing package doesn't hide the other's result. | Live doc |
| Node.js LTS lines (for the matrix) | https://github.com/nodejs/release | 2026-11-12 | Choosing which Node versions to test | Free | MIT | Yes. Use 24 and 26. | 26 Active LTS since 2026-10-28, EOL 2029-04-30. 24 Maintenance until EOL 2028-04-30. 22 EOL 2027-04-30. 20 EOL (Mar 2026). |
| dorny/paths-filter | https://github.com/dorny/paths-filter | 2026-11-12 | Detects whether `frontend/` or `backend/` changed so jobs can be skipped *without* breaking required checks | Free | UNVERIFIED (not shown on releases page) | Yes | v4.0.3, 05 Aug 2026 (yr inferred), https://github.com/dorny/paths-filter/releases |
| Workflow-level `paths:` filter | https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks | 2026-11-12 | Same goal, built in | Free | n/a | **No, as a required check.** A workflow skipped by path filtering leaves its checks "Pending" and blocks the merge. | Read via search summary (direct fetch of the old URL returned 404). Community request: https://github.com/orgs/community/discussions/44490 |
| Rulesets / branch protection | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets | 2026-11-12 | Makes `ci-ok` and code scanning required before merge | Free on public repos ("available in public repositories with GitHub Free", per the search summary of current docs) | n/a | Yes | Live doc. The fetched page itself mentioned only Team/Enterprise, so the wording conflicts (see C3). |

### 2b. Security scanning

| Tool | URL | Checked | Problem it solves here | Cost / free limits | Licence | Fits? | Maintenance evidence |
|---|---|---|---|---|---|---|---|
| CodeQL (code scanning, default setup) | https://docs.github.com/en/code-security/code-scanning/enabling-code-scanning/configuring-default-setup-for-code-scanning | 2026-11-12 | SAST for Express routes (injection, unsafe redirects) and React code | Free for public repos. Code scanning is "enabled for public repositories by default". | Action: UNVERIFIED (not shown). CodeQL CLI terms: UNVERIFIED. | Yes. JS/TS needs no special config. | codeql-action v4.39.3 + v3.39.3, 04 Nov 2026, https://github.com/github/codeql-action/releases. CodeQL ≤2.22.3 is being dropped in the next minor release. |
| GitHub secret scanning + push protection | https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security | 2026-11-12 | Stops Mongo URIs, Cloudinary keys and JWT secrets from being pushed | Free on public repos (on by default) | Proprietary | Yes | Live doc |
| Dependabot alerts + version updates | https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file | 2026-11-12 | Weekly PRs bumping deps in both folders. Alerts on known CVEs. | Free. Alerts are "included in all plans". | Proprietary | Yes. Supports `directories`, `groups` (`group-by: dependency-name`), `cooldown` (3-day default), and schedule from daily to yearly or cron. | Live doc |
| Dependabot security updates | https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates | 2026-11-12 | Auto-PRs that fix a vulnerable dependency | Needs dependency graph + alerts enabled. Price not stated (UNVERIFIED, very likely free). | Proprietary | Yes | Live doc |
| npm audit | https://docs.npmjs.com/cli/v11/commands/npm-audit | 2026-11-12 | CI gate that fails on high/critical vulnerable deps | Free (part of npm) | npm CLI licence: UNVERIFIED (not shown) | Yes. `--audit-level=high` sets the fail threshold but doesn't filter output. `--omit=dev` audits only runtime deps. `npm audit signatures` checks registry signatures and provenance. | npm v11 docs live |
| actions/dependency-review-action | https://github.com/actions/dependency-review-action | 2026-11-12 | Blocks a PR that *introduces* a vulnerable or badly licensed package | Free on public repos. Private repos need GHAS. | MIT | Yes | `@v5` referenced in the README. Release date UNVERIFIED. |
| Gitleaks (CLI) | https://github.com/gitleaks/gitleaks | 2026-11-12 | Scans git history for secrets (generic + provider patterns) | Free | MIT | Yes | v8.30.1, 21 Mar 2026, https://github.com/gitleaks/gitleaks/releases. **Feature complete: security patches only.** The maintainers moved to Betterleaks. |
| gitleaks-action | https://github.com/gitleaks/gitleaks-action | 2026-11-12 | Runs gitleaks on every push/PR | Free. No licence key needed on a personal account. Organisations need a free key from gitleaks.io. | v2+: custom licence in LICENSE.txt (name not shown). Before v2: MIT. | Yes, while the repo stays under a personal account | v3.0.0, 30 May (year not shown, UNVERIFIED), https://github.com/gitleaks/gitleaks-action/releases |
| TruffleHog | https://github.com/trufflesecurity/trufflehog | 2026-11-12 | Secret scanning that *verifies* whether a found key is live (`--results=verified`) | Free OSS | **AGPL-3.0** | Yes, as an alternative to gitleaks. AGPL doesn't matter for running it in CI. | v3.99.8, 02 Nov 2026 (yr inferred), https://github.com/trufflesecurity/trufflehog/releases. The README example pins `@main`; pin a tag instead. |
| Betterleaks | https://github.com/betterleaks/betterleaks | 2026-11-12 | Successor to gitleaks by the same authors | Free | MIT | Not yet. v2 has no stable release and there's no official GitHub Action. | Releases section empty. v1 maintained on the `v1.x` branch. |
| OpenSSF Scorecard (action) | https://github.com/ossf/scorecard-action | 2026-11-12 | Scores repo security hygiene across 18 checks, publishes a badge, feeds Code Scanning alerts | Free for public repos. Needs `id-token: write` (+ `security-events: write`). | Apache-2.0 | Yes, as an optional later step | v2.5.0, 12 Oct 2026 (yr inferred), https://github.com/ossf/scorecard-action/releases. Checks listed at https://scorecard.dev/ |

### 2c. Hosting: static frontend

| Tool | URL | Checked | Problem it solves here | Cost / free limits | Licence | Fits? | Maintenance evidence / traps |
|---|---|---|---|---|---|---|---|
| **Cloudflare Pages** | https://developers.cloudflare.com/pages/platform/limits/ | 2026-11-12 | Hosts the Vite `dist/` build from Git | Free: 500 builds/month, 1 concurrent build, 20-min timeout, 20,000 files, 25 MiB max per file, 100 custom domains/project. Bandwidth limit not listed. | Proprietary | Yes | Live doc. Card requirement UNVERIFIED. SPA fallback on Pages UNVERIFIED. Git build watch-paths UNVERIFIED. |
| Cloudflare Workers Static Assets | https://developers.cloudflare.com/workers/platform/pricing/ | 2026-11-12 | Same job, on the newer platform | Free: "Requests to static assets are free and unlimited". 100,000 Worker requests/day, 10 ms CPU each. | Proprietary | Yes. SPA routing via `not_found_handling: "single-page-application"` (verified in the migration guide). | Migration guide says Workers has a "distinctly broader set of features". No Pages deprecation stated. |
| Vercel Hobby | https://vercel.com/docs/plans/hobby | 2026-11-12 | Git-push deploys of `frontend/` | Free: 100 GB Fast Data Transfer, 1M CDN requests, 1M function invocations, 4 active CPU-hours, 100 deployments/day, 200 projects. **Non-commercial, personal use only.** Over a limit, you wait 30 days. | Proprietary | Partly. Fine for a portfolio, but breaks if ReWear becomes a business. | Doc last updated 2026-09-14. **REMOVED (partial):** since 16 Sep 2026, Hobby keeps only the 3 latest production + 3 latest deployments of any type, https://vercel.com/changelog/hobby-projects-now-retain-fewer-deployments-to-free-up-storage. Monorepo "skip unaffected" needs npm workspaces, otherwise use Ignored Build Step. |
| Netlify Free (credit-based) | https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/ | 2026-11-12 | Git-push static hosting | Free: **300 credits/month, hard limit.** 15 credits per production deploy, 20 per GB bandwidth, 2 per 10k requests, 10 per GB-hour of functions. Deploy previews and failed deploys are free. | Proprietary | Weak. 300 ÷ 15 = **only 20 production deploys/month** if nothing else is used. | **PAUSE:** when credits run out, "all of your web projects … are paused" and show "Site not available". Credit plans started 4 Sep 2025, rates rebalanced 14 Apr 2026 (per snapdeploy, a secondary source). |
| GitHub Pages | https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits | 2026-11-12 | Static hosting from the same repo, deployed by Actions | Free: 1 GB site, 100 GB/month soft bandwidth, 10 builds/hour soft (not applied to custom Actions workflows), 10-min deploy timeout | Proprietary | Partly. Not allowed for "online business / e-commerce", and ReWear is a marketplace. SPA deep links need a `404.html` workaround (UNVERIFIED, not on the page). | Deploy via `actions/upload-pages-artifact@v4` + `actions/deploy-pages@v4` with `pages: write`, `id-token: write`: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages |

### 2d. Hosting: Node/Express backend

| Tool | URL | Checked | Problem it solves here | Cost / free limits | Licence | Fits? | Maintenance evidence / traps |
|---|---|---|---|---|---|---|---|
| **Render Free web service** | https://render.com/docs/free | 2026-11-12 | Runs `backend/` (Express) from Git | Free: 512 MB RAM, 0.1 CPU, 750 instance-hours/month per workspace. Spins down after **15 min** with no inbound traffic, ~1 min to wake. Hobby workspace includes **5 GB outbound/month** ($0.15/GB after) and **500 pipeline minutes/month**. With no card on file, overages suspend services or disable builds. | Proprietary | Yes | **REMOVED (partial):** Hobby bandwidth cut from 100 GB to 5 GB, announced 23 Apr 2026, migration 1 Aug 2026 (https://jwatte.com/blog/render-com-platform-review.md, https://render.com/pricing.md). Compute-plan renaming dated Aug 26 2026. Free Postgres expires after 30 days (irrelevant, we use Atlas). Card requirement: UNVERIFIED (adding a card triggers a refunded $1 check). Free-tier regions (e.g. Singapore): UNVERIFIED. |
| Northflank Sandbox | https://northflank.com/pricing | 2026-11-12 | Runs backend without sleeping | Free: 2 services, 2 jobs (cron), 1 database add-on, 2 projects, up to $20/month of resources, **"Always on, no sleeping"**, **"No card needed"** | Proprietary | Yes, on paper. It beats Render on sleep. | Only one source (the vendor's own pricing page). Per-service CPU/RAM not listed (UNVERIFIED). Confirm at signup before relying on it. |
| Koyeb | https://www.koyeb.com/docs/faqs/pricing | 2026-11-12 | Runs backend | One free web service per organisation: 512 MB, 0.1 vCPU, 2 GB SSD, Frankfurt or Washington only, scales to zero after 1 h idle | Proprietary | No | **CARD:** "We require a credit card", verified with a **$29 pre-authorisation hold**. Card-free Hobby removed Feb 2026 (snapdeploy, secondary). Being acquired by Mistral AI (deal agreed 17 Feb 2026). No India-near region. |
| Railway | https://railway.com/pricing | 2026-11-12 | Runs backend | Trial: $5 one-time, up to 30 days. Then Free plan: **$1/month credit**, 0.5 GB RAM / 1 vCPU per service, 3 services, 0 custom domains, 3-day logs. Optional "Serverless" sleep after 5–10 min without outbound traffic. | Proprietary | No | **TRIAL.** $1/month won't keep a server up all month (UNVERIFIED by calculation; pricing per GB-hour not fetched). Free plan returned 27 Aug 2025. Trial doc: https://docs.railway.com/reference/pricing/free-trial |
| Fly.io | https://docs.fly.io/about/pricing | 2026-11-12 | Runs backend | No free tier for new organisations. Trial: $1 credit for 7 days, no card to start. Smallest machine $2.19/30 days. Bills under $5/month are waived. | Proprietary | No | **CARD + TRIAL:** a card is required after the trial. Free allowances ended for new customers 7 Oct 2024. |

### 2e. Data and media services

| Tool | URL | Checked | Problem it solves here | Cost / free limits | Licence | Fits? | Maintenance evidence / traps |
|---|---|---|---|---|---|---|---|
| **MongoDB Atlas M0** | https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/ | 2026-11-12 | Hosted MongoDB for Mongoose | Free forever: 512 MB (data + indexes), 500 connections, 100 ops/s, 10 GB in / 10 GB out per rolling 7 days (throttled beyond), 1 free cluster per project, 32 MB sort memory | Proprietary service | Yes | No card: "No credit card required" (https://mongodb.com/cloud/atlas/lp/free-clusters-singapore-mumbai). **Mumbai available.** **PAUSE:** auto-pauses after 30 days with zero connections. Backups conflict, see C1. |
| **Cloudinary Free** | https://cloudinary.com/pricing | 2026-11-12 | Image upload, storage, transforms and CDN for clothing photos | Free: 25 credits/month (1 credit = 1 GB storage **or** 1 GB image bandwidth **or** 1,000 transformations), 3 users, max image 10 MB, video 100 MB, raw 10 MB, 25 MP, Admin API 500 requests/hour (https://cloudinary.com/pricing/compare) | Proprietary | Yes | "No credit card required". Video bandwidth is paid only. What happens when credits are exceeded: UNVERIFIED. |

### 2f. Deploy-from-GitHub automation

| Tool | URL | Checked | Problem it solves here | Cost / free limits | Licence | Fits? | Notes |
|---|---|---|---|---|---|---|---|
| Render auto-deploy "After CI Checks Pass" | https://render.com/docs/deploys | 2026-11-12 | Deploy the backend only when GitHub Actions is green | Free | n/a | Yes | Deploys only if all checks are `success`, `neutral` or `skipped`. With zero checks it does not deploy. |
| Render `rootDir` + `buildFilter` | https://render.com/docs/monorepo-support | 2026-11-12 | Only redeploy when `backend/**` changes | Free | n/a | Yes | Files outside `rootDir` aren't available at build time. Blueprint (`render.yaml`) changes always deploy. |
| Render Deploy Hook | https://render.com/docs/deploy-hooks | 2026-11-12 | Trigger a deploy from an Actions step (`curl -fsS "$RENDER_DEPLOY_HOOK_URL"`) | Free | n/a | Yes (fallback) | The hook URL is a secret. A 404 usually means the hook was regenerated. |
| Vercel Git integration + Root Directory | https://vercel.com/docs/monorepos | 2026-11-12 | Deploy `frontend/` on push | Free (Hobby) | n/a | Yes, if Vercel is chosen | "Skip unaffected projects" needs npm workspaces, otherwise use Ignored Build Step. Doc updated 2026-08-11. |
| Koyeb git deploy (work directory) | https://www.koyeb.com/docs/build-and-deploy/deploy-with-git | 2026-11-12 | Deploy `backend/` on push | Needs a card (see 2d) | n/a | No (card) | `--git-workdir` for the subfolder. `.koyebignore` to skip deploys. |
| GitHub Pages via Actions | https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages | 2026-11-12 | Deploy `frontend/dist` from CI | Free | n/a | Partly (see 2c) | `upload-pages-artifact@v4`, `deploy-pages@v4`, `configure-pages@v5`. |
| Cloudflare Pages Git integration | https://developers.cloudflare.com/pages/platform/limits/ | 2026-11-12 | Deploy `frontend/` on push | Free (500 builds/month) | n/a | Yes | Root directory and build watch-path settings were not fetched (UNVERIFIED). |

### Conflicts and caveats found

- **C1 Atlas backups.** The limits doc says M0 can take a daily snapshot and keep 4. The pricing page says "backup services are not available for the Free tier". Treat backups as **not guaranteed**. Run your own `mongodump` export.
- **C2 Dependency review.** The GHAS overview table says "No" for public repos without Code Security. The action's own README says it is available on any public repository. Trust the README, but confirm on the first PR run.
- **C3 Rulesets.** The fetched `about-rulesets` page mentioned only Team/Enterprise. The search summary of current docs says "available in public repositories with GitHub Free". Confirm in the repo's Settings → Rules.
- **C4 Render specs.** One third-party review lists the free tier at 256 MB. Render's own docs say 512 MB (256 MB is the free Postgres size).
- **C5 Snapdeploy and jwatte** are secondary sources. Snapdeploy is a competing host. Their dates were used only where the vendor's own page agreed or had no date.

---

## 3) Sources consulted

`WS` = WebSearch query (results read from the summary). `DEAD` = dead end (redirect, 404, or no useful data).

| # | URL / query | Used for | Status |
|---|---|---|---|
| 1 | https://render.com/docs/free | Render free sleep, 750 h, Postgres expiry | OK |
| 2 | https://docs.railway.com/reference/pricing/free-trial | Railway trial $5 / 30 days | OK |
| 3 | https://fly.io/docs/about/pricing/ | Fly pricing | DEAD (301 redirect) |
| 4 | https://docs.fly.io/about/pricing | Fly trial, card, machine price | OK |
| 5 | https://www.koyeb.com/pricing | Koyeb free tier | Partial (no specs) |
| 6 | https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/ | Atlas M0 limits | OK |
| 7 | https://cloudinary.com/pricing | Cloudinary credits, no card | OK |
| 8 | https://www.koyeb.com/docs/reference/instances | Koyeb free instance specs | OK |
| 9 | https://railway.com/pricing | Railway Free plan limits | OK |
| 10 | https://vercel.com/docs/plans/hobby | Vercel Hobby limits, non-commercial | OK |
| 11 | https://www.netlify.com/pricing/ | Netlify credit costs | Partial |
| 12 | https://developers.cloudflare.com/pages/platform/limits/ | Cloudflare Pages limits | OK |
| 13 | https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/ | Netlify 300 credits hard limit | OK |
| 14 | https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits | GitHub Pages limits | OK |
| 15 | https://docs.github.com/en/billing/concepts/product-billing/github-actions | Actions free for public repos | OK |
| 16 | https://github.com/actions/setup-node/releases | setup-node v7.1.0 | OK |
| 17 | https://github.com/dorny/paths-filter/releases | paths-filter v4.0.3 | OK |
| 18 | https://github.com/github/codeql-action/releases | CodeQL action v4.39.3 | OK |
| 19 | https://github.com/actions/setup-node | Cache inputs, MIT | OK |
| 20 | https://github.com/gitleaks/gitleaks/releases | gitleaks v8.30.1 | OK |
| 21 | https://github.com/gitleaks/gitleaks-action | Licence-key rules | OK |
| 22 | https://github.com/trufflesecurity/trufflehog/releases | trufflehog v3.99.8 | OK |
| 23 | https://github.com/ossf/scorecard-action/releases | scorecard-action v2.5.0 | OK |
| 24 | https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file | directories, groups, cooldown | OK |
| 25 | https://github.com/gitleaks/gitleaks | MIT, feature-complete notice | OK |
| 26 | https://github.com/trufflesecurity/trufflehog | AGPL-3.0, action usage | OK |
| 27 | https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security | Free security features on public repos | OK |
| 28 | https://docs.npmjs.com/cli/v11/commands/npm-audit | audit-level, omit, signatures | OK |
| 29 | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/troubleshooting-required-status-checks | Skipped required checks | DEAD (404) |
| 30 | https://render.com/pricing | Render plan numbers | DEAD (no numbers rendered) |
| 31 | WS: "github required status checks skipped workflow path filtering Pending docs" → docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks, github.com/orgs/community/discussions/44490 | "Pending" behaviour | OK (via search) |
| 32 | WS: "Render free web service 512 MB RAM 0.1 CPU" → render.com/docs/compute-plans.md, community.render.com | Render specs | OK (via search) |
| 33 | https://github.com/betterleaks/betterleaks | gitleaks successor status | OK |
| 34 | https://render.com/pricing.md | 5 GB bandwidth, 500 build minutes | OK |
| 35 | https://jwatte.com/blog/render-com-platform-review.md | Render 1 Aug 2026 plan change | OK (secondary) |
| 36 | https://render.com/docs/compute-plans-update.md | Compute plan rename (26 Aug 2026) | OK |
| 37 | WS: "Koyeb free tier 2026 credit card required Starter plan" | Koyeb card, Mistral acquisition | OK (via search) |
| 38 | https://developers.cloudflare.com/workers/platform/pricing/ | Static assets free and unlimited | OK |
| 39 | https://render.com/docs/monorepo-support | rootDir, buildFilter | OK |
| 40 | https://www.koyeb.com/docs/faqs/pricing | $29 hold, card required | OK |
| 41 | https://render.com/docs/deploys | "After CI Checks Pass" | OK |
| 42 | https://snapdeploy.dev/state-of-free-hosting | Dated free-tier change timeline | OK (secondary, competitor) |
| 43 | WS: "Vercel changelog Hobby production deployments retention September 2026" | Vercel retention change | OK (via search) |
| 44 | https://www.mongodb.com/pricing | M0 "free forever", backups note | OK |
| 45 | https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/ | Sites paused when credits run out | OK |
| 46 | https://vercel.com/changelog/hobby-projects-now-retain-fewer-deployments-to-free-up-storage | 16 Sep 2026 retention rule | OK |
| 47 | https://vercel.com/docs/monorepos | Root Directory, skip unaffected | OK |
| 48 | https://docs.railway.com/reference/app-sleeping | Railway serverless sleep | OK |
| 49 | WS: "MongoDB Atlas free M0 cluster sign up no credit card required" | Atlas no-card claim | OK (via search) |
| 50 | https://mongodb.com/cloud/atlas/lp/free-clusters-singapore-mumbai | Mumbai free clusters, no card | OK |
| 51 | https://cloudinary.com/documentation/developer_onboarding_faq_free_plan | Cloudinary file limits | DEAD (no numbers) |
| 52 | https://github.com/ossf/scorecard-action | Apache-2.0, permissions, badge | OK |
| 53 | https://northflank.com/pricing | Sandbox: always on, no card | OK |
| 54 | WS: "Cloudinary free plan maximum image file size 10 MB video 100 MB" | Cloudinary file limits | OK (via search) |
| 55 | https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/ | SPA fallback setting | OK |
| 56 | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets | Ruleset availability | Partial (conflicting wording) |
| 57 | https://render.com/docs/deploy-hooks | Deploy hook from Actions | OK |
| 58 | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches | Branch protection availability | DEAD (no availability statement) |
| 59 | https://cloudinary.com/pricing/compare | 10 MB / 100 MB / 25 MP / 500 per hour | OK |
| 60 | https://docs.github.com/en/code-security/code-scanning/enabling-code-scanning/configuring-default-setup-for-code-scanning | CodeQL JS/TS default setup | OK |
| 61 | https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages | Pages deploy actions | OK |
| 62 | WS: "Protected branches are available in public repositories with GitHub Free" rulesets | Rulesets on Free public repos | OK (via search) |
| 63 | https://github.com/actions/checkout/releases | checkout v7.0.1 | OK |
| 64 | https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations | Matrix syntax | OK |
| 65 | https://nodejs.org/en/about/previous-releases | Node lines, v20 EOL | OK |
| 66 | https://www.koyeb.com/docs/build-and-deploy/deploy-with-git | Koyeb work directory | OK |
| 67 | https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates | Security updates availability | Partial (no pricing) |
| 68 | https://github.com/actions/dependency-review-action | Public-repo availability, MIT, v5 | OK |
| 69 | https://scorecard.dev/ | 18 Scorecard checks | OK |
| 70 | https://github.com/gitleaks/gitleaks-action/releases | gitleaks-action v3.0.0 | OK |
| 71 | https://pages.cloudflare.com/ | Pages product page | DEAD (301 redirect) |
| 72 | https://github.com/nodejs/release | LTS and EOL schedule | OK |
| 73 | https://www.cloudflare.com/products/pages/ | Pages bandwidth claim | DEAD (no plan data) |

**Totals:** 66 URLs fetched directly, 7 web searches, 17 distinct sites (domains). The 17 sites are render.com, railway.com, fly.io, koyeb.com, mongodb.com, cloudinary.com, vercel.com, netlify.com, cloudflare.com, docs.github.com, github.com, npmjs.com, nodejs.org, scorecard.dev, northflank.com, snapdeploy.dev and jwatte.com. Dead ends: 8.
