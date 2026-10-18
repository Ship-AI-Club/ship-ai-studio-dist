# Provenance

Every file in this plugin is either Ship AI-authored (MIT, see [LICENSE](LICENSE)) or listed below with its source, version and license. Anything without a known source is excluded and listed in the last section. Checked on 2026-10-18.

## Ported or adapted third-party material

| Material | Where it is used | Source | Version | License | How it was checked |
|---|---|---|---|---|---|
| Copy-craft guidance from the `ads`, `ad-creative`, `social` and `content-strategy` skills by Corey Haines | Adapted (rewritten, not copied) in `skills/studio-performance-marketer`, `skills/studio-static-creator`, `skills/studio-video-creator`, `skills/studio-social-media-manager` | https://github.com/coreyhaines31/marketingskills | commit `365b412152b9542499ca1439426f7fc3cc92bb65` | MIT, [licenses/coreyhaines31/LICENSE](licenses/coreyhaines31/LICENSE) | The four upstream `SKILL.md` files and `LICENSE` at that commit were fetched and compared byte for byte with the copies the adaptation was written from; all matched. |
| Plus Jakarta Sans, latin subset, weights 400, 600, 800 (`.woff2`) | `assets/marketing/fonts/plus-jakarta-sans/` | Font project: https://github.com/tokotype/PlusJakartaSans. Files as packaged by Fontsource: npm `@fontsource/plus-jakarta-sans` | `@fontsource/plus-jakarta-sans` 5.2.6 (5.2.7, 5.2.8 and 5.3.0 ship the same bytes) | SIL OFL 1.1, [OFL-LICENSE.txt](assets/marketing/fonts/plus-jakarta-sans/OFL-LICENSE.txt) beside the files | All three files match the 5.2.6 npm tarball by sha256. The license file's body is identical to that package's `LICENSE`; its first line names the font's copyright holders instead of the packager. |

## Runtime dependencies (installed by npm, not included)

`assets/marketing/package.json` pins these; `package-lock.json` records the exact tree.

| Package | Version | License |
|---|---|---|
| `remotion`, `@remotion/cli`, `@remotion/renderer`, `@remotion/bundler` | 4.0.535 | Remotion License: free for individuals, for-profit organizations with up to 3 employees and non-profits; other for-profit organizations need a company license (https://www.remotion.dev/license) |
| `react`, `react-dom` | 19.1.1 | MIT |
| `typescript` (dev) | 5.9.3 | Apache-2.0 |
| `@types/react` (dev) | 19.1.13 | MIT |

## Ship AI-authored material

| Material | Origin |
|---|---|
| Skills, registry, scripts and guards | Written for this release. The Social Media Manager, Performance Marketer, Static Creator and Video Creator workflows were drafted from Ship AI's own role exports and the owner's requirements. |
| Renderers in `assets/marketing/` (`src/`, `lib/`, `render-*.mjs`) | Rewritten from Ship AI's earlier internal render templates, with all client content removed. The earlier templates' authorship was taken from Ship AI's internal record; they were not independently audited for third-party code beyond the fonts above. |
| Old skill names in `scripts/legacy-product-team-skills.json` | Names only, from Ship AI Product Team 1.0.2 (MIT, Ship AI), commit `2c12f12`, so the resolver can refuse them. |

## Product Team skills: imported

The Product Team skills, starter and role files were imported by `scripts/import-product.mjs` from ship-ai-product-team branch `cursor/release-1-0-3-design-gate-7266` at the reviewed commit `87248784ba3c12a8787839a2dd2a78bd4982f23c` (Product Team 1.0.3, 2026-10-18). That repo's `sources.json`, `THIRD_PARTY_NOTICES.md` and `LICENSE` are copied byte for byte to `provenance/product-team/`, and every imported file's source and sha256 is in `provenance/product-import.json`. The table below matches that `sources.json` at the imported commit.

| Material | Source | Version | License as recorded |
|---|---|---|---|
| Animation, interface and Swift skills by Emil Kowalski (`animate`, `animate-expo`, `animation-performance`, `animation-vocabulary`, `apple-design`, `ask-sonner`, `break-ui`, `emil-design-eng`, `find-animation-opportunities`, `improve-animations`, `mobile-native`, `pick-ui-library`, `prototype`, `review-animations`, `write-swift`) | https://github.com/emilkowalski/skills | commit `2d228630ba1446365f614a108cb8252f1feda202` | MIT |
| `frontend-design` by Anthropic | https://github.com/anthropics/skills | commit `dbd4588f9e1033efb41dad4bef2f7947c8993d44` | Apache-2.0, with the license file in the skill folder and Anthropic's notices |
| Marketing skills by Corey Haines (`ad-creative`, `ads`, `competitor-profiling`, `content-strategy`, `copy-editing`, `copywriting`, `cro`, `customer-research`, `emails`, `lead-magnets`, `product-marketing`, `programmatic-seo`, `schema`, `seo-audit`, `signup`, `site-architecture`, `social`) | https://github.com/coreyhaines31/marketingskills | commit `365b412152b9542499ca1439426f7fc3cc92bb65` | MIT |
| YC Interface Craft | Owner-supplied: `yc-interface-craft.zip` | snapshot 2026-10-16, archive sha256 `ff6fc8935ee1313f54b13bb0901826305d3fcbd46e109aa382d3a64ce1ec408b` | No upstream license supplied. Kept as the owner supplied it; no license is asserted for it. |
| Intentional UI Design, Illustration Design Grammar | Owner-supplied with the workshop kit, first packaged in Product Team 1.0.0 (commit `7079062`) | as packaged in 1.0.0, unchanged | No upstream license supplied. Kept as the owner supplied it; no license is asserted for it. |

Product Team's own skills, starter and role files are Ship AI-authored (MIT).

## Unknown provenance: excluded

| Material | Why excluded |
|---|---|
| Example renders, posters and reels from the earlier internal templates | Client material with no public license. Not shipped; the tests use a small neutral fixture that is not distributed. |
| Exported role profiles (`*.json` from the internal marketing exports) | Internal records; one is partly reconstructed. Not shipped. `scripts/check-dist.mjs` fails if one reaches the distribution tree. |
