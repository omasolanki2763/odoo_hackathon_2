# OpenCode — Tool Research: implementation & verification

- **Agent:** OpenCode
- **Slice:** React 19 component approaches, CSS tooling, animation, icon sets, frontend testing (Vitest + RTL, Playwright, visual regression, a11y), backend testing (Jest, Supertest, mongodb-memory-server)
- **Date checked:** 2026-11-12 (all fetch dates below are this date unless stated otherwise)
- **Repo state verified this session:** frontend `react@^19.1.0`, `react-dom@^19.1.0`, `react-router-dom@^7.6.3`, `axios@^1.10.0`, `vite@^7.0.4`, `@vitejs/plugin-react@^4.6.0`, `eslint@^9.30.1`. Backend `express@^4.18.2`, `mongoose@^7.5.0`, `jest@^29.6.2`, `supertest@^6.3.3`. **No test files exist** under `frontend/src`, `backend/src`, or `backend/scripts` (recursive glob excluding `node_modules`). `npm test` in backend is plain `jest` → exits non-zero with "No tests found" today.
- **Constraint:** budget 0 INR. Every recommendation below is free/open-source for our usage.

Maintenance evidence is the npm registry publish timestamp for the current `latest` version, read from `https://registry.npmjs.org/<pkg>` on 2026-11-12. That is a fact, not a memory claim. Links are the package page so a reviewer can re-check.

---

## 1. What "fits this repo" means here

| Fact | Consequence |
|---|---|
| Vite **7.0.4** installed; Vite 8.3.8 is current (published 2026-11-11) | Anything requiring Vite `^8` is out until we deliberately upgrade. `@tailwindcss/vite@4.3.5` declares `vite: ^5.2 \|\| ^6 \|\| ^7 \|\| ^8`, so it fits as-is. |
| React **19.1.0** installed; React 19.3.1 current (2026-10-14) | Any React library must declare React 19 peer support. RTL 16.3.3 does (`react: ^18 \|\| ^19`, verified in its registry metadata). |
| Express **4.18.2** installed; Express 5.3.0 current (2026-10-09) | Do not add tooling that assumes Express 5. Keep the existing Jest + Supertest pair; both work on 4 and 5. |
| Mongoose **7.5.0** installed; Mongoose 9.12.1 current (2026-11-09) | `mongodb-memory-server@11.3.0` supports Mongoose 7 line for tests; pin it and verify in CI. |
| No tests at all | Verification tooling is not "nice to have"; it is the deliverable's proof. Add it before redesign work, not after. |

---

## 2. Component approach (React 19)

The redesign brief says "must not look AI-generated". That rules out dropping in a fully themed kit (Mantine/Chakra/HeroUI) as the primary look: the default theme is recognisable and produces the generic dashboard aesthetic. The defensible pattern is **owned markup + a small unstyled primitive layer**, styled with our own CSS.

| # | Tool | URL | Date | Problem it solves here | Cost | Licence | Fits React 19 + Vite? | Maintenance evidence |
|---|---|---|---|---|---|---|---|---|
| 2.1 | **shadcn/ui** (CLI `shadcn@4.23.0`) | https://ui.shadcn.com/docs | 2026-11-12 | Copy-in accessible components. **Rejected after cross-review:** shadcn's default visual language *is* the recognisable AI-generated look we are removing, and it drags in Tailwind. Radix directly gives the same behaviour with none of the styling opinions. | Free | MIT (npm `shadcn@4.23.0` metadata) | Yes technically; rejected on design grounds. | `shadcn@4.23.0` published 2026-10-27 |
| 2.2 | **Radix Primitives** (`@radix-ui/react-*`) | https://www.radix-ui.com/primitives | 2026-11-12 | Accessible behaviour (dialog, popover, tabs, select, tooltip) with zero styling, so the visual design stays ours. | Free | MIT (`@radix-ui/react-dialog@1.3.1`) | Yes. Explicit React 19 support. | `@radix-ui/react-dialog@1.3.1` published 2026-10-12 |
| 2.3 | **Ark UI** (`@ark-ui/react`) | https://ark-ui.com/ | 2026-11-12 | Same role as Radix, larger component set (45+), framework-agnostic state machines. Alternative if Radix lacks a widget we need. | Free | MIT (`@ark-ui/react@5.40.0`) | Yes. | `5.40.0` published 2026-10-29 |
| 2.4 | **Base UI** (`@base-ui-components/react`) | https://base-ui.com/ | 2026-11-12 | MUI's unstyled successor to Radix-style primitives. | Free | MIT (`1.0.0-rc.0`) | Yes in theory, **but still `1.0.0-rc.0`** | RC published 2025-12-04, packument modified 2026-07-15. **No stable release after ~11 months → reject for a deadline project.** |
| 2.5 | **Headless UI** (`@headlessui/react`) | https://headlessui.com/ | 2026-11-12 | Unstyled components from Tailwind Labs. | Free | MIT (`2.2.10`) | Yes. | `2.2.10` published 2026-04-07 (7 months). Slower cadence than Radix/Ark; second choice. |
| 2.6 | **Mantine** (`@mantine/core`) | https://mantine.dev/ | 2026-11-12 | 120+ styled components, hooks, utilities. Fastest path to a complete UI. | Free | MIT (`9.8.0`) | Yes. | `9.8.0` published 2026-11-09 |
| 2.7 | **Chakra UI** (`@chakra-ui/react`) | https://chakra-ui.com/ | 2026-11-12 | Styled component system with theming. | Free | MIT (`3.38.0`) | Yes. | `3.38.0` published 2026-11-03 |
| 2.8 | **HeroUI** (`@heroui/react`) | https://www.heroui.com/ | 2026-11-12 | Styled Tailwind-based kit (formerly NextUI). | Free | Apache-2.0 (`3.2.7`) | Yes. | `3.2.7` published 2026-10-28. Site returned 308 redirect on plain GET; package metadata is the evidence used. |
| 2.9 | **daisyUI** (`daisyui@5.8.0`) | https://daisyui.com/ | 2026-11-12 | Tailwind plugin of semantic component classes; no JS runtime. | Free | MIT (`5.8.0`) | Yes, but needs Tailwind. | `5.8.0` published 2026-11-12 |

**Verdict:** Radix Primitives (2.2) + our own CSS is the lowest-risk "not AI-looking" path. **shadcn/ui (2.1) is rejected after cross-review:** its default styling is itself a documented AI-aesthetic tell (Antigravity, `antigravity-tools.md` §7), and adopting it returns us to Tailwind's default visual vocabulary. Mantine/Chakra/HeroUI are speed plays that will read as templated; only use if timeline collapses. Base UI is out (RC). Headless UI is a fallback.

Supporting utilities that shadcn-style code commonly needs (all small, all optional):

| Tool | URL | Date | Cost | Licence | Fits? | Maintenance |
|---|---|---|---|---|---|---|
| class-variance-authority | https://registry.npmjs.org/class-variance-authority | 2026-11-12 | Free | Apache-2.0 (`0.7.1`) | Yes, tiny helper for variant classes | `0.7.1` published 2024-11-26 — stable utility, but stale (2 years). No blocker; no new features needed. |
| tailwind-merge | https://registry.npmjs.org/tailwind-merge | 2026-11-12 | Free | MIT (`3.7.0`) | Yes, only if Tailwind | `3.7.0` published 2026-09-12 |

---

## 3. CSS tooling

| # | Tool | URL | Date | Problem it solves here | Cost | Licence | Fits React 19 + Vite? | Maintenance evidence |
|---|---|---|---|---|---|---|---|---|
| 3.1 | **CSS Modules** (Vite built-in) | https://vite.dev/guide/features#css-modules | 2026-11-12 | Scoped class names with zero runtime and zero dependency. Best fit for a bespoke look. | Free | Part of Vite (MIT) | Yes — `.module.css` works out of the box. | Vite 8.3.8 published 2026-11-11; repo runs 7.0.4. |
| 3.2 | **Native CSS custom properties** (design tokens) | https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties | 2026-11-12 | One token file (colour, spacing, radius, type scale) so the redesign stays consistent and themeable. No dependency. | Free | n/a (web standard) | Yes. | Web standard; no release cadence. |
| 3.3 | **Tailwind CSS v4** (`tailwindcss@4.3.5`) | https://tailwindcss.com/blog/tailwindcss-v4 | 2026-11-12 | Fast utility workflow; v4 is CSS-first and config-free. Useful if several pages must be built quickly. | Free | MIT (`4.3.5`) | Yes. Vite integration is official. | `4.3.5` published 2026-11-11 |
| 3.4 | **@tailwindcss/vite** (`4.3.5`) | https://tailwindcss.com/docs/installation/using-vite | 2026-11-12 | Official Vite plugin: install `tailwindcss` + `@tailwindcss/vite`, add plugin, `@import "tailwindcss";`. | Free | MIT (`4.3.5`) | Yes — peer `vite: ^5.2 \|\| ^6 \|\| ^7 \|\| ^8`, so Vite 7.0.4 is supported. | `4.3.5` published 2026-11-06 |
| 3.5 | **@tailwindcss/postcss** (`4.3.5`) | https://registry.npmjs.org/@tailwindcss/postcss | 2026-11-12 | Only needed if we cannot add the Vite plugin. | Free | MIT | Yes. | `4.3.5` published 2026-11-06 |
| 3.6 | **vanilla-extract** | https://vanilla-extract.style/ | 2026-11-12 | Type-safe, zero-runtime styles authored in TS; compile-time only. | Free | MIT (`@vanilla-extract/css@1.21.3`) | Yes, but adds a compiler step and learning cost. | `1.21.3` published 2026-10-08 |
| 3.7 | **Panda CSS** | https://panda-css.com/ | 2026-11-12 | Build-time, type-safe CSS-in-JS with atomic output. | Free | MIT (`@pandacss/dev@2.5.0`) | Yes, but another codegen step. | `2.5.0` published 2026-11-02 |
| 3.8 | **Open Props** | https://open-props.style/ | 2026-11-12 | Ready-made CSS custom-property design tokens. | Free | MIT (`1.7.23`) | Yes; optional. | `1.7.23` published 2026-01-31 (10 months) — usable but low activity. |
| 3.9 | **Lightning CSS** | https://lightningcss.dev/ | 2026-11-12 | Very fast CSS parser/transformer/minifier. | Free | MPL-2.0 (`1.33.0`) | Yes as a build tool. MPL is file-level copyleft: fine to call it, do not fork and vendor its files without publishing changes. | `1.33.0` published 2026-07-20 |
| 3.10 | **Sass** | https://sass-lang.com/ | 2026-11-12 | Nesting/mixins if the team already knows Sass. | Free | MIT (`1.108.2`) | Yes, but modern CSS nesting and custom properties remove most of the need. | `1.108.2` published 2026-11-11 |
| 3.11 | **PostCSS** | https://postcss.org/ | 2026-11-12 | Plugin pipeline; Tailwind v4 no longer requires it. | Free | MIT (`8.5.32`) | Yes, but redundant for our use. | `8.5.32` published 2026-10-26 |

**Verdict:** CSS Modules + native custom-property tokens is the cheapest path to a non-generic look and needs **zero new dependencies**. Add Tailwind v4 only if we decide utility speed is worth the class-noise; it fits Vite 7 today. Reject vanilla-extract/Panda for this project: extra compiler and concepts for no visual gain.

---

## 4. Icons

All four are tree-shakeable React packages. The deciding factor is maintenance, not icon count.

| # | Tool | URL | Date | Problem it solves here | Cost | Licence | Fits? | Maintenance evidence |
|---|---|---|---|---|---|---|---|---|
| 4.1 | **Lucide** (`lucide-react@1.72.0`) | https://lucide.dev/ | 2026-11-12 | Consistent 1.5px-stroke icon set; the default that does not look like Bootstrap-era iconography. | Free | ISC (`1.72.0`) | Yes. | `1.72.0` published 2026-11-11 |
| 4.2 | **Tabler Icons** (`@tabler/icons-react@3.51.0`) | https://tabler.io/icons | 2026-11-12 | 6,287 icons, same stroke style; covers edge cases Lucide misses. | Free | MIT (`3.51.0`) | Yes. | `3.51.0` published 2026-11-08 |
| 4.3 | **Heroicons** (`@heroicons/react`) | https://heroicons.com/ | 2026-11-12 | Tailwind Labs set; fine but smaller. | Free | MIT (`2.2.0`) | Yes. | `2.2.0` published **2024-11-18** → ~2 years without a stable release. **Avoid as primary.** |
| 4.4 | **Phosphor** (`@phosphor-icons/react`) | https://phosphoricons.com/ | 2026-11-12 | Flexible weights/styles. | Free | MIT (`2.1.10`) | Yes. | `2.1.10` published **2025-05-22** → ~18 months stale. **Avoid.** |

**Verdict:** Lucide primary, Tabler for gaps. Pick one, not both, in the final bundle.

---

## 5. Animation

Rule for this redesign: motion should be almost invisible. A generic AI look often comes from excessive hero animation; restraint is part of the visual fix.

| # | Tool | URL | Date | Problem it solves here | Cost | Licence | Fits? | Maintenance evidence |
|---|---|---|---|---|---|---|---|---|
| 5.1 | **CSS transitions / keyframes** | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions | 2026-11-12 | Hover, focus, accordion, page fade. Covers ~80% of what this app needs. | Free | n/a | Yes. | Web standard. |
| 5.2 | **Motion** (`motion@14.13.0`) | https://motion.dev/ | 2026-11-12 | Layout animations, presence/exit, gesture spring. Formerly Framer Motion. | Free | MIT (`14.13.0`) | Yes (`motion/react`). | `14.13.0` published 2026-11-12 (same day) |
| 5.3 | **AutoAnimate** (`@formkit/auto-animate@0.10.2`) | https://auto-animate.formkit.com/ | 2026-11-12 | One-line list transitions. **Dropped after cross-review:** it attaches a MutationObserver; React 19 `startTransition` + CSS covers our list changes without a third-party DOM hook. | Free | MIT (`0.10.2`) | Yes, but unnecessary. | `0.10.2` published 2026-11-06 |
| 5.4 | **GSAP** | https://gsap.com/pricing/ | 2026-11-12 | Timeline/scroll storytelling. | **Now 100% free** — page states "GSAP is now 100% free for all users" (verified 2026-11-12) | Custom free licence (not OSI); check terms before redistribution | Yes, but heavyweight and unnecessary here. | Page is the evidence; no npm pin used. |
| 5.5 | **Anime.js** (`animejs@4.5.0`) | https://animejs.com/ | 2026-11-12 | Small timeline engine. | Free | MIT (`4.5.0`) | Yes. | `4.5.0` published 2026-06-22; v5 is in beta |
| 5.6 | **React Spring** (`@react-spring/web@10.1.2`) | https://react-spring.dev/ | 2026-11-12 | Physics-based motion. | Free | MIT (`10.1.2`) | Yes. | `10.1.2` published 2026-06-24; v11 beta |

**Verdict:** CSS first, including native `@starting-style` and view transitions. **AutoAnimate (5.3) removed after cross-review** — it buys one line of convenience at the cost of a MutationObserver dependency that React 19 `startTransition` + CSS already covers. Reject GSAP/anime/react-spring: another dependency for motion we do not need.

---

## 6. Frontend test + verification stack

| # | Tool | URL | Date | Problem it solves here | Cost | Licence | Fits React 19 + Vite? | Maintenance evidence |
|---|---|---|---|---|---|---|---|---|
| 6.1 | **Vitest** (`5.1.0`) | https://vitest.dev/ | 2026-11-12 | Unit/component test runner reusing Vite config and transforms. No second build pipeline. | Free | MIT (`5.1.0`) | Yes. | `5.1.0` published 2026-11-02 |
| 6.2 | **React Testing Library** (`16.3.3`) | https://testing-library.com/docs/react-testing-library/intro/ | 2026-11-12 | Behaviour-level component tests (queries by role/text), which catch accessibility regressions too. | Free | MIT (`16.3.3`) | Yes — peer `react: ^18.0.0 \|\| ^19.0.0` verified | `16.3.3` published 2026-08-27 |
| 6.3 | **@testing-library/jest-dom** (`7.0.1`) | https://registry.npmjs.org/@testing-library/jest-dom | 2026-11-12 | `toBeInTheDocument`, `toHaveAccessibleName`, etc. | Free | MIT | Yes — peer `vitest: >= 0.32` | `7.0.1` published 2026-08-09 |
| 6.4 | **@testing-library/user-event** (`14.6.10`) | https://registry.npmjs.org/@testing-library/user-event | 2026-11-12 | Realistic typing/click sequences. | Free | MIT | Yes. | `14.6.10` published 2026-11-12 |
| 6.5 | **jsdom** (`31.0.0`) | https://registry.npmjs.org/jsdom | 2026-11-12 | DOM environment for component tests. | Free | MIT | Yes. | `31.0.0` published 2026-11-05 |
| 6.6 | **happy-dom** (`21.0.4`) | https://registry.npmjs.org/happy-dom | 2026-11-12 | Faster DOM emulation; less spec-complete than jsdom. | Free | MIT | Yes. | `21.0.4` published 2026-10-20 |
| 6.7 | **Playwright** (`@playwright/test@1.65.0`) | https://playwright.dev/ | 2026-11-12 | E2E on Chromium/Firefox/WebKit, tracing, and **built-in visual comparisons** (`toHaveScreenshot`) at zero cost. | Free | Apache-2.0 | Yes. | `1.65.0` registry activity 2026-11-12 |
| 6.8 | **@axe-core/playwright** (`4.14.0`) | https://registry.npmjs.org/@axe-core/playwright | 2026-11-12 | Automated WCAG checks inside E2E runs. | Free | MPL-2.0 | Yes. | `4.14.0` published 2026-10-15 |
| 6.9 | **axe-core** (`4.14.0`) | https://github.com/dequelabs/axe-core | 2026-11-12 | Accessibility rules engine (drives 6.8). | Free | MPL-2.0 (verified via npm metadata) | Yes. | `4.14.0` published 2026-10-15 |
| 6.10 | **Pa11y** (`10.0.0`) | https://pa11y.org/ | 2026-11-12 | CLI accessibility report per URL. **Dropped after cross-review:** running `axe-core` inside Playwright gives the same coverage with one fewer tool and no LGPL question. | Free | **LGPL-3.0-only** (`10.0.0`) | Yes as a CI CLI, but redundant here. | `10.0.0` published 2026-08-28 |
| 6.11 | **Lighthouse CI** (`@lhci/cli@0.16.1`) | https://github.com/GoogleChrome/lighthouse-ci | 2026-11-12 | Perf/accessibility/best-practice budgets on PRs; catches regressions the unit tests cannot. | Free | Apache-2.0 | Yes. | `0.16.1` published 2026-11-11 |
| 6.12 | **MSW** (`3.0.5`) | https://mswjs.io/ | 2026-11-12 | Mock backend in browser/node for tests and offline UI work; no real API needed. | Free | MIT (`3.0.5`) | Yes. | `3.0.5` published 2026-11-11 |
| 6.13 | **Storybook** (`10.6.7`) | https://storybook.js.org/ | 2026-11-12 | Component workshop + screenshots. | Free | MIT (`10.6.7`) | Yes, but heavy setup/maintenance for a hackathon-scale app. | `10.6.7` published 2026-11-10 |
| 6.14 | **Chromatic** (`18.14.3`) | https://www.chromatic.com/pricing | 2026-11-12 | Hosted visual regression + review UI. | Free plan exists; **Starter $179/month** for 35,000 billed snapshots; Pro $399/month for 85,000 (pricing page, 2026-11-12) | MIT CLI; hosted service proprietary | Yes, but **not needed at budget 0** — Playwright screenshots cover us. | `18.14.3`; pricing verified on page |
| 6.15 | **Percy** | https://www.percy.io/pricing | 2026-11-12 | Hosted visual testing. | **UNVERIFIED** — page loaded but prices render client-side; no numbers extractable | Proprietary service | n/a | Rejected because pricing cannot be evidenced at budget 0. |
| 6.16 | **Cypress** (`16.3.0`) | https://www.cypress.io/pricing | 2026-11-12 | Alternative E2E runner. | OSS free (MIT); Cypress Cloud free plan, **Team $799/year**, Business $3,199/year (pricing page, 2026-11-12) | MIT (OSS) | Yes, but duplicates Playwright. Adding both doubles E2E maintenance. | `16.3.0` published 2026-11-10 |

**Verdict (frontend):** Vitest + RTL + jsdom + user-event + jest-dom → unit/component. Playwright + axe-core → E2E quality gate and free visual diffs. Lighthouse CI → budgets. Skip **Pa11y (redundant with axe-core)**, Storybook, Chromatic paid, Percy, Cypress.

**Concrete gate to add:** `"test": "vitest run"` in frontend; a `vitest.config.js` using `environment: 'jsdom'`; `e2e/` with Playwright config; CI jobs for unit, e2e, lighthouse. Note: Playwright browser download is ~hundreds of MB per CI run — acceptable on GitHub-hosted runners, cache it.

---

## 7. Backend test + verification stack

The repo already has Jest 29 + Supertest 6. There is no reason to introduce a second runner.

| # | Tool | URL | Date | Problem it solves here | Cost | Licence | Fits Express + Mongoose? | Maintenance evidence |
|---|---|---|---|---|---|---|---|---|
| 7.1 | **Jest** (`30.5.2`) | https://jestjs.io/ | 2026-11-12 | Existing runner. Keep it; upgrade only if needed. | Free | MIT (`30.5.2`) | Yes. Repo has `^29.6.2` — works, but check 30 breaking changes before upgrading. | `30.5.2` published 2026-09-18 |
| 7.2 | **Supertest** (`7.3.2`) | https://github.com/ladjs/supertest | 2026-11-12 | HTTP-level tests against the Express app without binding a port. | Free | MIT (`7.3.2`) | Yes. Repo has `^6.3.3`. | `7.3.2` published 2026-11-07 |
| 7.3 | **mongodb-memory-server** (`11.3.0`) | https://github.com/typegoose/mongodb-memory-server | 2026-11-12 | Throwaway MongoDB per test suite; no shared dev DB, no Cloudinary/Atlas creds needed. | Free | MIT (`11.3.0`) | Yes. Compatible with the Mongoose 7 driver line used in repo (verify at install). | `11.3.0` published 2026-09-21 |
| 7.4 | **jest-environment-jsdom** (`30.5.2`) | https://registry.npmjs.org/jest-environment-jsdom | 2026-11-12 | Only if a backend test must render something (usually not needed). | Free | MIT | n/a | `30.5.2` published 2026-09-18 |
| 7.5 | **Node built-in test runner** | https://nodejs.org/api/test.html | 2026-11-12 | Zero-dep alternative. | Free | n/a | Yes, but migrating off Jest is churn for no gain. | Shipped with Node; no separate cadence. |

**Verdict (backend):** keep Jest; add `supertest` request tests and `mongodb-memory-server` for DB isolation. Add `--passWithNoTests` only as a temporary bridge, then remove it once the first test lands — otherwise CI stays green with zero coverage, which is exactly the failure mode we are trying to eliminate.

**Known operational cost of 7.3:** first run downloads a MongoDB binary (hundreds of MB, cached afterwards). On CI, cache the `mongodb-memory-server` cache directory or the suite is slow. This is the one tool here with a hidden bandwidth cost; it is still ₹0 in money.

**Agreed CI cache strategy (cross-review action):** the package documents `MONGOMS_DOWNLOAD_DIR` as the environment variable for the binary cache (verified on https://typegoose.github.io/mongodb-memory-server/docs/api/config-options, 2026-11-12). Set `MONGOMS_DOWNLOAD_DIR: ${{ github.workspace }}/.cache/mongodb-binaries` on the backend test step and add an `actions/cache` entry for that path keyed on the `mongodb-memory-server` version from `package-lock.json`. Fallback if the runner has no network: install `mongod` on the image and set `MONGOMS_SYSTEM_BINARY` (same docs page) — but do not add that complexity unless the simple cache fails.

---

## 8. Lint / format (verification-adjacent)

| Tool | URL | Date | Cost | Licence | Fits? | Maintenance |
|---|---|---|---|---|---|---|
| **ESLint** (`10.14.0`) | https://eslint.org/ | 2026-11-12 | Free | MIT | Yes; repo already uses v9 flat config. Upgrade needs a config review. | `10.14.0` published 2026-10-30 |
| **eslint-plugin-react-hooks** (`7.1.1`) | https://registry.npmjs.org/eslint-plugin-react-hooks | 2026-11-12 | Free | MIT | Yes; already installed at `^5.2.0`. v7 adds React Compiler-era rules — check before upgrading. | `7.1.1` published 2026-04-17 |
| **Prettier** (`3.10.1`) | https://prettier.io/ | 2026-11-12 | Free | MIT | Yes. | `3.10.1` published 2026-11-12 |
| **Biome** (`2.6.7`) | https://biomejs.dev/ | 2026-11-12 | Free | MIT OR Apache-2.0 | Yes technically, but replacing ESLint+Prettier mid-project adds churn and loses some plugin coverage. | `2.6.7` published 2026-11-11 |
| **stylelint** (`18.0.0`) | https://registry.npmjs.org/stylelint | 2026-11-12 | Free | MIT | Only if we adopt plain CSS at scale. | `18.0.0` published 2026-11-03 |

**Verdict:** keep ESLint + add Prettier. Do not migrate to Biome now.

---

## 9. Agreed shortlist for this project (my vote)

1. **Components:** hand-rolled components + **Radix Primitives** for dialog/popover/select. No shadcn/ui, no themed kit.
2. **CSS:** **CSS Modules + native CSS custom-property tokens**. (Alternative: Tailwind v4 + `@tailwindcss/vite`, verified Vite-7 compatible — only if the team explicitly chooses utility speed.)
3. **Icons:** **Lucide** only.
4. **Animation:** CSS transitions / `@starting-style` / view transitions. No animation library.
5. **Frontend tests:** **Vitest + RTL + user-event + jest-dom + jsdom**; **Playwright** for E2E, **`toHaveScreenshot`** for visual diffs, **@axe-core/playwright** for a11y; **Lighthouse CI** budgets.
6. **Backend tests:** **Jest + Supertest + mongodb-memory-server** (existing pair retained), with `MONGOMS_DOWNLOAD_DIR` cached in CI.
7. **Lint:** existing ESLint + Prettier.

Nothing above needs a paid tier. Total new runtime dependencies: a few Radix packages + Lucide. Everything else is dev-only.

**Agreed with Antigravity after cross-review:** Radix directly (no shadcn), Lucide, CSS Modules + native tokens, Vitest/RTL/Playwright + `toHaveScreenshot` + axe-core, Lighthouse CI, and dropping Pa11y + AutoAnimate. **Remaining disagreement:** none on my slice after these concessions.

**Dependency additions to ask Claude about before install** (per team rule): `@radix-ui/react-*`, `lucide-react`, `@formkit/auto-animate`, `vitest`, `@testing-library/*`, `jsdom`, `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`, `mongodb-memory-server`, `prettier`. The list is long only because the repo currently has zero frontend tests; each is individually small and MIT/ISC/Apache/MPL.

---

## 10. Doubts and shortcuts — stated openly

- I did **not** install or run any of these. "Fits" is a compatibility argument from peer ranges and docs, not a proven build. The first ticket must prove the chosen stack on a scratch worktree before the redesign spreads.
- **Playwright exact stable publish date:** registry showed 1.65.0 plus 1.66 alpha activity on 2026-11-12; I did not isolate the stable timestamp. The claim is "registry activity 2026-11-12", no more.
- **Percy pricing** is unverified because the page renders prices client-side; I rejected it rather than guess.
- **Pa11y LGPL-3.0** is safe as an external CLI in CI, but this is a licence interpretation, not legal advice. If anyone proposes importing Pa11y as a library into the app, stop and ask.
- **GSAP** is now free per its pricing page, but it is **not OSI open source**; I did not read the full licence text. I recommend not using it, so this stays academic.
- The repo's `@vitejs/plugin-react@4.6` against Vite 7.0.4 is the installed pairing; I did not verify a Vite 8 upgrade path. Do not upgrade Vite as part of the redesign unless a concrete bug forces it.
- Maintenance dates are publish recency, **not** commit activity or issue responsiveness. A stale package can still be "done"; Heroicons and Phosphor are flagged because icons do change, and two years is a real signal.
- `mongodb-memory-server` downloads binaries; on a locked-down CI runner without internet, it will fail. Verify runner network policy before committing to it.
- No test files exist, so "tests pass" cannot be claimed today. The gap is the point of this slice.

---

## 11. Sources consulted

Every URL below was fetched during this session on 2026-11-12 unless noted. "Dead end" means fetched and unusable for the stated reason.

| URL | Result |
|---|---|
| https://registry.npmjs.org/<pkg> (48 packages: react, vite, react-router-dom, axios, express, mongoose, cloudinary, jest, supertest, vitest, @testing-library/react, @playwright/test, tailwindcss, motion, lucide-react, @axe-core/playwright, mongodb-memory-server, msw, @radix-ui/react-dialog, @base-ui-components/react, @ark-ui/react, @tanstack/react-query, react-hook-form, lightningcss, @vanilla-extract/css, @pandacss/dev, open-props, animejs, @react-spring/web, @formkit/auto-animate, eslint, prettier, @biomejs/biome, storybook, chromatic, pa11y, @lhci/cli, cypress, sass, postcss, @headlessui/react, @mantine/core, @chakra-ui/react, daisyui, @tabler/icons-react, @heroicons/react, @phosphor-icons/react, @axe-core/cli) | Version, licence, publish timestamps used as maintenance evidence |
| https://registry.npmjs.org/ (extra: @tailwindcss/vite, @tailwindcss/postcss, @testing-library/jest-dom, @testing-library/user-event, jsdom, happy-dom, shadcn, @heroui/react, class-variance-authority, tailwind-merge, @vitejs/plugin-react, eslint-plugin-react-hooks, jest-environment-jsdom, stylelint, htmlhint, vite-tsconfig-paths) | Same |
| https://react.dev/versions | React version index (page title only) |
| https://ui.shadcn.com/docs | shadcn/ui intro, "code distribution platform" |
| https://base-ui.com/ | Base UI description |
| https://ark-ui.com/ | Ark UI, 45+ components |
| https://www.radix-ui.com/primitives | Radix Primitives description |
| https://headlessui.com/ | Headless UI description |
| https://mantine.dev/ | Mantine, 120+ components |
| https://chakra-ui.com/ | Chakra UI description |
| https://daisyui.com/ | daisyUI description |
| https://tailwindcss.com/blog/tailwindcss-v4 | Tailwind v4 announcement |
| https://tailwindcss.com/docs/installation/using-vite | Official Vite install steps, `@tailwindcss/vite` |
| https://lucide.dev/ | Lucide description |
| https://tabler.io/icons | Tabler, 6,287 icons |
| https://heroicons.com/ | Heroicons description |
| https://phosphoricons.com/ | Phosphor description |
| https://motion.dev/ | Motion description |
| https://animejs.com/ | Anime.js description |
| https://gsap.com/pricing/ | "GSAP is now 100% free for all users" |
| https://react-spring.dev/ | React Spring description |
| https://auto-animate.formkit.com/ | AutoAnimate description |
| https://vitest.dev/ | Vitest description |
| https://testing-library.com/docs/react-testing-library/intro/ | RTL intro |
| https://playwright.dev/ | Playwright description |
| https://jestjs.io/ | Jest description |
| https://github.com/ladjs/supertest | Supertest repo (redirected from ladjs) |
| https://github.com/typegoose/mongodb-memory-server | mongodb-memory-server repo |
| https://mswjs.io/ | MSW description |
| https://github.com/dequelabs/axe-core | axe-core repo |
| https://pa11y.org/ | Pa11y description |
| https://github.com/GoogleChrome/lighthouse-ci | Lighthouse CI repo |
| https://www.chromatic.com/pricing | Pricing: free plan, Starter $179/mo, Pro $399/mo |
| https://www.percy.io/pricing | **Dead end:** page loaded, prices client-side only |
| https://www.cypress.io/pricing | Pricing: free plan, Team $799/yr, Business $3,199/yr |
| https://vanilla-extract.style/ | vanilla-extract description |
| https://panda-css.com/ | Panda CSS description |
| https://open-props.style/ | Open Props description |
| https://lightningcss.dev/ | Lightning CSS description |
| https://sass-lang.com/ | Sass description |
| https://postcss.org/ | PostCSS description |
| https://vite.dev/ | Vite description |
| https://biomejs.dev/ | Biome description |
| https://eslint.org/ | ESLint description |
| https://prettier.io/ | Prettier description |
| https://storybook.js.org/ | Storybook description |
| https://github.com/motiondivision/motion | Motion repo |
| https://github.com/tailwindlabs/tailwindcss | Tailwind repo |
| https://github.com/vitest-dev/vitest | Vitest repo |
| https://github.com/microsoft/playwright | Playwright repo |
| https://www.radix-ui.com/colors | Radix Colors description |
| https://web.dev/articles/vitals | Web Vitals (perf budget reference) |
| https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties | CSS custom properties reference |
| https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions | CSS transitions reference |
| https://nodejs.org/api/test.html | Node test runner reference |
| https://vite.dev/guide/features#css-modules | Vite CSS Modules reference |
| https://css-modules.github.io/ | **Dead end:** HTTP 404 |
| https://www.heroui.com/ | **Dead end:** HTTP 308 redirect on plain GET; used npm metadata instead |
| https://www.w3.org/WAI/test-evaluate/tools/list/ | **Dead end:** HTTP 403 |
| https://heroui.com | (covered by 308 above) |

---

## 12. Cross-review with Antigravity (2026-11-12)

Read `docs/redesign/research/antigravity-tools.md` in full and re-fetched its disputed claims.

### 12.1 Accepted from their critique of this file (conceded in writing)

- **shadcn/ui:** removed as an option. Radix Primitives only.
- **Pa11y:** dropped. `axe-core` inside Playwright is the single a11y tool.
- **AutoAnimate:** dropped. React 19 `startTransition` + CSS is enough.
- **mongodb-memory-server:** CI cache strategy pinned to `MONGOMS_DOWNLOAD_DIR` (verified docs URL) instead of leaving it as a warning.

### 12.2 Corrections to their file, each with a command/fetch result

| Their claim | What I found on 2026-11-12 | Action |
|---|---|---|
| §7 "documented tells" cites `thisisabra.com/blog/the-ai-web-aesthetic` | **HTTP 404** | Replace with a live source or mark the section UNVERIFIED. A 404 cannot substantiate a design claim. |
| §7 also cites `nngroup.com/articles/ai-website-design-usability/` | **HTTP 404** | Same. NN/g has real articles; this exact URL is not one of them. |
| §3.6 `apca-w3` licence is Apache-2.0 | npm registry: `apca-w3@0.1.9`, licence **"Limited W3 License"**, published 2022-07-04 | Fix the licence cell. Not Apache-2.0. |
| §6.4 maintenance evidence is `style-dictionary@4.0.0` | Latest is **`style-dictionary@5.8.0`, published 2026-11-03** | Update the version/date; the old pin is stale. |
| §11 row 59 `typescale.org` is a dead end ("domain parked") | Fetch returned **HTTP 200**, title "Type Scale Generator – Free Typography Scale Tool" | Remove the dead-end row; it is live. |
| §3.4 Radix Colors "maintained by WorkOS/Radix team" | `@radix-ui/colors@3.0.0` was published **2023-10-02** (≈3 years ago) | It is stable, but state the date. "Maintained" without a timestamp is not evidence. |
| §9 Fraunces licence "MIT / SIL OFL" | `@fontsource-variable/fraunces@5.3.0` licence = **OFL-1.1** only | Fix to OFL-1.1. |
| §2.2 Fontshare "100% free ... without pageview limits" | The cited licence URL returned only **76 characters of text** (JS-rendered); the terms were not readable at that URL | Mark UNVERIFIED or cite a fetchable terms page. |
| §11 row 47 `reshot.com` listed as a live free source | Page title: **"Reshot retiring: What's next for designers?"** | Remove or note retirement. |
| §9 photography "Openverse / Pexels (CC0 / Pexels license)" | Their own §5.4 says Openverse indexes **CC-BY** as well as CC0; CC-BY **requires attribution** | State the attribution duty or filter Openverse to CC0 only. |
| §3 palette claim "all text combinations > 7.1:1 AAA" | Computed with the WCAG relative-luminance formula: `#C25E38` on `#FAF8F5` = **4.00:1** (fails AA 4.5:1 for normal text); white on `#C25E38` = **4.24:1** (fails); `#E7E2DA` border on `#FAF8F5` = **1.22:1** (fails WCAG 1.4.11 non-text 3:1); white card on cream canvas = **1.06:1** | False as written. Use terracotta only for large text/graphics, darken it for small text, and give borders a darker tone or a second visual cue. |
| §7 "only blank starter CSS in App.css and index.css" | `frontend/src/App.css` = 42 lines/648 B; `index.css` = 228 lines/4,236 B, including a dark-mode media query and `#root` centering | Not blank. Delete the Vite starter rules rather than restyling them. |

### 12.3 Where they are right (verified)

- **unDraw AI-training ban:** confirmed on `https://undraw.co/license` (fetched 2026-11-12) — the licence text explicitly forbids use "for training, fine-tuning, or developing artificial intelligence".
- **Google Fonts privacy rationale:** self-hosting removes the third-party request; the legal history is real, though the ruling date is missing from their file.
- **Layout direction:** asymmetric cards, 3:4 garment viewports, and avoiding glassmorphism are consistent with the brief.

### 12.4 Remaining disagreement

- Their statement that shadcn is "the single largest visual driver of the AI web aesthetic" is a **judgement, not a measurement**. I accept the decision (reject shadcn) because the brief prioritises the look, but the claim should be labelled opinion.
- Their headline "63 distinct verified sources" is overstated: on the same day, two cited sources 404 and one "dead end" is live. Verified means fetched and readable, not fetched and listed.

**Net effect on my slice:** no remaining disagreement. Radix + CSS Modules + native tokens + Lucide + CSS transitions + Vitest/RTL/Playwright/axe/Lighthouse + Jest/Supertest/mongodb-memory-server.

### 12.5 Resolution (verified in their updated file)

Antigravity conceded every point in writing. I re-read `antigravity-tools.md` after their update and confirmed the corrections are actually present: `apca-w3` → Limited W3 License (line 213/264), `style-dictionary@5.8.0` (line 265), `typescale.org` HTTP 200 (line 202), Radix Colors 2023-10-02 (line 267), Fraunces OFL-1.1 only (line 268), Fontshare UNVERIFIED (line 269), Reshot retiring (line 251), Openverse CC-BY attribution (lines 156–157), contrast 4.00:1 and darkened `#9E4424`/`#8C827A` (lines 73–75, 168, 273–276), both 404s moved to dead ends (lines 249–250), and the shadcn claim labelled opinion (line 17). **Zero remaining disagreements on my slice.**

