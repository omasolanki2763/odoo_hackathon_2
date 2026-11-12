# ReWear redesign — tool system

Checked 2026-11-12. Merged from three independent research files, each cross-reviewed:

| File | Owner | Sources |
|---|---|---|
| [research/antigravity-tools.md](research/antigravity-tools.md) | Antigravity | 63 |
| [research/opencode-tools.md](research/opencode-tools.md) | OpenCode | 72 URLs / 48 domains |
| [research/claude-tools.md](research/claude-tools.md) | Claude | 66 pages / 17 domains |

All picks are free or open source. Licences, versions and maintenance evidence are in the research files.
Every new dependency still needs Om's approval before it is installed.

## Build

| Need | Pick | Why it fits here |
|---|---|---|
| UI primitives | Radix Primitives (Dialog, Popover, Select, Tabs) + hand-written components | Accessible behaviour without a visual style; no component kit look (Mantine, Chakra, shadcn rejected). |
| Styling | Native CSS custom properties (`tokens.css`) + CSS Modules | Built into Vite 7; no build plugin; tokens are plain CSS. |
| Icons | Lucide React | ISC licence, tree-shakable, replaces emoji-as-icon. |
| Motion | CSS transitions + View Transitions | No JS animation runtime needed for this app. |
| Lint / format | ESLint 9 (existing) + Prettier | |

## Verify

| Need | Pick |
|---|---|
| Frontend unit / component tests | Vitest + React Testing Library + user-event + jest-dom + jsdom |
| End-to-end + visual regression | Playwright with `toHaveScreenshot` (free, no SaaS) |
| Accessibility | `@axe-core/playwright` inside the Playwright suite |
| Performance budgets | Lighthouse CI (`@lhci/cli`) |
| Backend tests | Jest + Supertest (existing) + mongodb-memory-server, binary cached via `MONGOMS_DOWNLOAD_DIR` |

## CI, security, deploy

| Need | Pick | Cost / limit that matters |
|---|---|---|
| CI | GitHub Actions, `setup-node` with npm cache on both lockfiles | Free on a public repo. |
| Required check | One aggregate `ci-ok` job; path filtering done *inside* jobs (`dorny/paths-filter`) | Workflow-level path filters leave required checks stuck on "Pending". |
| Code scanning | CodeQL default setup | Free for public repos. |
| Dependencies | Dependabot (both folders) + `npm audit --omit=dev --audit-level=high` + `dependency-review-action` | |
| Secrets | GitHub push protection (enabled) + gitleaks-action | |
| Frontend hosting | Cloudflare Pages | Unlimited static requests, 500 builds/month. Vercel Hobby bans commercial use; Netlify pauses after ~20 deploys of credit. |
| Backend hosting | Render Free | Sleeps after 15 min idle, ~1 min cold start, 5 GB/month egress. Koyeb, Fly.io, Railway need a card or are trial-only. |
| Database | MongoDB Atlas M0 (Mumbai) | 512 MB, pauses after 30 idle days. |
| Images | Cloudinary Free | 25 credits/month, 10 MB per image. |

## Design candidates (decided in Phase 3, not here)

Researched by Antigravity, contrast re-verified by Claude (WCAG 2 formula, 2026-11-12):

| Pair | Ratio | Level |
|---|---|---|
| `#1C1917` on `#FAF8F5` | 16.50 | AAA |
| `#2D5A43` on `#FAF8F5` | 7.46 | AAA |
| `#57534E` on `#FAF8F5` | 7.20 | AAA |
| `#FFFFFF` on `#2D5A43` | 7.91 | AAA |
| `#9E4424` on `#FAF8F5` | 5.99 | AA only |
| `#C25E38` on `#FAF8F5` | 4.00 | Large text only |

Fonts proposed: Fraunces Variable + Plus Jakarta Sans (both OFL-1.1).
Open doubt (Claude): a cream background with a soft serif and earth tones is itself a common look
for AI-generated sites in 2025–26. Phase 3 must show at least one direction that does not use it.

## Open items marked UNVERIFIED in the research

Card requirement for Render and Cloudflare; Pages SPA fallback; Render free regions; Fontshare terms;
Atlas M0 backups, dependency review on public repos, rulesets on Free (conflicting sources).
These are re-checked when the task that depends on them starts.
