---
name: studio-shared-design-library
description: Load and verify the full shared design files for Product Designer, Frontend and the assigned Cloud run.
---

# Shared design library

## 0. Resolve

From this folder run `node ../../scripts/resolve-studio.mjs --skill studio-shared-design-library`. Send the JSON to the PM. Stop on any error; never load an older product-team skill instead.

Use the pinned Studio plugin release as the source. Do not replace it with an older public workshop kit.
Read the installed plugin role map and its complete skill folders. Run the plugin file verifier.
Only the PM prepares a new project with the plugin preparation script. Every other role works in the PM's one project.
For an existing project, preserve approved source. Compare versions and add only the required missing files.

1. Verify every design path and SHA256 in the project's design-skill-library.json.
2. Run npm run verify:design. Run npm run verify:skills when the full plugin copy provides it.
3. Stop on missing, changed, duplicate or reduced library files. Restore the pinned source before work.
4. Read only the guidance the precedence below selects. Follow its relevant reference files.
5. Log paths actually read in evidence/design-skills-read.md. File integrity alone does not prove reading.
6. Include hidden .agents/skills, .cursor rules, manifests, references and licenses in the actual Cloud handoff.
7. Repeat both file audits inside Cloud. Require acknowledgment of the current brief and approved direction.
8. Visual quality is judged only by studio-design-gate: Gate 1 and Gate 2 reviews of actual screenshots.

## Precedence (available is not loaded)

1. YC Interface Craft leads visual direction. Read its SKILL.md, then only the 3-5 research records that match the problem. Keep all its files and the full research index available; do not read them all without a reason.
2. Intentional UI Design sets the quality floor.
3. frontend-design guides composition and type.
4. Illustration Design Grammar, motion (emil-design-eng and the animation skills) and component references (pick-ui-library, prototype, ask-sonner) load only when the chosen design needs them. Illustration Design Grammar is for illustration work, not UI styling. Record the choice in the design contract.

## Skill index

- yc-interface-craft: visual direction; SKILL.md plus 3-5 matching research records.
- intentional-ui-design: quality floor for every interface.
- frontend-design: composition and type.
- copywriting, copy-editing, product-marketing, cro: site and marketing copy in the business's approved voice and audience vocabulary.
- workshop-owner-language: Read before you write owner questions, progress updates, workshop steps or interface help/error text. It does not govern headlines, site copy or ads.
- illustration-design-grammar, emil-design-eng and the animation skills, pick-ui-library, prototype, ask-sonner: only when the design contract needs them.

The original design subset has 21 skill entries and 54 files. PStack has its own separate skill catalog. Do not combine these counts or infer an export cap.
Preserve dates, attribution and existing brand equity. Use the approved direction. Do not restart exploration after approval or copy another company's identity.
Keep native-app skills available without loading them for an unrelated task.
A link, summary or template card does not supply the full files to Cloud.
