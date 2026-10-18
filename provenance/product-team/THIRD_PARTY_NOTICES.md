# Third-party source notices

Preserve the notices in each skill folder and in licenses/ when redistributing this package. `sources.json` is the file-by-file record: every vendored file is listed with its source, pinned version, license and sha256, and `node scripts/verify-plugin.mjs` fails if a file under skills/ has no provenance record or no longer matches it.

| Source | Version | License | Where the license lives |
| --- | --- | --- | --- |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | commit 2d228630ba1446365f614a108cb8252f1feda202 | MIT | licenses/emilkowalski/LICENSE, skills/_licenses/emilkowalski/LICENSE, and a copy in each vendored skill folder |
| [anthropics/skills](https://github.com/anthropics/skills) (frontend-design) | commit dbd4588f9e1033efb41dad4bef2f7947c8993d44 | Apache-2.0 | skills/frontend-design/LICENSE.txt; supplied notices in licenses/anthropics/THIRD_PARTY_NOTICES.md |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | commit 365b412152b9542499ca1439426f7fc3cc92bb65 | MIT | licenses/coreyhaines31/LICENSE, skills/_licenses/coreyhaines31/LICENSE, and a copy in each vendored skill folder |
| YC Interface Craft (owner-supplied archive) | snapshot 2026-10-16, archive sha256 ff6fc8935ee1313f54b13bb0901826305d3fcbd46e109aa382d3a64ce1ec408b | Owner-supplied for redistribution; no upstream license file | sources.json |
| Intentional UI Design, Illustration Design Grammar (owner-supplied) | as first packaged in 1.0.0, unchanged | Owner-supplied for redistribution; no upstream license file | sources.json |

Release 1.0.3 adds these files from coreyhaines31/marketingskills at commit 365b412152b9542499ca1439426f7fc3cc92bb65, unchanged, under its MIT license:

- `skills/ad-creative/assets/creative-review-template.html`, from `skills/ad-creative/assets/creative-review-template.html` at that commit, sha256 0ca7cce4fa809235aee776606205925d8dc01bde8a8325e2af7197d86394d3b7.
- `skills/customer-research/` (SKILL.md, evals/evals.json, references/interviews-and-surveys.md, references/source-guides.md) with its LICENSE copy.
- `skills/competitor-profiling/` (SKILL.md, evals/evals.json, references/templates.md, references/tool-reference.md) with its LICENSE copy.

Owner-supplied skills keep their attribution. Do not imply YC or any referenced company's endorsement. Brand marks and reference company identities do not transfer to generated projects.

Fonts: this release ships no font files. The starter and its examples use system font stacks. Any font file added later must ship with its OFL (or other) license file in the same folder and be listed in sources.json; the verifier enforces this.

Files listed under `original` in sources.json were written for this plugin and are covered by the root LICENSE.
