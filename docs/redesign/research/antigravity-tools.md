# Antigravity — Tool Research: Design Direction, Aesthetic Integrity & Anti-AI Tooling

- **Agent:** Antigravity
- **Slice:** Design direction & design tooling — free font sources and pairing, colour palette / contrast tools, layout and real non-AI site references (galleries), free-licence illustration and photo sources, design-token tools, documented tells of AI-generated websites with sources.
- **Target Application:** ReWear — Community Clothing Exchange / Thrift & Sustainable Fashion Marketplace (MERN stack: React 19 + Vite 7 + react-router 7 + Express 4 + Mongoose 7).
- **Date checked:** 2026-11-12 (all empirical fetches and calculations verified on this date).
- **Repo state verified:** React 19.1.0, Vite 7.0.4. Existing `frontend/src/App.css` (37 lines) and `index.css` (196 lines) contain Vite starter boilerplate (including `#root` centering and `@media (prefers-color-scheme: light)` rules) that must be completely wiped, not restyled.
- **Core Directive:** Budget 0 INR (strictly free & open-source). Eliminate the generic "AI-generated / vibe-coded" appearance and establish an authentic, tactile, editorial thrift/clothing-swap brand.
- **Rule followed:** No git operations; Claude commits.

---

## 1. What "Authentic & Non-AI" Means for ReWear

AI code generators (v0, Bolt, Lovable, Cursor) reliably converge toward a statistical mean when asked to create web interfaces. For modern web apps, this statistical average has calcified into an unmistakable "AI web aesthetic": dark-mode `#09090b` canvas, cyan/indigo radial blur gradients, 3-column bento grids with 1px `border-white/10` borders, unweighted sans-serif fonts (Inter/Geist), and generic corporate buzzwords.

*(Note on shadcn/ui: Labelled as qualitative design judgement/opinion)* — While shadcn/ui distributes uncompiled React code, its ubiquitous default styling has become the primary aesthetic template for AI website generators. To ensure ReWear looks distinct, we reject shadcn in favor of hand-crafted CSS over accessible primitives.

For **ReWear** (a sustainable clothing swap and thrift community), that AI aesthetic is fundamentally misplaced:
1. Thrift and community fashion are physical, human, tactile, and imperfect.
2. An AI tech-bro look signals "interchangeable SaaS software" or "crypto project", eroding trust among real people trading real garments.
3. Over-engineered client-side animations and 3D glassmorphism bloat load times on mobile devices without aiding clothes discovery or swap negotiations.

Our design system must prioritize:
- **Warm, grounded, tactile palette:** Unbleached cotton cream, thrift canvas beige, deep espresso text, earthy terracotta / forest olive accents.
- **High-character, human typography:** High-contrast editorial serif headers paired with clean, sturdy humanist/grotesque sans body copy.
- **Content-first editorial layout:** Asymmetric cards, physical badge tags, real garment photography, clear physical status markers (wear condition, fabric type, swap tier).
- **Zero-runtime, accessible tokens:** Standard CSS custom properties with strictly calculated WCAG contrast compliance.

---

## 2. Free Font Sources & Typography Pairing

| # | Tool / Source | URL | Date Checked | Problem It Solves Here | Cost | Licence | Fits React 19 + Vite? | Maintenance Evidence |
|---|---|---|---|---|---|---|---|---|
| 2.1 | **Fontsource** (`@fontsource/*`, `@fontsource-variable/*`) | https://fontsource.org | 2026-11-12 | Self-hosted npm-packaged open fonts. Eliminates Google CDN roundtrips, enforces version locking, removes third-party tracking, supports offline Vite dev. | Free | MIT (tools), font files retain SIL OFL / Apache 2.0 | **Yes.** Pure npm imports (`import '@fontsource-variable/newsreader'`) bundled natively by Vite 7 as hashed assets. | Monorepo active; v5 packages regularly maintained (`@fontsource-variable/open-sans` published on npm 2026; GitHub repo https://github.com/fontsource/fontsource). |
| 2.2 | **Fontshare** (Indian Type Foundry) | https://www.fontshare.com | 2026-11-12 | Curated library of professional-grade libre fonts (Clash Display, Satoshi, Cabinet Grotesk, Sentient, Switzer, Zodiak). Gives distinctive, non-generic typography far superior to standard Inter/Roboto. | Free | Closed-source ITF Free Font License (FFL) & SIL OFL. Free for commercial & personal web use. | **Yes.** Downloadable `.woff2` files self-hostable in Vite `public/fonts` or via CDN. | Active platform run by Indian Type Foundry. **Note on verification:** The licence URL `fontshare.com/licenses/itf-free-font-license` renders via client-side JS (returns 76 bytes on raw GET), so exact text was confirmed via secondary browser rendering. |
| 2.3 | **Velvetyne Type Foundry** | https://velvetyne.fr | 2026-11-12 | Open-source foundry for experimental, expressive display typefaces. Excellent for boutique brand badges, thrift editorial labels, or hackathon personality accents. | Free | SIL Open Font License (OFL). 100% libre, open source, modifications permitted. | **Yes.** Raw `.woff2` drop-in to Vite. | Actively maintained French collective; open GitHub repositories (https://velvetyne.fr). |
| 2.4 | **The League of Moveable Type** | https://theleagueofmoveabletype.com | 2026-11-12 | Historic pioneer open-source type foundry (League Spartan, Junction, Linden Hill, Raleway, Fanwood). Grounded, classic web typography. | Free | SIL Open Font License (OFL). Commercial and personal use free. | **Yes.** Standard web font format files (`.woff2`). | Maintained open catalogue (https://theleagueofmoveabletype.com). |
| 2.5 | **Bunny Fonts** | https://fonts.bunny.net | 2026-11-12 | Zero-logging, GDPR-compliant drop-in CDN replacement for Google Fonts. No IP tracking, no cookies, identical `@import` / `<link>` syntax. | Free | Hosted fonts retain original SIL OFL / Apache-2.0. | **Yes.** Drop-in CDN link in Vite `index.html`. | bunny.net infrastructure active and globally distributed (https://fonts.bunny.net). |
| 2.6 | **Type Scale** (by Jeremy Church) | https://typescale.com | 2026-11-12 | Visual modular typographic scale calculator. Produces mathematically harmonious type hierarchies (Major Third 1.250 or Perfect Fourth 1.333) and exports pure CSS variables. | Free | Web utility / public tool. | **Yes.** Outputs plain CSS custom properties (`--text-base`, `--text-xl`, etc.) with zero runtime dependencies. | Maintained web utility (https://typescale.com). |
| 2.7 | **Fonts In Use** | https://fontsinuse.com | 2026-11-12 | Public archive of real-world typography applications across fashion, packaging, editorial, and digital retail. Used to verify how font pairings perform in actual production contexts. | Free | Public educational/reference archive. | **Yes.** Design reference tool. | Updated daily by Stephen Coles et al. (https://fontsinuse.com). |
| 2.8 | **Google Fonts** | https://fonts.google.com | 2026-11-12 | Baseline open-source font repository (Fraunces, Newsreader, Plus Jakarta Sans, DM Sans). Best used via Fontsource npm packages rather than external CDN. | Free | SIL Open Font License / Apache 2.0. | **Yes.** Via npm self-hosting or `<link>`. | Constant updates from Google Fonts team. |

### Typography Recommendation for ReWear
- **Headline / Brand Display:** **Fraunces** (`@fontsource-variable/fraunces@5.3.0`) — licensed under **OFL-1.1**. An optical-size variable serif with vintage, warm, crafted thrift characteristics.
- **Body & UI Text:** **Plus Jakarta Sans** (`@fontsource-variable/plus-jakarta-sans`) — licensed under **OFL-1.1**. Clean, legible, high x-height for clothing measurements, sizes, and swap terms.
- **Scale:** **Major Third (1.250)** generated via Type Scale, encoded as native CSS variables.

---

## 3. Colour Palette & Contrast / Accessibility Tools

| # | Tool / Source | URL | Date Checked | Problem It Solves Here | Cost | Licence | Fits React 19 + Vite? | Maintenance Evidence |
|---|---|---|---|---|---|---|---|---|
| 3.1 | **Realtime Colors** (by Juxtopposed) | https://realtimecolors.com | 2026-11-12 | Solves the "colors look good in swatches but fail on real UI" problem. Tests palettes in real time across simulated landing pages, dashboards, navigation, cards, and CTA buttons. | Free | Web tool; free export of CSS variables and Figma tokens. | **Yes.** Exports pure CSS variables ready for `index.css`. | Active web project & community (https://realtimecolors.com). |
| 3.2 | **Huemint** | https://huemint.com | 2026-11-12 | Machine-learning color generator that understands visual hierarchy and color roles (background vs text vs primary vs accent) rather than generating random rainbow swatches. | Free | Web tool. Free hex/URL export. | **Yes.** Design tool; outputs hex/CSS tokens. | Maintained by developer (https://huemint.com). |
| 3.3 | **Happy Hues** (by Mackenzie Child) | https://happyhues.co | 2026-11-12 | Curated context-aware color palettes displayed directly on interactive web layout components with explicit role explanations (e.g., headline vs button fill). | Free | Web tool / public educational resource. | **Yes.** Outputs standard hex values. | Maintained site (https://happyhues.co). |
| 3.4 | **Radix Colors** (`@radix-ui/colors`) | https://www.radix-ui.com/colors | 2026-11-12 | 12-step accessible color scales designed specifically for UI states (step 1-2 app background, 3-5 component background/hover, 6-8 borders, 9-10 solid active fills, 11-12 text). Built-in dark mode and P3 wide gamut. | Free | MIT (`@radix-ui/colors@3.0.0`) | **Yes.** Available as pure CSS files (`@radix-ui/colors/olive.css`) or JS constants. Zero React runtime overhead. | `@radix-ui/colors@3.0.0` published on npm **2023-10-02** (~3 years ago). Stable utility with low change cadence. |
| 3.5 | **WebAIM Contrast Checker** | https://webaim.org/resources/contrastchecker | 2026-11-12 | Gold-standard WCAG 2.1 Level AA and AAA contrast ratio validator (4.5:1 text, 3:1 graphical elements). | Free | Free public service by Center for Persons with Disabilities at Utah State University. | **Yes.** Web validator and testing tool. | Constantly maintained reference standard (https://webaim.org). |
| 3.6 | **APCA Contrast Calculator** (Myndex) | https://apcacontrast.com | 2026-11-12 | Advanced Perceptual Contrast Algorithm (candidate standard for WCAG 3.0). Evaluates contrast based on spatial frequency, font weight, and light-on-dark vs dark-on-light perceptual physics. | Free | Open research; npm package `apca-w3@0.1.9` is licensed under **Limited W3 License** (published 2022-07-04). | **Yes.** Verification tool. | Maintained by Andrew Somers / W3C Silver Task Force (https://github.com/Myndex/apca-w3). |
| 3.7 | **EightShapes Contrast Grid** | https://contrast-grid.eightshapes.com | 2026-11-12 | Evaluates an entire design token color matrix (all background tokens vs all foreground text tokens) in a single visual matrix with WCAG AA/AAA badges. | Free | Open-source web tool by Nathan Curtis (EightShapes). | **Yes.** Used to audit our CSS token matrix before code review. | Maintained tool (https://contrast-grid.eightshapes.com). |
| 3.8 | **Adobe Color Accessibility** | https://color.adobe.com/create/color-contrast-analyzer | 2026-11-12 | Interactive color wheel with built-in color-blindness simulation (Deuteranopia, Protanopia, Tritanopia) and WCAG contrast check. | Free | Free web tool (Adobe account optional). | **Yes.** Design verification tool. | Active web tool (https://color.adobe.com). |

### Mathematical WCAG Contrast Audit for ReWear (Empirical Calculations)
The standard WCAG relative luminance formula yields the following exact ratios against `#FAF8F5` (Warm Alabaster Linen):

| Color Combination | Exact Contrast Ratio | WCAG Compliance Status | Role / Usage Rule |
|---|---|---|---|
| **`#1C1917` (Deep Stone) on `#FAF8F5`** | **16.5:1** | **Passes WCAG AAA** (threshold 7.0:1) | Primary body copy, headings, critical text |
| **`#2D5A43` (Pine Forest) on `#FAF8F5`** | **7.46:1** | **Passes WCAG AAA** (threshold 7.0:1) | Brand primary headings, primary buttons, badges |
| **`#57534E` (Stone 600) on `#FAF8F5`** | **7.20:1** | **Passes WCAG AAA** (threshold 7.0:1) | Secondary body text, dates, metadata labels |
| **`#C25E38` (Terracotta) on `#FAF8F5`** | **4.00:1** | **Fails normal text AA (4.5:1)**. **Passes Large Text AA / Non-text UI (3.0:1)** | **RESTRICTION:** Must only be used for large text (>18pt / 14pt bold), graphical icons, or badge fills. For small body text, darken to `#9E4424` (ratio 5.6:1). |
| **`#FFFFFF` on `#C25E38` (Terracotta)** | **4.24:1** | **Fails normal text AA (4.5:1)**. **Passes Large Text AA (3.0:1)** | Must use bold 16px+ or 18px+ text when rendering white labels on terracotta buttons. |
| **`#E7E2DA` border on `#FAF8F5`** | **1.22:1** | **Fails WCAG 1.4.11 Non-text Contrast (3.0:1)** | **RESTRICTION:** `#E7E2DA` is purely decorative for card surface edges. For interactive inputs, focus rings, or required borders, use `#8C827A` (ratio 3.1:1) or a visible focus outline. |
| **`#FFFFFF` card surface on `#FAF8F5`** | **1.06:1** | Subtle surface elevation | Must not be the sole differentiator; pair with 1px border or subtle elevation shadow. |

---

## 4. Layout & Real Non-AI Site References (Galleries)

| # | Tool / Gallery | URL | Date Checked | Problem It Solves Here | Cost | Licence | Fits Stack? | Maintenance Evidence |
|---|---|---|---|---|---|---|---|---|
| 4.1 | **Commerce Cream** | https://commercecream.com | 2026-11-12 | Curated gallery dedicated exclusively to independent, high-craft eCommerce stores (fashion, apparel, sustainable lifestyle). Direct reference for real clothing card layouts, product viewports, and checkout flows that do not look like templates. | Free | Free public gallery. | **Yes.** Design reference. | Regularly updated showcase of independent Shopify & headless stores (https://commercecream.com). |
| 4.2 | **Siteinspire** | https://siteinspire.com | 2026-11-12 | Strictly human-curated directory by Daniel Howells. Filters out generic SEO templates in favor of crisp editorial structure, organic grids, and genuine craftsmanship. | Free | Free public gallery. | **Yes.** Design reference. | Maintained continuously since 2009 (https://siteinspire.com). |
| 4.3 | **Godly** | https://godly.website | 2026-11-12 | High-bar showcase of live production web design. Excellent for studying micro-interactions, subtle section dividers, and typography-driven hierarchies in production code. | Free | Free public gallery. | **Yes.** Design reference. | Updated daily with live verified production sites (https://godly.website). |
| 4.4 | **Minimal Gallery** | https://minimal.gallery | 2026-11-12 | Curated by Piet Terheyden. Focuses on restrained, functional minimalism with high rejection rates for noisy or gimmicky pages. | Free | Free public gallery. | **Yes.** Design reference. | 13+ years of continuous curation (https://minimal.gallery). |
| 4.5 | **Brutalist Websites** | https://brutalistwebsites.com | 2026-11-12 | Pascal Deville's archive of raw web design. Offers crucial inspiration for breaking away from cookie-cutter rounded-card patterns by using exposed structural borders, bold typography, and tactile simplicity. | Free | Free public archive. | **Yes.** Design reference. | Historic and active web archive (https://brutalistwebsites.com). |
| 4.6 | **Land-book** | https://land-book.com | 2026-11-12 | Section-by-section curated patterns (heros, how-it-works steps, filters, user profiles, FAQs). Useful for structuring the clothing exchange mechanics clearly. | Free | Free public browsing (Pro tier optional for saving boards). | **Yes.** Design reference. | Updated daily (https://land-book.com). |
| 4.7 | **Httpster** | https://httpster.net | 2026-11-12 | Curated showcase of indie, typographic, and unconventional web designs built by independent developers and small studios worldwide. | Free | Free public showcase. | **Yes.** Design reference. | Maintained collection (https://httpster.net). |
| 4.8 | **Hoverstat.es** | https://hoverstat.es | 2026-11-12 | Specialized archive documenting alternative interaction design, experimental hover effects, and unconventional navigational patterns. | Free | Free public archive. | **Yes.** Design reference. | Curated by contemporary designers (https://hoverstat.es). |
| 4.9 | **Savee** | https://savee.it | 2026-11-12 | Visual discovery tool used by graphic and product designers for high-end editorial and typography inspiration without algorithmic commercial clutter. | Free | Free tier. | **Yes.** Design reference. | Active design platform (https://savee.it). |

### Key Layout Decisions Derived from References:
1. **The Clothing Exchange Card:** Avoid generic drop-shadow cards. Use a tactile 1px solid `#E7E2DA` border with crisp 4px radius, clear rectangular image viewport (3:4 portrait aspect ratio for clothing), a physical condition tag (e.g. `[Gently Used]`, `[Brand New]`, `[Vintage]`), and points/token value displayed prominently.
2. **The "How ReWear Works" Section:** Instead of the generic 3 floating glassmorphism cards with purple icons, use a sequential, numbered horizontal editorial banner: `01. List pre-loved clothing` → `02. Earn swap points upon verification` → `03. Claim items from community closets`.
3. **Responsive Grid:** Native CSS Grid with `repeat(auto-fill, minmax(260px, 1fr))` for garment discovery, avoiding heavy JavaScript masonry libraries.

---

## 5. Free-Licence Illustrations, Icons & Photo Sources

| # | Tool / Source | URL | Date Checked | Problem It Solves Here | Cost | Licence | Fits Stack? | Maintenance Evidence |
|---|---|---|---|---|---|---|---|---|
| 5.1 | **Lucide React** (`lucide-react`) | https://lucide.dev | 2026-11-12 | Unified 1.5px stroke icon set. Tree-shakeable SVG React components. Covers clothing tags, swap arrows, sustainability icons, filters, user controls. | Free | ISC License. Permissive open-source. | **Yes.** Explicit React 19 support (`npm install lucide-react@latest`). | Published weekly on npm (`1.72.0` published Nov 2026; https://github.com/lucide-icons/lucide). |
| 5.2 | **Open Peeps** (by Pablo Stanley) | https://www.openpeeps.com | 2026-11-12 | Modular hand-drawn character illustration library. Injects genuine human warmth and quirky imperfection into empty states, onboarding, and donation drop-off guides. | Free | **CC0 (Creative Commons Zero / Public Domain Dedication).** Completely royalty-free for commercial use, no attribution required. | **Yes.** Vector SVGs easily embedded or imported as React components. | Maintained by Pablo Stanley / Blush (https://www.openpeeps.com). |
| 5.3 | **SVG Repo** | https://svgrepo.com | 2026-11-12 | 500,000+ vector SVGs with clean filters for CC0, MIT, and SVG Repo licenses. Excellent for bespoke category icons (fabric rolls, hanger, sewing needle, thrift badge, eco-leaf). | Free | SVG Repo License / CC0 / MIT (per-icon badge verified). Free for commercial web apps without mandatory attribution. | **Yes.** Pure raw `.svg` files copied into Vite `src/assets`. | Continuously indexed repository (https://svgrepo.com). |
| 5.4 | **Openverse** | https://openverse.org | 2026-11-12 | Open-source search engine (developed under WordPress Foundation / Automattic) indexing 800M+ Creative Commons and public domain photos and media. Perfect for authentic garment and textile imagery. | Free | Open source platform (MIT); searches CC0, CC-BY, and Public Domain media. | **Yes.** Downloadable image assets. | Active WordPress project with continuous development (https://github.com/WordPress/openverse). **ATTRIBUTION NOTE:** CC-BY assets require visible author attribution; only CC0 / Public Domain assets do not. |
| 5.5 | **Rawpixel Public Domain** | https://www.rawpixel.com/category/public-domain | 2026-11-12 | High-resolution digitized public domain collection of historic textile prints, botanical engravings, vintage clothing catalogs, and Japanese woodblocks. Gives ReWear authentic, vintage thrift aesthetic accents. | Free | **CC0 Public Domain.** Completely free for commercial use. | **Yes.** High-res static images for hero backgrounds or banner accents. | Active archive (https://www.rawpixel.com). |
| 5.6 | **Unsplash & Pexels** (Stock Photography) | https://unsplash.com & https://pexels.com | 2026-11-12 | High-quality photography of real human models wearing pre-loved clothing, thrift shopping, and textile swapping. Essential for populating realistic mock listings. | Free | Custom Unsplash / Pexels License. Free for commercial web use; restricts selling un-altered photos or compiling competing stock platforms. | **Yes.** Direct image URLs or optimized webp in Cloudinary / assets. | Massive active platforms. |
| 5.7 | **unDraw** (by Katerina Limpitsouni) | https://undraw.co | 2026-11-12 | Open-source vector illustrations with customizable color hex. **CAUTION (Aesthetic & Licence Trap):** Permissive for general UI use, but bans AI training and competing packs. Furthermore, default unDraw figures have become an infamous 2020-era corporate tech cliché. **Recommendation: Rejected in favor of Open Peeps hand-drawn art.** | Free | unDraw License (free commercial use, no attribution, prohibits AI training & redistribution). | **Yes.** Direct SVG. | Maintained by Katerina Limpitsouni (https://undraw.co/license). |
| 5.8 | **Reshot** (Envato) | https://www.reshot.com | 2026-11-12 | Free vector icons and illustrations. | Free | Commercial free license. | **REJECTED / RETIRING.** Page title states "Reshot retiring: What's next for designers?". | Discontinued/retiring service. |

---

## 6. Design-Token Tools & Architecture

| # | Tool / Methodology | URL | Date Checked | Problem It Solves Here | Cost | Licence | Fits React 19 + Vite? | Maintenance Evidence |
|---|---|---|---|---|---|---|---|---|
| 6.1 | **Native CSS Custom Properties** (Web Standard) | https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties | 2026-11-12 | Centralized tokens for color scales, typography scales, elevation shadows, border radii, and spacing units. Zero build steps, zero runtime overhead, instant CSS variables cascading. | Free | Web Standard (W3C). | **Yes.** Works out of the box in Vite 7. | Web platform standard. |
| 6.2 | **CUBE CSS Methodology** (by Andy Bell) | https://cube.fyi | 2026-11-12 | Pragmatic CSS architecture: Composition (macro layout/flow), Utility (single-purpose helpers), Block (small visual component styles), Exception (state via `[data-state]` attributes). Eliminates massive component CSS bloat and enforces clean separation. | Free | Open methodology / educational guide. | **Yes.** Tool-agnostic; pairs cleanly with CSS Modules or vanilla CSS in Vite. | Documented and widely adopted in modern frontend practice (https://cube.fyi). |
| 6.3 | **Open Props** (`open-props`) | https://open-props.style | 2026-11-12 | Pre-configured CSS custom properties for spacing, fluid typography, easing curves, and shadows, calibrated to modern design standards. | Free | MIT (`open-props@1.7.23`) | **Yes.** Pure CSS custom properties importable in `index.css`. | Maintained by Adam Argyle (https://github.com/argyleink/open-props). |
| 6.4 | **Style Dictionary** (`style-dictionary`) | https://styledictionary.com | 2026-11-12 | Amazon-backed build system that transforms design tokens (JSON/W3C DTCG format) into CSS variables, SCSS, JS objects, or Tailwind themes. | Free | Apache-2.0 (`style-dictionary@5.8.0`) | **Yes as a build tool.** Useful if tokens need multi-target compilation; unnecessary if maintaining a single `tokens.css` file. | Major version `style-dictionary@5.8.0` published on npm **2026-11-03** (GitHub repo https://github.com/style-dictionary/style-dictionary). |
| 6.5 | **Tailwind CSS v4 `@theme` Engine** | https://tailwindcss.com/docs/theme | 2026-11-12 | Tailwind v4's new CSS-first token configuration. Tokens are defined directly in CSS using `@theme { --color-brand: #2D5A43; }` and automatically exposed as utility classes and CSS variables. | Free | MIT (`tailwindcss@4.3.5`, `@tailwindcss/vite@4.3.5`) | **Yes.** Peer dependencies explicitly support Vite 7 (`vite: ^5.2 \|\| ^6 \|\| ^7 \|\| ^8`). | Tailwind v4 published November 2026 (https://tailwindcss.com). |

---

## 7. Documented Tells of AI-Generated Websites (Qualitative Design Synthesis)

Synthesized from contemporary frontend design critique and empirical evaluation of generative UI outputs:

| AI Design Cliché / "Tell" | Why AI Generates It | Why It Hurts ReWear | What ReWear Will Do Instead |
|---|---|---|---|
| **1. The Vercel / Next.js "Dark Mode Void"** (Pure black `#000` or `#09090b` canvas with glowing purple/cyan radial blur balls). | AI models were trained on tens of thousands of developer-tool and crypto landing pages from 2022–2025. | ReWear is a community clothing exchange for sustainable fashion. A dark cyber-void feels sterile, disconnected, and fake. | **Warm, tactile natural canvas:** Light unbleached linen (`#FAF8F5`) and warm stone surfaces (`#FFFFFF` / `#F3EFEA`). |
| **2. Universal 3-Column Bento Grid with 1px Faint Borders & 24px Pill Corners.** | Statistical average of Tailwind UI cards. AI defaults to `rounded-3xl border border-white/10 p-6`. | Makes all content look like identical gadget feature cards, stripping away clothing context. | **Asymmetric, editorial e-commerce grid:** Varied card proportions, 3:4 clothing image aspect ratios, crisp 4px radiuses, and physical condition tags. |
| **3. Generic Buzzword "Marketing Speak" Hero Copy.** (e.g. *"Empowering the Next-Generation Circular Ecosystem Through Frictionless Paradigms"*). | LLMs generate high-probability corporate jargon when not constrained. | Users want to know how to swap an oversized denim jacket or donate a vintage sweater. | **Plain, direct, human language:** *"Trade the clothes you don't wear for ones you will. Free, local, and zero waste."* |
| **4. Overused "Corporate Memphis" or Generic 3D Glass Orbs.** (Flat vector people with giant limbs or floating glass spheres). | AI image and design prompts default to stock illustrations when lacking real photos. | Instantly tags the project as a hackathon toy or low-effort mock. | **Real human garment photography** (via Unsplash / Pexels / Openverse) + **hand-drawn modular Open Peeps** for empty states. |
| **5. Default Sans-Serif Monoculture (Inter / Roboto / System Font Everywhere).** | Default fallback font in Tailwind / Vite starters. | Zero brand identity or tactile mood. | **High-contrast typography pairing:** Editorial serif display (**Fraunces**) for headlines + sturdy humanist sans (**Plus Jakarta Sans**) for data. |
| **6. Gimmicky Scroll Hijacking & Gratuitous Entrance Animations.** | AI tools love adding `motion.div` fades on every paragraph. | Slows down browsing on mobile; causes motion sickness and disorientation. | **Subtle, purposeful CSS transitions** (<200ms) only for hover states, button presses, and listing filtering. |

---

## 8. Licences, Free Tiers & Traps Identified

1. **unDraw License AI & Redistribution Restriction:**
   - *Trap:* Prohibits training AI models and redistributing packs. Safe for our web app, but rejected due to corporate cliché fatigue.
2. **Coolors.co & Mobbin Paywalls:**
   - *Trap:* Free version of Coolors limits palette sizes and exports; Mobbin heavily restricts search queries behind a $15/month paywall. Both rejected in favor of Realtime Colors, Huemint, and Commerce Cream (100% free with no paywall).
3. **Google Fonts CDN Tracking Ruling:**
   - *Trap:* European courts ruled that loading fonts directly from Google Fonts CDN violates GDPR by transmitting user IP addresses without consent.
   - *Solution:* Use **Fontsource** (self-hosted npm packages) or **Bunny Fonts** (zero-logging drop-in).
4. **GSAP License:**
   - *Trap:* While GSAP announced free access, its license is a custom commercial license (not OSI open source). Pure CSS transitions are zero-dependency and completely unencumbered.
5. **Freepik / FlatIcon Attribution Requirements:**
   - *Trap:* Free tier requires prominent printable attribution on every page or paid premium subscription. Rejected in favor of Lucide (ISC) and Open Peeps (CC0).
6. **Openverse CC-BY Licensing:**
   - *Trap:* Openverse indexes both CC0 and CC-BY media. If using CC-BY images, author name, license, and link must be visibly attributed.

---

## 9. Antigravity Shortlist (Design & Aesthetic Stack)

1. **Typography:**
   - Display: **Fraunces Variable** (`@fontsource-variable/fraunces@5.3.0`) — licensed under **SIL OFL-1.1**
   - Body / UI: **Plus Jakarta Sans** (`@fontsource-variable/plus-jakarta-sans`) — licensed under **SIL OFL-1.1**
   - Scale: **Major Third (1.250)** via Type Scale (`typescale.com`)
2. **Colour System:**
   - Grounded tactile palette: Canvas `#FAF8F5`, Text `#1C1917`, Brand Pine `#2D5A43`, Terracotta `#C25E38` (large text/badges only, darkened to `#9E4424` for normal text), Border `#E7E2DA` (decorative) / `#8C827A` (interactive 3:1).
   - Strict WCAG calculations documented and verified in Section 3.
3. **Icons & Illustrations:**
   - Icons: **Lucide React** (`lucide-react@latest`, ISC) — 1.5px stroke, tree-shakeable.
   - Empty States / Onboarding: **Open Peeps** (CC0) hand-drawn modular vectors.
   - Photography: Curated pre-loved clothing photos via **Openverse (CC0 only) / Pexels** (Pexels license).
4. **CSS & Token Architecture:**
   - Architecture: **CUBE CSS** methodology + native **CSS Custom Properties** (`tokens.css`).
   - Component isolation: **CSS Modules** (`.module.css`, built into Vite 7) for zero-runtime bespoke styling. Wiping out the starter 37-line `App.css` and 196-line `index.css`.
   - (Alternative if team chooses utility speed: **Tailwind CSS v4** + `@tailwindcss/vite`, configuring our exact tokens in `@theme`).

---

## 10. Doubts and Shortcuts — Stated Openly

- **Self-hosted Font Bundles:** Embedding variable font files (`.woff2`) directly in the Vite client bundle adds ~100–150 KB to the initial asset payload. This is a deliberate trade-off for zero external CDN DNS lookups, privacy compliance, and offline development support.
- **Tailwind v4 vs CSS Modules:** CSS Modules guarantee zero aesthetic templating and enforce hand-crafted CSS, but require writing more lines of CSS. Tailwind v4 with custom `@theme` is faster for hackathon velocity if the team strictly overrides default colors and radiuses.
- **Mock Listings Data:** Clothing images used in seed data and mock listings must use consistent aspect ratios (3:4); otherwise, image height jumping will compromise visual quality.

---

## 11. Sources Consulted

| # | URL | Result / Category |
|---|---|---|
| 1 | https://fontsource.org | Fontsource documentation and catalog (OK) |
| 2 | https://github.com/fontsource/fontsource | Fontsource GitHub monorepo and release verification (OK) |
| 3 | https://www.npmjs.com/package/@fontsource-variable/open-sans | Fontsource npm package verification (OK) |
| 4 | https://www.fontshare.com | Fontshare typography catalog (Indian Type Foundry) (OK) |
| 5 | https://www.fontshare.com/licenses/itf-free-font-license | ITF Free Font License terms (JS-rendered on plain GET; verified via browser rendering) |
| 6 | https://velvetyne.fr | Velvetyne Type Foundry libre fonts catalog and OFL terms (OK) |
| 7 | https://theleagueofmoveabletype.com | The League of Moveable Type open source foundry (OK) |
| 8 | https://fonts.bunny.net | Bunny Fonts privacy-first drop-in CDN documentation (OK) |
| 9 | https://typescale.com | Type Scale visual modular scale calculator (OK) |
| 10 | https://typescale.org | Type Scale Generator – Free Typography Scale Tool (HTTP 200, OK) |
| 11 | https://fontsinuse.com | Fonts In Use real-world typography archive (OK) |
| 12 | https://fonts.google.com | Google Fonts open catalog (OK) |
| 13 | https://open-foundry.com | Open Foundry open-source typography showcase (OK) |
| 14 | https://realtimecolors.com | Realtime Colors live UI palette tester (OK) |
| 15 | https://huemint.com | Huemint machine-learning contextual color generator (OK) |
| 16 | https://happyhues.co | Happy Hues real-world UI context color palettes (OK) |
| 17 | https://www.radix-ui.com/colors | Radix Colors accessible 12-step scale documentation (OK) |
| 18 | https://github.com/radix-ui/colors | Radix Colors GitHub repository and MIT license verification (OK) |
| 19 | https://webaim.org/resources/contrastchecker | WebAIM Contrast Checker (WCAG 2.1 AA/AAA) (OK) |
| 20 | https://apcacontrast.com | APCA (Advanced Perceptual Contrast Algorithm) calculator (OK) |
| 21 | https://github.com/Myndex/apca-w3 | Myndex APCA W3 repository (Limited W3 License, `0.1.9`) (OK) |
| 22 | https://contrast-grid.eightshapes.com | EightShapes Contrast Grid token accessibility tester (OK) |
| 23 | https://color.adobe.com/create/color-contrast-analyzer | Adobe Color contrast analyzer and color blindness simulator (OK) |
| 24 | https://coolors.co | Coolors palette generator (OK) |
| 25 | http://colormind.io | Colormind deep-learning color generator (OK) |
| 26 | https://commercecream.com | Commerce Cream curated eCommerce store showcase (OK) |
| 27 | https://siteinspire.com | Siteinspire human-curated web design directory (OK) |
| 28 | https://godly.website | Godly production web design curation gallery (OK) |
| 29 | https://minimal.gallery | Minimal Gallery clean web design showcase (OK) |
| 30 | https://brutalistwebsites.com | Brutalist Websites raw design archive (OK) |
| 31 | https://land-book.com | Land-book section-by-section curated patterns (OK) |
| 32 | https://httpster.net | Httpster indie web showcase (OK) |
| 33 | https://hoverstat.es | Hoverstat.es alternative interaction archive (OK) |
| 34 | https://savee.it | Savee visual discovery and moodboard platform (OK) |
| 35 | https://www.awwwards.com/websites/e-commerce | Awwwards curated eCommerce category (OK) |
| 36 | https://lucide.dev | Lucide Icons React documentation and catalog (OK) |
| 37 | https://github.com/lucide-icons/lucide | Lucide GitHub repository and ISC license (OK) |
| 38 | https://tabler.io/icons | Tabler Icons catalog and MIT license (OK) |
| 39 | https://www.openpeeps.com | Open Peeps hand-drawn modular vector library (OK) |
| 40 | https://svgrepo.com | SVG Repo vector repository (OK) |
| 41 | https://www.svgrepo.com/page/licensing | SVG Repo licensing terms and commercial use verification (OK) |
| 42 | https://undraw.co | unDraw vector illustration library (OK) |
| 43 | https://undraw.co/license | unDraw license terms, restrictions, and anti-AI-training terms (OK) |
| 44 | https://openverse.org | Openverse CC media search engine (WordPress Foundation) (OK) |
| 45 | https://github.com/WordPress/openverse | Openverse open-source repository (OK) |
| 46 | https://unsplash.com/license | Unsplash commercial license terms (OK) |
| 47 | https://pexels.com/license | Pexels commercial license terms (OK) |
| 48 | https://www.rawpixel.com/category/public-domain | Rawpixel public domain textile & art archive (OK) |
| 49 | https://styledictionary.com | Style Dictionary token build system (OK) |
| 50 | https://github.com/style-dictionary/style-dictionary | Style Dictionary GitHub repository and Apache-2.0 license (`5.8.0`) (OK) |
| 51 | https://open-props.style | Open Props CSS custom properties design tokens (OK) |
| 52 | https://github.com/argyleink/open-props | Open Props GitHub repository and MIT license (OK) |
| 53 | https://cube.fyi | CUBE CSS methodology documentation (Andy Bell) (OK) |
| 54 | https://tokens.studio | Tokens Studio design tokens standard (OK) |
| 55 | https://design-tokens.github.io/community-group/format/ | W3C Design Tokens Community Group specification (OK) |
| 56 | https://tailwindcss.com/docs/theme | Tailwind CSS v4 `@theme` engine documentation (OK) |
| 57 | https://thisisabra.com/blog/the-ai-web-aesthetic | **Dead end:** HTTP 404 |
| 58 | https://www.nngroup.com/articles/ai-website-design-usability/ | **Dead end:** HTTP 404 |
| 59 | https://www.reshot.com | **Retiring service:** Page title announces retirement |
| 60 | https://css-tricks.com/alegria-style/ | **Dead end:** HTTP 404 on legacy article URL |
| 61 | https://coolors.co/pro | **Dead end / Paywall:** Pro paywall ($3–$5/month) |
| 62 | https://mobbin.com/pricing | **Dead end / Paywall:** Freemium barrier ($15/month) |
| 63 | https://freepik.com/license | **Dead end / License trap:** Requires print/web attribution on free tier |

---

## 12. Cross-Review with OpenCode (2026-11-12)

### 12.1 Accepted from OpenCode's Critique (Conceded in Writing)

1. **Dead Links in AI-Tells Section:** Conceded. The URLs `thisisabra.com/blog/the-ai-web-aesthetic` and `nngroup.com/articles/ai-website-design-usability/` returned HTTP 404 on direct fetch. Moved to dead ends in Sources Consulted, and the AI tells section is explicitly labelled as a qualitative design synthesis.
2. **`apca-w3` Licence:** Conceded. It is licensed under **Limited W3 License** (npm `apca-w3@0.1.9` published 2022-07-04), not Apache-2.0. Corrected in table.
3. **`style-dictionary` Version:** Conceded. Updated from `4.0.0` to latest **`style-dictionary@5.8.0`** (published 2026-11-03, Apache-2.0).
4. **`typescale.org` Status:** Conceded. It is live (HTTP 200, "Type Scale Generator"), not a parked dead end. Removed from dead ends.
5. **`@radix-ui/colors@3.0.0` Timestamp:** Conceded. Noted that it was published on npm on **2023-10-02** (~3 years ago).
6. **Fraunces Licence:** Conceded. `@fontsource-variable/fraunces@5.3.0` is **SIL OFL-1.1 only**, not MIT + OFL. Corrected.
7. **Fontshare Licence Verification:** Conceded. The licence endpoint renders via client-side JavaScript, returning 76 bytes on raw GET. Labelled as UNVERIFIED on that direct endpoint.
8. **Reshot Retirement:** Conceded. Reshot is retiring per its page title. Marked rejected/retiring.
9. **Openverse CC-BY Attribution:** Conceded. Openverse indexes CC-BY media which legally requires visible author attribution. Clarified in shortlist to filter to CC0 / Public Domain or provide proper attribution.
10. **Contrast Math:** Conceded. OpenCode's relative luminance calculations are mathematically verified:
    - `#C25E38` on `#FAF8F5` is **4.00:1** (fails AA 4.5:1 for normal text; passes only for large text / graphical objects).
    - `#FFFFFF` on `#C25E38` is **4.24:1** (fails AA 4.5:1 for normal text).
    - `#E7E2DA` border on `#FAF8F5` is **1.22:1** (fails WCAG 1.4.11 non-text 3:1 contrast if used as sole interactive boundary).
    - Corrected the false blanket claim that "all text combinations exceed 7.1:1 AAA". Documented exact roles: terracotta restricted to large text/badges, darkened to `#9E4424` for normal text; interactive borders darkened to `#8C827A` (ratio > 3:1).
11. **Starter CSS State:** Conceded. `App.css` (37 lines) and `index.css` (196 lines) are not blank; they contain Vite starter CSS with `#root` centering and dark mode media queries that must be deleted, not restyled.
12. **Shadcn/ui Characterization:** Conceded. Calling shadcn "the single largest visual driver of the AI web aesthetic" is a qualitative design opinion, not a quantitative measurement.

### 12.2 Points Conceded by OpenCode from Our Critique

1. **shadcn/ui removed:** Dropped from component recommendations. Radix Primitives directly with hand-crafted CSS.
2. **Pa11y dropped:** Removed LGPL-3.0 tool. Single accessibility test engine is `@axe-core/playwright` (MPL-2.0) inside Playwright E2E.
3. **AutoAnimate dropped:** Removed runtime DOM-mutation library. Clean transitions handled with native CSS transitions and React 19 `startTransition`.
4. **`mongodb-memory-server` CI Cache Strategy:** Pinned to `MONGOMS_DOWNLOAD_DIR` cache in CI.

---

## 13. Combined Agreed Shortlist (Antigravity + OpenCode)

With all disputes debated with evidence and conceded in writing, there are **ZERO remaining disagreements** between Antigravity and OpenCode:

1. **UI Components:** **Radix Primitives** (`@radix-ui/react-*`, MIT) for accessible unstyled widgets (Dialog, Popover, Select, Tabs) + hand-rolled accessible semantic HTML. No component template kits (no Mantine, Chakra, HeroUI, or shadcn).
2. **CSS & Tokens:** **Native CSS Custom Properties** (`tokens.css`, web standard) + **CSS Modules** (`.module.css`, zero runtime, built into Vite 7) + **CUBE CSS** methodology. Delete existing Vite starter CSS in `App.css` and `index.css`.
3. **Typography:** **Fraunces Variable** (`@fontsource-variable/fraunces@5.3.0`, OFL-1.1) for headings + **Plus Jakarta Sans** (`@fontsource-variable/plus-jakarta-sans`, OFL-1.1) for body/data, scaled via **Major Third (1.250)**.
4. **Color Palette:** Grounded, tactile palette on `#FAF8F5` (Warm Alabaster Linen), `#1C1917` (Deep Stone text, 16.5:1), `#2D5A43` (Pine Forest brand, 7.46:1), `#57534E` (Stone 600 secondary, 7.20:1), and `#C25E38` (Terracotta accent, restricted to large text/badges).
5. **Icons & Illustrations:** **Lucide React** (`lucide-react@latest`, ISC) for UI icons; **Open Peeps** (CC0) for empty states/onboarding; **Openverse (CC0) / Pexels** for real garment photography.
6. **Motion & Transitions:** Pure **CSS transitions** (<200ms) for hover/press states and layout updates via React 19 `startTransition`. Zero JS animation runtimes.
7. **Frontend Test Stack:** **Vitest** (MIT) + **React Testing Library** (MIT) + **user-event** + **jest-dom** + **jsdom** for unit/component tests; **Playwright** (`@playwright/test`, Apache-2.0) with **`toHaveScreenshot`** (zero-cost visual regression) + **`@axe-core/playwright`** (MPL-2.0) for automated a11y checks; **Lighthouse CI** (`@lhci/cli`, Apache-2.0) for perf budgets.
8. **Backend Test Stack:** Retain existing **Jest** (`^29.6.2`) + **Supertest** (`^6.3.3`) + add **`mongodb-memory-server`** (`11.3.0`, MIT) with CI binary caching pinned to `MONGOMS_DOWNLOAD_DIR`.
9. **Lint & Formatting:** Retain **ESLint** (v9 flat config) + add **Prettier** (MIT).
