---
name: studio-product-setup
description: Set up a Studio product bot with PStack, one saved model choice, a complete skill library and a verified handoff.
---

## 0. Resolve

Work from the verified Studio runtime that the PM's `studio-bootstrap` skill hydrated (`$HOME/.studio-runtime/current`); the native catalog may carry skill text only. From this folder there, run `node ../../scripts/resolve-studio.mjs --skill studio-product-setup`. Send the JSON to the PM. Stop on any error; never load an older product-team skill instead.

Use this skill once per Studio product role to set up the bot. It never creates a second project: the PM owns the one brief and the one project.

1. Run `node ../../scripts/verify-install.mjs` from this skill folder.
   It verifies this release only: the catalog identity, every skill and file hash, the runtime digest and counts, every internal link and every command path the skills tell you to run. It reads nothing outside the release and has no fallback. Save the actual result in project evidence. Stop on FAIL.
2. Verify PStack is installed, enabled and usable. Run its actual `setup-pstack` skill.
   Inspect its written model and effort rules. Preserve the owner choice and project scope.
3. Record the native catalog evidence for this bot (Studio version and skill count, or absent) separately from the verified runtime (release, root, commit, digest).
   A local Cursor folder, a template card or a native skill list is not proof of the runtime. Do not claim ready or silently use a small native-card subset.
4. Project first. Only the PM runs `node ../../scripts/product/prepare-project.mjs --target <new-project-folder>`, once, for a new site, before anything reads the brief.
   It copies the starter and all full skills, references, licenses and manifests. It never overwrites a project.
   Other roles never prepare their own starter or a review copy. They work in the PM's project at the path and brief version the PM sends.
   For an existing project, preserve its source. Add missing files only after a diff; do not overwrite approved work.
   The PM sets a first-time owner's brief to `mode` "review": owner answers with source "owner", recommendations with status "proposed", a source and a rationale, and no invented approval. Never set `isDemo` true for a real business. Review mode is private: noindex, and deploy builds are refused.
5. Model setup, once, on the prepared brief. Apply `setup.modelPrecedence` from [the role registry](../../studio-role-registry.json) with `node ../../scripts/model-setup.mjs --brief <project>/brief/project.json`. With no brief it refuses and says to prepare the project first.
   A saved setup.siteBuildModel is used as is: ask nothing. Only if none is saved, the PM asks the owner the registry `site.question` exactly once (Opus 5.5 Medium is the default and uses more tokens; Sonnet 5.5 Medium is more conservative). Save the answer with `--answer opus|sonnet|none`; `none` saves the default claude-opus-5-5, medium, fast false. Other bots reuse it and never ask again.
   Creative production always uses setup.creativeBuildModel claude-sonnet-5-5 and setup.creativeBuildEffort medium, with no fast field, independent of the site choice. Ask only if it is unavailable or a higher-cost choice needs the owner's approval; never upgrade or fall back silently. Do not claim this changes a native bot model without proof.
6. Read `../../roles/role-map.json`, your role skill, `studio-team-workflow`, `studio-workshop-owner-language` and the skills your role map selects, as full files under the runtime root.
   Designer and Frontend follow the design precedence in `studio-design-gate`. Log actual paths read separately from the integrity result.
   All skills remain available; available does not mean loaded. Do not load unrelated native-app guidance for an ordinary web task.
7. Engineers use PStack's `create-verification-skill` for the real repo when no suitable project verifier exists.
   Verify actual behavior, not only a successful build. Reuse an existing verifier where appropriate.
   Before any deploy or publish, run `npm run verify:publish`; it refuses review mode and names missing owner approvals.
   Before any push or deploy trigger, run the repo typecheck where applicable, targeted tests and production build.
   Record exact commands and exit codes. Do not use hosting CI as the first compiler.
8. Frontend starts the approved build in Cursor Cloud with the saved model and Medium effort.
   In every Cloud run, read the actual model selector setting (for example `Claude Opus 5.5 Medium`, Fast off) and record that text as evidence.
   Never silently substitute another model. Send feedback to the same project and the same run.
   A Cloud agent already in that run implements there. It must not start a nested run.
9. PM records readiness per role: native catalog evidence, verified runtime release and root, tool-ready, file audit and actual reads.
   Marketing passes the offer review before the first build. Gate 1 and Gate 2 in `studio-design-gate` pass on actual screenshots before the owner sees the site.

Resolve exact catalog and model IDs from real tool results. Never invent them.
If a selected model is unavailable, ask PM for a fallback decision. Do not silently use Auto, Fast or local implementation.
Owners never run commands, edit files or manage handoffs. The PM passes files between bots and keeps owner messages short and plain.
The PM is exported from its entry config, [pm-config/pm.json](../../pm-config/pm.json): description, the `studio-bootstrap` skill, plugin refs and settings. It works whether or not an export carries the plugin.
Recipients use their own logins. Keep secrets, client facts, private chats and unrequested routines out of exports.
