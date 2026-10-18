---
name: studio-brief-to-site
description: Turn one approved intake/research/product handoff into a tailored Next.js site and marketing context.
---
# One brief through the whole project

## 0. Resolve

From this folder run `node ../../scripts/resolve-studio.mjs --skill studio-brief-to-site`. Send the JSON to the PM. Stop on any error; never load an older product-team skill instead.

Product Manager owns brief/project.json and three initial questions. Preserve the customer's answers. Research fills unknowns with dated sources, options and confidence; PM records explicit approvals. Designer and PM choose the experience and copy. Frontend implements with Designer throughout; Backend only when needed. Do not repeat intake or force a business into a B2B demo/B2C quote stereotype.

Read AGENTS.md, README.md and lib/brief.mjs for the exact contract. Record the business, buying context, offer/pricing approval state, source IDs, positioning, product scope/journey, primaryAction, brand tokens, About, articles and solutions. Keep isDemo true only for the fictional examples. A first-time owner's draft uses mode "review": owner answers plus recommendations with status "proposed", a source and a rationale. Production needs mode "production" and the owner's final approvals. Use npm run configure -- --brief brief/project.json to map reviewed inputs to content/site.json and .agents/product-marketing.md. Save existing edits before regenerating. Do not hand-edit flags to manufacture approval.

Only PM prepares the one project. The starter is a neutral technical shell with a placeholder page and no design. Follow studio-design-gate: marketing offer review, the Designer's one-page design/contract.md sent directly to Frontend, hero and first proof section only, Gate 1 on actual desktop and phone screenshots (separate design and marketing reviewers; revise and re-render until both pass), then the full site and Gate 2. The owner first sees a polished draft. Write the page as normal components for this business; do not build a data-driven section builder. A real (non-demo) npm run build fails without the contract and a Gate 1 PASS. Run checks and build, then test the actual browser journey. Draft content stays gated; assess value before scaling programmatic pages. Owner review precedes deployment/indexing, real integration activation and sends. Pass the approved brief/site/brand to Social Media Manager for the optional final marketing team.
