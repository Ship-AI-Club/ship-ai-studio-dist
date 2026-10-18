# Cursor Cloud build handoff

The Frontend Engineer starts Cursor Cloud automatically for approved website implementation.
Select the saved **Sonnet 5.5 Medium** or **Opus 5.5 Medium** choice from `setup.siteBuildModel` and `setup.siteBuildEffort` in the Cloud run, with Fast off. Do not infer the model from a prompt, and do not use `setup.creativeBuildModel` for the website.
Read the actual Cloud model selector setting (for example "Claude Opus 5.5 Medium", Fast off). Record that exact text, the run URL and the time in the handoff and in design/gate.json. Never silently substitute another model.
If the exact model or Cloud tool is unavailable, report the blocker. Ask before using another model or local implementation.
Send feedback and fixes to the same project and the same recorded run. Do not start duplicate runs.

Copy this entire starter into the participant's project, including hidden `.agents/` and `.cursor/` folders.
Include the approved brief, design handoff, copy, source, lockfile, skill manifests, reference files and licenses.
Exclude secrets, personal context, `node_modules`, `.next` and unrelated client files.
Do not rely on skills installed on another machine.

Include these steps in the actual Cloud agent task:

1. Read AGENTS.md, README.md and the current approved shared brief.
2. Run `npm run verify:design` in the site folder. Stop on failure.
3. Read applicable design and copy skills and their referenced guidance. Record the paths actually read.
4. Preserve the approved business facts, copy, prices, design contract and product scope.
5. Gate 1: replace the placeholder page with production components written for design/contract.md, applying the full relevant skills and references. Build ONLY the hero and first proof section. Run `npm run build:review`. List the skill files applied in `gate1.render.skillsRead`. Never label a low-fidelity mock as premium.
6. Capture the initial render: desktop (1440px) and phone (390px) screenshots with a real browser. Save them under design/renders/gate1/round-1/ with their sha256 in design/gate.json. Run `npm run gate:fingerprint` and record `sourceSha256` and `briefSha256` on the round; reviewers cite both. Gate 1 keeps its own snapshot while you expand the site; Gate 2 must match the current candidate, so any later visitor-visible edit voids it. Approval evidence and release metadata do not.
7. A separate design reviewer and a separate marketing reviewer write critiques of the screenshots against the reject criteria (composition, branding, type, copy, proof, CTA) and the contract rules. On any REJECT, apply the corrections in this run, re-render desktop and phone as the next round and record the revision. Repeat until both PASS. Build nothing else until then. Do not ask the owner to settle layout decisions.
8. Build the rest of the approved site. Run `npm run check`, `npm run build` and `npm run verify:forms` (visitor forms use components/VisitorForm.jsx). Inspect the keyboard, validation, error, result and reset paths.
9. Gate 2: capture every page and visitor state in the contract's Experience inventory (routes, forms, useful results and errors in scope) on desktop and phone, tag each screenshot with the inventory ids it shows, and have both reviewers cover every id. `npm run verify:owner-review` must pass.
10. Return source, lockfile, screenshots, actual logs, model selector evidence, limitations and the design-read record to the PM.
11. Stop for owner review before deployment or any external sends. A review-mode brief is never deployed; any deploy or publish step runs `npm run verify:publish` first.

Keep previews unindexed. Never claim that a passing file audit, test run or read log proves design quality or skill use. Only gate reviews of actual screenshots do.


## Current handoff

Before launch and after each feedback or scope change, get the current PM brief and approved design/copy handoff. Record their versions, approval state and file hashes in a handoff manifest. Send updated files to the same Cloud run and require acknowledgment of the received versions before further implementation. Recover existing approvals from PM; do not ask the owner to repeat them. An initial upload does not carry later decisions. Distinguish an uploaded archive audit from verification of files inside the live Cloud workspace.


## PStack and model setup

Read ENGINEERING-SETUP.md for the native bot setup. PStack is a plugin, separate from the source design skills.
Run its first-use setup in the coordinating bot and verify the resulting model rule. Preserve the saved Sonnet 5.5 Medium or Opus 5.5 Medium choice. Do not change unrelated global settings.
A Cloud agent already assigned this repository implements the handoff here; it must not start another Cloud agent.
Keep the PM brief, generated site contract and current design/copy handoff aligned by version and hash.
