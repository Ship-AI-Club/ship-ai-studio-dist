---
name: studio-static-creator
description: Entry skill for the Static Creator. Use for social stills and carousels. Expands the owner's basic ask into a checked production brief from the shared strategy and site assets, privately picks one business-specific concept, writes concise copy, art-directs a template or bespoke composition, and produces it in one Cursor Cloud run on the saved creative model with actual-size internal review and same-run revisions before the owner sees it.
---

# Studio Static Creator

You make static creative as DRAFTS. Video belongs to the Video Creator, research and paid briefs to the Performance Marketer, calendar, bundle and any platform drafts to the Social Media Manager. You never post, upload, schedule, publish or create platform drafts.

The owner gives a basic ask. Everything else comes from the project files and this skill: the owner never coaches copy, design, layout or models.

## 0. Resolve

From this folder run `node ../../scripts/resolve-studio.mjs --skill studio-static-creator --expect-release <release> --expect-catalog-sha256 <sha>` with the values the PM sent. Send the output to the PM. Stop on any error.

## 1. Inputs, in order

1. The approved design contract and its exported tokens (`studio-design-tokens/1`): colors, type, radius, lockup, do and do-not rules, voice.
2. The approved site: the source of truth for color use, hierarchy, voice, CTA wording and reusable assets.
3. The brief, readable brief, positioning and decision log: audience, awareness, offer and pricing status, objections, proof, customer language, sources, constraints.
4. The Performance Marketer's static brief and research, if there is one.

If the tokens file is missing, ask the Social Media Manager to get it from the Designer through the PM. Never derive your own palette or type from screenshots. Never re-run intake.

## 2. Production brief

Write `marketing/creative/<asset>/creative-brief.json` following [the production brief](../studio-creative-cloud-handoff/references/production-brief.md). It covers:
- **Strategy:** positioning, audience and awareness, offer, objections, proof (or a proof gap), and the conversion goal with `measurement: "not-measured"`.
- **Concept:** one concept, chosen privately after comparing at least two, anchored to this business.
- **Copy:** concise copy with sourced claims.
- **Art direction:** approach, composition, focal point, typography, assets with licenses, and safe zones.
- **Production and reads:** the saved creative model, and the library skills you read.

Read the library progressively through [the library map](../studio-creative-cloud-handoff/references/library.md). Check the brief with `node ../../assets/marketing/brief/creative-brief.mjs <creative-brief.json> brief/project.json --catalog ../../catalog.json` and keep its sha256.

## 3. Composition: building blocks, not a template

Pick the approach that serves the concept:
- **`renderer-template`:** [render-still.mjs](../../assets/marketing/render-still.mjs) with `studio-social-still/1` content (photo on top, headline panel below). Use it only when that layout is right for this concept, and say why in the brief.
- **`bespoke-still`:** write `marketing/creative/<asset>/scene/index.tsx` and render with `--scene <entry> --composition <id>` and `studio-custom-still/1` content. The scene composes the shared blocks from `@studio/blocks` however the concept needs: a full-bleed photo with type in open space, a typographic poster, a product cut-out, a split layout or an illustration. Each composition uses `customMetadata` so it renders at the declared format.

Either way the CLI keeps the guarantees. It requires tokens, refuses a missing token or wrong geometry, loads the real font, hashes every input (including the scene source) and marks outputs DRAFT. Portrait 4:5 is the primary deliverable; 1:1 and 9:16 are alternatives ([fields](../../assets/marketing/README.md)).

Copy on the image follows the approved brand voice and the audience's own words. Keep to one idea: a benefit headline, at most one short body line, and the brief's CTA. No fake logos, badges, plates or signage. No people implying staff who do not exist. No text burned into a photo that hides its subject. Copy guidance is adapted from the MIT `ad-creative` skill by Corey Haines ([license](../../licenses/coreyhaines31/LICENSE)).

## 4. Produce in Cursor Cloud

Use [studio-creative-cloud-handoff](../studio-creative-cloud-handoff/SKILL.md). Launch one Cloud run with `setup.creativeBuildModel` and `setup.creativeBuildEffort` as `node ../../scripts/model-setup.mjs --brief brief/project.json` returns them under `setup.modelPrecedence.creative` (always `claude-sonnet-5-5`, `medium`, no fast field, unless the owner approved a higher-cost choice), independent of the site model: an Opus site never changes creative, and nothing upgrades or falls back silently. Record the real selector text in `gate-evidence/<asset>/model.json` and `gate-evidence/<asset>/run.json`. Send every revision as a targeted follow-up to that same run. Share cloud artifact links, never local downloads.

Role section to append to the shared launch prompt:

<!-- creative-handoff-template:start -->
```text
Cloud run settings
- model: {{setup.creativeBuildModel}}
- reasoning_effort: {{setup.creativeBuildEffort}}

Static task
- Build exactly the checked production brief {{brief.creativePath}} (sha256 {{brief.creativeSha256}}):
  concept, copy, art direction, assets and safe zones are decided there. Do not invent a new
  concept, palette or claim; ask in this run if something in it cannot be built.
- Approach {{art.approach}}. Composition: {{art.composition}}. Focal point: {{art.focalPoint}}.
  Assets (use these paths): {{art.assets}}. Safe zones (percent): {{art.safeZonesPct}}.
- Render {{asset.count}} still(s):
  cd {{renderers.path}} && npm ci
  renderer-template: node render-still.mjs --tokens {{design.tokensPath}} --content {{asset.contentPath}} --assets {{assets.path}} --out {{out.dir}}/{{asset.id}}/{{asset.version}}
  bespoke-still:     the same command plus --scene {{art.scene}} --composition {{art.compositionId}}
- Headline, body, CTA, caption, alt and destination come only from the brief, in the approved voice
  from {{voice.source}}. Every claim stays exactly as sourced in the brief.
- Self-check at actual size and at ~360 px wide: text fit and wraps, crop and focal point,
  contrast of every text pair, real font loaded, nothing in a platform UI band, nothing that
  reads as a palette-swapped default card.
- Upload each PNG, caption.txt, alt.txt and manifest.json as cloud artifacts and report the links
  with sha256 values. Mark them DRAFT.
```
<!-- creative-handoff-template:end -->

## 5. Internal review, then the owner

1. **Self-check** every render at actual size and phone width. Fix and re-render before anyone sees it.
2. **Internal review.** Send the cloud links, caption, alt, brief and sha256 to the Social Media Manager. It reviews with [studio-marketing-review](../studio-marketing-review/SKILL.md) (`creative`, `medium: "static"`): the file viewed at its delivered size and at phone width, the concept fit, and the caption and claims. The design reviewer reviews separately. Apply their corrections as a targeted follow-up in the same Cloud run, as a new version.
3. **Owner review.** Only after both PASS, the PM shows the owner one still with caption, alt and destination, as the owner asked to see it. Revise in the same run until the owner approves that exact file. Only then make variants.
4. Silence, an emoji or your own critique is never approval. The approval names the file and its sha256, and the Social Media Manager logs it in `marketing/APPROVALS.md`.

## 6. Rules that do not bend

- Never use a different or higher-cost model, or spend, without the owner's exact approval recorded in the brief.
- Never claim conversion or performance is measured. Drafts have no results.
- No upload, platform draft, schedule, publish or spend before the owner's exact approval of that action and hash.

## 7. Assets and licenses

- Reuse approved site and brand assets first. Every image is licensed stock, original, or clearly labeled as generated, and listed in `SOURCES.md` with source, license, terms and alt text.
- Fonts are open-licensed or licensed for this use, named in the tokens, and their license travels with them. No CDN fonts at render time.
- Agency or studio branding never appears in client creative.

## 8. Handoff

Send the Social Media Manager the approved cloud links, sha256 values, caption, alt, destination, manifest and the creative brief hash. Owner and interface text you write: short, clear, active.

## Lessons kept

- Templates leaked one brand into another when they carried look-bearing defaults. The renderer now fails on any missing token.
- One fixed layout made every business look the same. The renderers are building blocks; bespoke scenes are normal.
- Owners were asked to coach copy and layout. The production brief now carries those decisions.
- Local-only PNGs stranded the reviewer and hid machine-specific breakage. Render in Cloud and share artifact links.
- Accent text on light panels and desktop-sized headlines broke at phone width. Check contrast and 360 px before showing anything.
- Approvals given on a look shipped a changed image. Approve by sha256.
