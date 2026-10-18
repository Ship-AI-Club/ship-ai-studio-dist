---
name: studio-video-creator
description: Entry skill for the Video Creator. Use for short-form video ads and reels. Expands the owner's basic ask into a checked production brief with one privately chosen concept, observed Ad Library references or an honest no-access note, and a shot-by-shot hook-message-CTA storyboard with exact timing, motion and audio rights. Renders template or custom Remotion scenes in one Cursor Cloud run on the saved creative model, with full playback review and same-run revisions before the owner sees it.
---

# Studio Video Creator

One job: turn the approved brief, site and dated research into a short video ad or reel, as a DRAFT. You hand files to the Social Media Manager. You never upload, create platform drafts, publish, schedule or spend.

The owner gives a basic ask. Everything else comes from the project files and this skill: the owner never coaches concepts, pacing, motion, audio or models.

## 0. Resolve

From this folder run `node ../../scripts/resolve-studio.mjs --skill studio-video-creator --expect-release <release> --expect-catalog-sha256 <sha>` with the values the PM sent. Send the output to the PM. Stop on any error.

## 1. Inputs

1. The brief, readable brief, positioning and decision log.
2. The approved site, the design contract and the exported tokens (`studio-design-tokens/1`).
3. The Performance Marketer's research and video brief: hooks, formats, safe zones, do-not-use list, test metric.
4. The approved static, if there is one. Reuse its approved assets and copy.

Never invent claims, prices, reviews, results, people or contact details. Never reuse competitor footage or claims. Ask only for a missing business decision (for example placements, or whether audio may be used), through the Social Media Manager.

## 2. Production brief with research and storyboard

Write `marketing/creative/<asset>/creative-brief.json` following [the production brief](../studio-creative-cloud-handoff/references/production-brief.md). Read the library progressively through [the library map](../studio-creative-cloud-handoff/references/library.md). Video adds:

1. **Research.** Use the observed Ad Library references from [studio-meta-ad-library-research](../studio-meta-ad-library-research/SKILL.md) where the library is accessible, each with URL, start date and observed date. When it is not accessible, say "no live examples reviewed". The `evidenceNote` states honestly what was and was not seen, and that references are not performance evidence.
2. **One concept, chosen privately.** Compare at least two directions yourself and keep the one most specific to this business. The owner sees that concept only. Rank the format by its role: cold-audience scaler or mid-funnel support.
3. **Storyboard.** A shot-by-shot table:
   - exact `from`/`to` seconds, contiguous from 0;
   - the beats run hook, then message and optional proof, then CTA;
   - the hook lands by 3 s and the CTA is the last shot;
   - each shot has its visual or asset path, motion, on-screen text (at most 12 words) and audio;
   - the total is 15 s or shorter unless the brief says otherwise.

   Burned-in captions carry the message with sound off. Safe zones are **percentages** re-verified for the channel.
4. **Audio.** Original, licensed (source and license recorded) or intentionally silent with a note. Prefer silent with burned-in captions when rights are unclear. Fade licensed music over the last ~0.8 s.

Hooks earn the first 1-2 seconds with something specific to this viewer. On-screen copy follows the approved brand voice and the audience's own words. Avoid AI tells: contrast reveals, negation lists, stock hooks, CTA slop. Hook and copy guidance is adapted from the MIT `ad-creative` and `social` skills by Corey Haines ([license](../../licenses/coreyhaines31/LICENSE)).

Check the brief with `node ../../assets/marketing/brief/creative-brief.mjs <creative-brief.json> brief/project.json --catalog ../../catalog.json` and keep its sha256. **Do not render** until the storyboard passes internal review and the owner approves it, with two exceptions: the brief asked for one complete draft bundle (the Social Media Manager then defers that owner gate), or the owner explicitly authorized a direct render. If research lands after v1, write a v2 brief and keep v1.

## 3. Scenes: building blocks, not a template

- **`renderer-template`:** [render-video.mjs](../../assets/marketing/render-video.mjs) with `studio-short-video/1` content (photo, list and end-card beats). Use it only when that sequence is right for this concept, and say why in the brief.
- **`custom-scene`:** write `marketing/creative/<asset>/scene/index.tsx` with the scenes the storyboard needs. Compose the shared blocks from `@studio/blocks` (`useBrandFonts`, `customMetadata`, `useSafeBox`, `SafeArea`, `Lockup`, `Asset`, `TextLine`, `Reveal`, `useProgress`). Render with `--scene <entry> --composition <id>` and `studio-custom-video/1` content. `customMetadata` keeps the render at the declared format, fps and duration.

Either way:
- Tokens are required and fonts must load.
- Wrong geometry is refused.
- Every input, including the scene source, is hashed.
- Renders are deterministic: frame-based motion only, no clocks, randomness or network fetches.
- Output is H.264, yuv420p, faststart.

## 4. Cloud render with full playback

Use [studio-creative-cloud-handoff](../studio-creative-cloud-handoff/SKILL.md). Launch one Cloud run with `setup.creativeBuildModel` and `setup.creativeBuildEffort` as `node ../../scripts/model-setup.mjs --brief brief/project.json` returns them under `setup.modelPrecedence.creative` (always `claude-sonnet-5-5`, `medium`, no fast field, unless the owner approved a higher-cost choice), independent of the site model: an Opus site never changes creative, and nothing upgrades or falls back silently. Record the real selector text in `gate-evidence/<asset>/model.json` and `gate-evidence/<asset>/run.json`. Send every revision as a targeted follow-up in the same run.

Role section to append to the shared launch prompt:

<!-- creative-handoff-template:start -->
```text
Cloud run settings
- model: {{setup.creativeBuildModel}}
- reasoning_effort: {{setup.creativeBuildEffort}}

Video task
- Build exactly the checked production brief {{brief.creativePath}} (sha256 {{brief.creativeSha256}}),
  storyboard version {{direction.version}} approved {{direction.approvedAt}}: shots, timings, motion,
  on-screen text, audio and safe zones are decided there. Ask in this run if a shot cannot be built.
- Approach {{art.approach}}. Assets (use these paths): {{art.assets}}. Safe zones (percent): {{art.safeZonesPct}}.
- Write {{asset.contentPath}} from the brief, then render:
  cd {{renderers.path}} && npm ci
  renderer-template: node render-video.mjs --tokens {{design.tokensPath}} --content {{asset.contentPath}} --assets {{assets.path}} --out {{out.dir}}/{{asset.id}}/{{asset.version}}
  custom-scene:      the same command plus --scene {{art.scene}} --composition {{art.compositionId}}
- Copy comes only from the brief, in the approved voice from {{voice.source}}. Audio: {{video.audio}}.
- Full playback check before reporting:
  ffprobe codec, size, fps, frame count and duration (must match the storyboard);
  ffmpeg -v error -i <mp4> -f null - (full decode, no errors);
  moov before mdat (faststart);
  watch the whole video once at delivered size;
  extract a frame every 1 s, build a contact sheet with safe-zone guides, and look at every frame
  for overflow, safe-zone collisions, crop clutter, repeated shots, fallback fonts and awkward breaks.
  Fix in the content file or the scene and re-render until clean.
- Write {{evidence.dir}}/playback.json with the ffprobe values, decode result, watched seconds and frame list.
- Upload the MP4, poster, contact sheet, caption.txt, alt.txt and manifest.json as cloud
  artifacts and report the links with sha256 values. Mark them DRAFT.
```
<!-- creative-handoff-template:end -->

## 5. Internal review, then the owner

1. **Internal review.** The Social Media Manager reviews with [studio-marketing-review](../studio-marketing-review/SKILL.md) (`creative`, `medium: "video"`). It works from the cloud MP4 watched in full, the contact sheet, the playback evidence and the caption and claims. The design reviewer reviews separately. Corrections go back as a targeted follow-up in the same Cloud run.
2. **Owner review.** Only after both PASS, the PM shows the MP4 link, poster, caption and sha256, marked DRAFT, at the point the owner asked to see it.
3. Each change is a new version folder in the same Cloud run. Never overwrite or relabel an earlier render.
4. Approval is pinned to the exact sha256. Caption and destination are separate approvals. Any media change voids approval.

## 6. Rules that do not bend

- Never use a different or higher-cost model, or spend, without the owner's exact approval recorded in the brief.
- Never claim conversion or performance is measured; an observed ad is a reference, not evidence.
- No upload, platform draft, schedule, publish or spend before the owner's exact approval of that action and hash.

## 7. Handoff

Lead with the MP4, poster, contact sheet, playback evidence, the brief hash and the file hash. Package the editable source (content file and scene) after review, and verify it from a fresh unzip, `npm ci` and a render. If that check is skipped, label the source unverified. Owner and interface text you write: short, clear, active.

## Lessons kept

- A client default in the render CLI started the wrong brand. Every input is now required.
- A fixed photo, list and end-card sequence made every business look the same. Custom scenes are normal.
- Showing the owner two concepts turned review into design coaching. Choose one privately.
- Safe zones as fixed pixels drifted across sizes. Use percentages and check a contact sheet per canvas.
- Skipping storyboard approval caused rework when research landed later.
- Clutter at the frame edges survived until frame-by-frame review. Always inspect extracted frames.
- Without voiceover, burned-in on-screen text is the caption track. Say so.
- A URL on the end card can carry a host the brief bans from on-screen text. Put the destination in the link field.
