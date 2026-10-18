---
name: studio-design-gate
description: Make the first draft the owner sees polished. The Designer picks one direction and writes a one-page contract; Frontend builds the hero and first proof section in Cloud; separate design and marketing reviewers reject weak renders until both pass, before expansion and before the owner sees anything.
---

# Design contract and rejection gate

## 0. Resolve

From this folder run `node ../../scripts/resolve-studio.mjs --skill studio-design-gate`. Send the JSON to the PM. Stop on any error; never load an older product-team skill instead.

Generic first drafts are fixed upstream, inside the team. The owner and any outside coach never critique a generic draft. The owner first sees a polished review draft.

The starter is a neutral technical shell with a placeholder page. The contract guides a bespoke page that Frontend writes as normal Next.js components for this business. Do not build a data-driven section builder or reuse a generic section menu.

Record the contract in `design/contract.md` and gate state in `design/gate.json` in the PM's one project. Save renders under `design/renders/`. `npm run build` on a real (non-demo) brief fails until the contract and a Gate 1 PASS exist. Tests, read logs and file hashes cannot pass a gate. Only written reviewer critiques of actual screenshots can.

## 0. Offer review (before the first build)

Marketing (Social Media Manager, or a PM-run marketing review subagent that uses `studio-product-marketing`, `studio-copywriting` and `studio-cro`) checks the brief and research: one-sentence offer clarity for this customer, one primary CTA that fits the journey, and a proof plan with real sources. Save it as `offerReview` (`verdict`, `reviewer`, `offer`, `primaryCta`, `proofPlan`, `sources`). REJECT goes back to PM and Research. Nothing is built until it passes.

## 1. Direction and contract (Designer → Frontend, directly)

Default: privately compare 2-3 strong, business-relevant directions and select ONE. Record what you compared, the selection and the rationale under `## Direction`. Ask the owner to choose only when the owner asks for exploration or a real business decision is missing (for example, which offer leads). Preserve any direction the owner explicitly chose and write "Owner-chosen direction". Never ask the owner to settle routine layout, type or color decisions.

Send the one-page contract directly to Frontend with the PM copied. Group messages are text only: attach files to the project or send accessible Cloud artifact links. Sections, all checked by the gate:
- **Direction**: compared directions, selection and rationale (or owner-chosen direction).
- **References**: 2-4 reference images in the project, or accessible artifact links. Your own renders; never copied artwork, identity or copy.
- **Copy**: exact hero and first proof copy, from approved brief facts only. Short and scannable.
- **Type**: families, weights and sizes for desktop and phone, with font source or licence.
- **Tokens**: color roles with hex values; spacing and radius rules.
- **Composition**: the 1440px hero and first proof section, and what fits in the first screen.
- **Phone layout (390px)**: order, sizes, line lengths and tap targets.
- **Assets**: real or licensed imagery, illustration or product renders, with paths and rights.
- **Skill rules**: 3-5 lines, `skill: rule → concrete decision`.

## 2. Gate 1: hero and first proof section, reviewed until both pass

1. In Cloud, Frontend builds ONLY the hero and first proof section as production components, with the full relevant skills and references actually read and applied. List those files in `gate1.render.skillsRead`. Set `fidelity` to `production`. A low-fidelity mock never passes and is never called premium.
2. Run `npm run build:review`, start it and capture the initial render: desktop 1440px and phone 390px, with a real browser. Save to `design/renders/gate1/round-1/` and record path, width and sha256. Run `npm run gate:fingerprint` on the exact build you rendered and record its `sourceSha256` and `briefSha256` on the round.
3. Record the Cloud run URL and the actual model selector text (for example `Claude Opus 5.5 Medium`) with Fast off in `gate1.render`. Name the `implementer`.
4. A separate design reviewer and a separate marketing reviewer each inspect the actual screenshots. Neither is the implementer, and they are not the same reviewer. Each writes a critique for every reject criterion, PASS or REJECT, with a specific correction for each REJECT:
   - `composition`: weak hierarchy or a first screen without one clear focus;
   - `branding`: generic or starter-like, not specific to this business;
   - `type`: poor scale, contrast, measure or pairing;
   - `copy`: dense, vague or unapproved copy;
   - `proof`: weak, missing or unsupported proof;
   - `cta`: a CTA that does not match the offer and journey.
   Each also checks 3-5 contract rules: `skill`, `rule`, implemented `decision`, `screenshot` (desktop or phone), `region`, `verdict`, and a `fix` on REJECT. Each rule verdict is exactly `PASS` or `REJECT`; anything else fails. Each review cites the sha256 of every screenshot reviewed and the round's `sourceSha256` and `briefSha256`.
5. Any REJECT goes back to Frontend internally. Frontend revises in the same run, re-renders desktop and phone as the next round (`round-2/`, ...) and records `revision.summary` and `revision.addresses`. Both reviewers critique the new render. Repeat until both PASS. A strong first render may pass in round 1.
6. Set `gate1.status` to PASS only when the latest round has both PASS verdicts. Save `contractSha256`. Gate 1 binds its own snapshot: its rounds, screenshots and reviews must agree with each other, and later expansion of the site does not reopen it. Expansion stays blocked until PASS.

The evidence is the full loop: the initial render, both written critiques in every round, each revision with its re-render, and the final passing render on desktop and phone.

## 3. Gate 2: full site, same loop

After Gate 1 PASS, build the remaining approved sections and routes. Gate 2 covers the `## Experience inventory` the Designer records in the contract: one line per distinct in-scope page or visitor state as `- id: /route — state`, including each route and, where in scope, each form with its useful result and error states. Render each one on desktop and phone under `design/renders/gate2/`. Each screenshot lists the inventory ids it shows in `experiences`; one screenshot may show several states, so identical repeats are never needed. Each review adds `coverage`: one `{experience, verdict, critique, correction}` per inventory id, PASS or REJECT. The final round fails if any id lacks a desktop or phone screenshot or either reviewer's coverage, or if any coverage is REJECT. Then run the same review loop in `gate2`. `npm run verify:owner-review` must pass before the PM shows the owner anything. Gate 2 binds the current candidate: a changed contract, screenshot or visitor-visible edit after its final round fails it until the change is rendered and reviewed in a new round. The fingerprint covers what visitors see: page source, styles, config, the contract and the configured brief's visitor content, including every status, `approved` flag and the mode, because those decide which pages, price labels and review notes appear. Approval evidence and release metadata (`approvedBy`, `approvedAt`, the brief `version`, `intake`, `setup`, `publicationApproved`, `siteUrl`) are left out, so recording them after review does not void it. When the owner gives final approvals and the brief switches to production, render that production candidate and review it as the next Gate 2 round. When the owner approves publication, the PM records `ownerApproval` in design/gate.json (who, when, their message, and the Gate 2 final round's `sourceSha256` and `briefSha256`). `npm run verify:publish` and a production build in a hosting deploy environment fail unless the current source and brief match that approved artifact.

## Design skill precedence

Every full skill file stays available in the project and the Cloud workspace. Available does not mean loaded.
1. **YC Interface Craft leads visual direction.** Read its SKILL.md, then only the 3-5 research records that match this problem. Its five-direction default is replaced here by the Designer's private comparison of 2-3 directions, unless the owner asks for exploration.
2. **Intentional UI Design sets the quality floor.**
3. **frontend-design guides composition and type.**
4. **Only when the chosen design needs them:** `studio-illustration-design-grammar` (illustration only; not for UI styling), motion (`studio-emil-design-eng` and the animation skills) and component references (`studio-pick-ui-library`, `studio-prototype`, `studio-ask-sonner`). Record that choice in the contract.

## Owner and model rules

- The owner never runs commands, edits files, passes messages between bots or settles routine layout decisions. The PM shows the owner only the polished draft after Gate 2, in short plain words.
- Each Cloud run reads the actual model selector, records it as evidence and never silently substitutes another model. Feedback goes to the same project and the same run.

## Acceptance test

Given only a short, normal business brief and the saved model choice, with no design coaching and no follow-up technical instructions, the team reaches a polished owner-review draft: offer review PASS, contract recorded, Gate 1 and Gate 2 PASS with full evidence, and `npm run verify:owner-review` passing.
