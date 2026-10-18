---
name: studio-team-workflow
description: Keep one shared product brief and current approvals across PM, Research, Designer and engineers.
---

## 0. Resolve

From this folder run `node ../../scripts/resolve-studio.mjs --skill studio-team-workflow`. Send the JSON to the PM. Stop on any error; never load an older product-team skill instead.

PM is the owner's entry point. Use four stages: positioning and research; productize the site; design and build; marketing.
PM owns the one brief and the one project. Only PM runs prepare-project. Other roles never make their own starter or review copy.
Read the current brief before each handoff. Do not repeat answered questions or approved choices.
Record sourceBriefVersion and sourceBriefSha256. Preserve separate site and API contract shapes. Save the website build choice in setup.siteBuildModel (claude-sonnet-5-5 or claude-opus-5-5), setup.siteBuildEffort (medium) and setup.siteBuildFast (false), never in business.pricing.model. setup.creativeBuildModel/creativeBuildEffort (always claude-sonnet-5-5, medium, independent of the site) is for marketing creative production only. Precedence is setup.modelPrecedence in the Studio role registry: a saved site model is used without asking; with none saved the PM asks once (`scripts/model-setup.mjs`).
Map the approved facts and scope into those contracts. Schema versions are not brief content versions.
Send changed files to the recorded Cloud run. Require acknowledgment before work continues. Feedback goes to the same project and run.
Keep the same project and branch. Assign file ownership between engineers.
Design and build follow `studio-design-gate`: marketing offer review, the Designer's one-page contract sent directly to Frontend, Gate 1 (hero and first proof) and Gate 2 (every page and visitor state in the contract's Experience inventory) on actual screenshots.
Use `studio-workshop-owner-language` only for owner questions, progress updates, workshop steps and interface help or error text. Site copy, marketing headlines and ads follow the approved business voice and audience vocabulary (positioning, brief, design contract), without workshop sentence limits or automatic acronym definitions. Technical evidence stays in team handoffs.
Owners never run commands, edit files or pass messages between bots. Owner messages are short, natural and nontechnical.
Keep facts, hypotheses and estimates distinct. Do not invent business proof or impose a CRM.
First-time drafts use brief mode "review": recommendations stay "proposed" with a source and rationale, nothing is marked approved for the owner, and the draft is private (noindex, no deploy). Production and publication need the owner's final approvals.
By default (review mode) the team recommends and keeps working internally through the polished private draft; pause for owner review between stages only when the owner explicitly asks for a step-by-step workshop or staged review. The owner always reviews the working site before production or campaign publication. The Designer selects the direction unless the owner asks for exploration or a real business decision is missing. Never ask the owner to settle routine layout decisions. The owner first sees a polished draft, only after Gate 2 PASS.
Marketing works during design and build, not after it: the marketing reviewer passes the offer, primary CTA and proof plan before the first build, and reviews the copy and the rendered site in Gate 1 and Gate 2. Campaign production (articles, social, ads, creative) follows the owner's requested approval flow: the team may prepare a complete draft bundle internally, but nothing is marked approved, published, sent or paid for without the owner's own approval. Hand the same brief to Social Media Manager and the existing marketing team for campaign work.
External sends, deployment and spend need the owner's instruction for that action.
Do not add recurring routines from a reference bot.
