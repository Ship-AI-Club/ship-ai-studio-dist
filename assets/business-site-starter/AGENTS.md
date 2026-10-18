# Build from the owner's shared brief

A business-agnostic Next.js App Router starter. No API keys, AI provider, email, account system, analytics or live webhook. The local example assessment uses fixed rules and sends/saves nothing. Read the owner's files first. Never replace their business with fixture content.

Product Manager asks three initial questions and collects intake and all specialist results in brief/project.json. Research does not repeat intake. Designer + PM choose one useful visitor experience. Frontend + Designer build it; Backend joins only when needed. PM collects decisions and owner feedback. After approval Social Media Manager coordinates Performance Marketer and two creators from this same brief.

Read .agents/product-marketing.md and actual .agents/skills/ files. Preserve attribution/licenses. Source skills do not authorize installing unrelated tools, creating routines or invented urgency/social proof. The owner's request, evidence and project boundaries override those examples.

Adapt copy, offer, buying roles and next action to B2B/B2C/mixed contexts; never assume category alone decides a CTA. Never invent founders, bios, reviews, expertise, outcomes, prices or proof. Ask only missing decisions.

## User language

Read .agents/skills/studio-workshop-owner-language/SKILL.md. Its rules cover only owner questions, progress updates, workshop steps and interface help or error text. Headlines, site copy and ads follow the business's approved voice and audience vocabulary from the positioning, the brief and design/contract.md; do not apply workshop sentence limits, contraction or metaphor bans, or automatic acronym definitions to them. Explain a term only when the target audience needs it. Keep plain language and truthful claims everywhere. Keep code and tool details in bot handoffs.

## Product Designer

Load .agents/skills/studio-yc-interface-craft/SKILL.md and only the 3-5 research records that match the problem as the primary visual-direction workflow. Follow the approved positioning and preserve existing brand equity. By default, privately compare 2-3 strong directions, select one and record the rationale in design/contract.md. Show the owner directions only when the owner asks for exploration or a real business decision is missing. Preserve any direction the owner chose. Never ask the owner to settle routine layout decisions. Small fixes within an approved direction proceed directly. Frontend reads the selected rules and works with Designer throughout implementation. Keep reference research dated; do not imply YC endorsement or copy another company’s identity.

## Build

This starter is a neutral technical shell. It has no page design. `app/page.jsx` is a plain placeholder, and a real (non-demo) production build fails until the design gate passes. Follow .agents/skills/studio-design-gate/SKILL.md.

1. Read/version the intake, approved research/positioning, product requirements and design in brief/project.json. Only the PM prepares this project; work in it, never in a copy.
2. Run npm run configure -- --brief brief/project.json. It validates the contract and generates content/site.json plus .agents/product-marketing.md. Save manual edits before regenerating.
3. Marketing records the offer review in design/gate.json. The Product Designer replaces design/contract.md with the one-page contract and sends it directly to Frontend.
4. Gate 1: replace the placeholder with production components written for the contract, for the hero and first proof section only, applying the relevant skills. Run npm run build:review, capture 1440px and 390px screenshots in Cloud, and record them in design/gate.json. Separate design and marketing reviewers write critiques against the reject criteria; Frontend revises and re-renders until both PASS. Build nothing else until then.
5. Build the rest of the approved site. Run npm run check and npm run build (the build runs npm run verify:gate). Walk desktop/phone journeys and keyboard/error/success states in a real browser.
6. Gate 2: the same reviewers pass desktop and phone screenshots of every page and visitor state in the contract's Experience inventory (one screenshot may show several states; each distinct promised experience needs review); npm run verify:owner-review must pass. Then the PM asks the owner to review. Deployment and production integrations are separate decisions.

Gate evidence is bound to exact inputs. Before each review round, run `npm run gate:fingerprint` and record its `sourceSha256` and `briefSha256` on the round; each reviewer cites both, and each rule verdict is exactly PASS or REJECT. Gate 1 binds its own hero and proof snapshot, so building the rest of the site after Gate 1 PASS does not reopen it. Gate 2 binds the current complete candidate: any later visitor-visible edit voids it until the changed render is reviewed again. The fingerprint covers what visitors see: page source, styles, config, the contract and the configured brief's visitor content, including every status, `approved` flag and the mode, because those decide which pages, price labels and review notes appear. Approval evidence and release metadata (`approvedBy`, `approvedAt`, the brief `version`, `intake`, `setup`, `publicationApproved`, `siteUrl`) are left out, so recording them after review does not void it. When the owner's final approvals switch the brief to production, the price label and review note change, so render that production candidate locally and add a Gate 2 round for it before the owner approves publication. The Frontend agent who built the render never reviews it.

This starter is JavaScript. It has no TypeScript and no typecheck script. `npm run check` and `next build` compile JSX and run tests; neither is a type check. Report "no typecheck available", never "typecheck passed".

Do not turn the contract into a data-driven section builder. design/contract.md and design/gate.json record decisions and review state; the page itself is normal Next.js code written for this business.

## Content

About: use about-page and copywriting/editing. Verify purpose, origin, people/credentials and offer. Omit unknown claims.

SEO articles: use content-strategy, seo-article, copywriting/editing and SEO audit. Research actual search intent and dated sources, write an original useful answer, then save structured sections to articles in the brief. Keep draft until reviewed. Approved articles need actual author/review date, unique slug/title/description, useful sections and valid source IDs. Structural checks do not replace editorial review.

Programmatic pages: use programmatic-seo, site-architecture, seo-audit and schema. Choose one data-backed page family relevant to this business: use cases, industries, integrations, services or real locations. No keyword-swapped pages, fictional service coverage or mass filler. Each approved solutions row needs distinct uniqueValue, useful sections and sources. Review the first rendered page, intent and internal links before scaling. Rankings are not guaranteed.

Only approved content appears in public routes/listings/sitemaps. Preview is noindex/robots-disallow.

A first-time owner's draft uses `mode: "review"` with `isDemo: false`. It builds from the owner's answers (`intake.answers` with `source: "owner"`) plus recommendations marked `status: "proposed"` with a `source` and a `rationale`. Never write an approval the owner did not give, and never set `isDemo` true for a real business; validation and the design gate refuse both. Review mode adds a visible private-draft note, noindex meta, robots disallow and an `X-Robots-Tag` header. The build refuses to run in a hosting deploy environment, and `npm run verify:publish` refuses review mode. Show pricing only when approved, or with `priceLabel` from lib/brief.mjs, which marks a proposed price as not final. Production (`mode: "production"`, checked by `npm run verify:production`) needs the owner's final approval of positioning, product scope, evidence sources and any visible pricing.

A production brief cannot build without those approvals: `npm run build` runs `verify:release` first, which rejects missing approvals locally and, in a hosting deploy environment, requires full publication readiness.

Publication requires mode production, isDemo:false, publicationApproved:true, a real HTTPS siteUrl, a Gate 2 PASS and `ownerApproval` in design/gate.json recording who approved, when, and the `sourceSha256` and `briefSha256` of the exact reviewed render. `npm run verify:publish` fails if the current source or brief differs from that approved artifact. These flags do not deploy or substitute for actual approval.

## Visitor experience

Every visitor form uses `components/VisitorForm.jsx`, never a raw `<form>`. It always uses `method="post"` with a same-site path or HTTPS action. A local-only form stays disabled until JavaScript runs, so a browser without JavaScript cannot fall back to a GET submit that puts answers in the URL. In review mode, sending forms show "Preview only" and send nothing. After a build, `npm run verify:forms` submits every form in headless Chrome with JavaScript disabled and fails if a value reaches the URL or a request, or if review mode sends any request. It runs only against a local build it starts (or a `--url` on 127.0.0.1/localhost), intercepts every request after submit inside the browser and answers it with a stub, so no lead reaches a server. It refuses to submit a form whose action is another origin and reports it. A non-review form's POST body to its own action is recorded as intentional, not as a leak.

Replace /start with the approved real journey. Never fake account creation, payment, booking, message delivery or storage. For relevant leads, use the parent kit's disabled webhook-guide.md; keep keys server-side, validate/dedupe and distinguish accepted work from delivery. Optional Gmail needs the connected bot and explicit owner-enabled policy. No real sends from tests. Account products should focus on genuine signup/onboarding.

Keep private briefs, workspace IDs and keys out of reusable exports. No downloaded skill is executed automatically.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## Project scope

Use only the project folder and processes created for this task. Record the PID, command and working folder of each preview server you start. Stop only a recorded process that this task started. Never stop processes by port or broad name. If a port is busy, use another free port. Do not change another project. Save each approval in the one shared brief, increase its version, and send the path and version to each specialist. Each specialist must read that version before acting. Do not ask the owner to repeat an approval because a local copy is old.


## Shared design skills

Product Designer and Frontend Engineer use the same full design skill library, versions and reference files. Every full file stays available in the shared project and the Cloud workspace; available does not mean loaded. Follow the precedence in studio-design-gate: YC Interface Craft leads visual direction (read its SKILL.md and only the 3-5 matching research records); Intentional UI Design sets the quality floor; frontend-design guides composition and type. Load Illustration Design Grammar, motion (Emil design engineering and the animation skills) and component references only when the chosen design needs them, and record that choice in the design contract. product-marketing, copywriting, copy-editing and conversion guidance shape the copy. A link or summary is not a loaded skill. Use design-skill-library.json to compare file hashes and preserve licenses. Do not load unrelated native-app guidance. Frontend keeps its engineering, SEO, build and test skills. It implements the contracted type, spacing, color, imagery, interaction and motion as components written for this page. Do not invent a new direction or repeat exploration after approval. Record the paths actually read in evidence/design-skills-read.md. The Designer and a marketing reviewer pass Gate 1 and Gate 2 on actual screenshots before the owner review.


## Frontend Cloud build

Start approved website implementation in Cursor Cloud automatically. Select the saved Sonnet 5.5 Medium or Opus 5.5 Medium choice with the actual Cloud tool selector. Do not wait for an extra owner prompt. Verify the returned run URL and actual model before reporting success. In every Cloud run, read the actual Cloud model selector setting (for example "Claude Opus 5.5 Medium", Fast off) and record that exact text as evidence in the handoff and design/gate.json. Never silently substitute another model. Send feedback to the same project and the same run. Do not silently use Fast, Auto, another model or a local bot build. If the exact model or Cloud capability is unavailable, report the specific blocker to PM and ask for a fallback decision. The saved owner choice controls the coding handoff. Keep the business, audience and brand agnostic. Reuse the recorded run for the same task and feedback; do not start duplicate runs.

Before launch, load the full Next.js starter and verify every path and SHA256 in design-skill-library.json. Use npm run verify:design where supplied; otherwise perform the same full file audit. Stop on missing or changed files. Include hidden .agents/skills/ and .cursor/ folders, AGENTS.md, README.md, the approved shared brief, design handoff, copy, lockfile, manifests, reference files and licenses in the actual Cloud repository or upload. Local skill cards, links and summaries do not supply Cloud context. Exclude secrets, private chats, node_modules, .next and unrelated files. Require the Cloud agent to repeat the file audit inside its workspace, read the applicable actual design/copy files and references, and record what it read. A hash check proves integrity, not that skills were read or applied.

Frontend coordinates the PM, Designer and Cloud agent through studio-design-gate. The Cloud agent first builds ONLY the hero and first proof section from the design contract, as production components written for this page, with the full relevant skills and references actually read and applied. A low-fidelity mock is never labeled premium. It runs npm run build:review and captures desktop (1440px) and phone (390px) screenshots. A separate design reviewer and a separate marketing reviewer critique those renders and reject weak composition, generic branding, poor type, dense copy, weak proof or a CTA mismatch with specific corrections. Frontend revises and re-renders in the same run until both PASS; every round is recorded in design/gate.json. Nothing else is built until both PASS. Then the Cloud agent builds the full site, runs the real checks, build and browser journeys, and Gate 2 reviews every page and visitor state in the contract's Experience inventory (each in-scope route, plus forms with their useful results and errors where in scope) on actual desktop and phone screenshots, and both reviewers cover each one, before the PM shows the owner. Tests, read logs and hashes never pass a gate. Save the run URL, actual model selector text, brief version, file audit and skill-read record with the handoff. Stop before deployment and external sends.

Read CLOUD-HANDOFF.md in the project root (assets/business-site-starter/CLOUD-HANDOFF.md in the plugin). The starter runs the design file audit before check and build. Keep evidence/design-skills.json and evidence/design-skills-read.md separate.


## Current handoff

Before launch and after each feedback or scope change, get the current PM brief and approved design/copy handoff. Record their versions, approval state and file hashes in a handoff manifest. Send updated files to the same Cloud run and require acknowledgment of the received versions before further implementation. Recover existing approvals from PM; do not ask the owner to repeat them. An initial upload does not carry later decisions. Distinguish an uploaded archive audit from verification of files inside the live Cloud workspace.


## PStack and model setup

Read ENGINEERING-SETUP.md for the native bot setup. PStack is a plugin, separate from the source design skills.
Run its first-use setup in the coordinating bot and verify the resulting model rule. Preserve the saved Sonnet 5.5 Medium or Opus 5.5 Medium choice. Do not change unrelated global settings.
A Cloud agent already assigned this repository implements the handoff here; it must not start another Cloud agent.
Keep the PM brief, generated site contract and current design/copy handoff aligned by version and hash.
