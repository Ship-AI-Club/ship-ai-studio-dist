---
name: studio-creative-cloud-handoff
description: Use whenever static or video creative is produced. Holds the compact production brief and creative library map, launches one Cursor Cloud creative run with the saved creative model and a complete handoff (checked brief, design contract, site, research, storyboard, assets, licenses, render and review steps), keeps targeted revisions in the same run, and records the real model setting and run log as evidence.
---

# Studio creative Cloud handoff

The owner never writes technical prompts, never coaches design or copy, and never picks a model per asset. The creator expands the owner's basic ask into [the production brief](references/production-brief.md), reading the library progressively through [the library map](references/library.md). This skill turns that checked brief and the approved project files into one complete Cloud handoff, so the creative run has everything it needs without asking the owner.

## 0. Resolve

Run `node ../../scripts/resolve-studio.mjs --skill studio-creative-cloud-handoff` from this folder. Stop on any error.

## 1. Model setting

- Precedence is `setup.modelPrecedence.creative` in [the registry](../../studio-role-registry.json). Before every launch run `node ../../scripts/model-setup.mjs --brief brief/project.json` and use its `setup.creativeBuildModel` and `setup.creativeBuildEffort`: always `claude-sonnet-5-5` with `reasoning_effort` `medium`, unless the owner approved a higher-cost choice (`setup.creativeUpgrade`). It refuses any other creative model.
- `setup.siteBuildModel` and `setup.siteBuildEffort` are for website implementation only. Never use them for creative: an Opus site never changes creative.
- The creative model exposes `context` and `reasoning_effort` only. Creative runs carry no fast field at all: never pass, save or record one.
- Never fall back to another model and never upgrade creative to a higher-cost model on your own. Ask the owner through the PM only when the selected model is unavailable, or when a higher-cost choice needs approval.
- Record the real Cloud model selector text and effort for every run in `gate-evidence/<asset>/model.json`.

## 2. What the handoff carries

Collect real files and links. Do not summarize what the run can read itself.

0. The checked production brief (`marketing/creative/<asset>/creative-brief.json`) and its sha256 from `assets/marketing/brief/creative-brief.mjs`. The run builds exactly that concept, copy and art direction, including any project scene for a bespoke still or custom video.
1. The full current brief (`brief/project.json`, readable brief, decision log) and its version.
2. The approved brand and design contract, plus the exported design tokens (`studio-design-tokens/1`) the renderers require.
3. The approved site URL and the reviewed desktop and phone screenshots (cloud artifact links).
4. The sourced research (Ad Library notes with links and dates) and the approved storyboard or art direction.
5. The skill files for the role, the renderer folder [assets/marketing](../../assets/marketing/README.md), approved assets with `SOURCES.md`, and the font and audio licenses.
6. The render, review and evidence steps below.

Reuse approved assets. Never regenerate an approved image or re-shoot an approved scene unless the change asks for it.

## 3. Launch once, revise in the same run

- Launch one Cloud agent per creative project. Record it in `gate-evidence/<asset>/run.json` (`studio-cloud-run/1`): agent ID, run URL, the brief sha256 it was launched with, and one `versions` entry per render.
- Every revision is a targeted follow-up to **that same agent**: it names its corrections (at most 8; more means rewrite the brief) and the new version folder. Never launch a new run for an iteration.
- A new launch is only for a new creative project, or when the original run can no longer accept follow-ups. Record it under `relaunches` with the reason.
- Check the log: `node ../../assets/marketing/approvals/cloud-run.mjs gate-evidence/<asset>/run.json`. The stage gates refuse a draft or render without a valid log launched with the checked brief.

## 4. Model evidence

After launch, read the real model setting from the Cloud selector or the run metadata, not from your request. Write `gate-evidence/<asset>/model.json`:

```json
{
  "asset": "<asset-id>",
  "agentId": "<cloud agent id>",
  "runUrl": "<cloud run url>",
  "model": "<model id as shown>",
  "params": { "reasoning_effort": "<as shown>" },
  "source": "cloud-selector",
  "recordedAt": "<ISO time>"
}
```

Check it: `node ../../assets/marketing/approvals/model-evidence.mjs gate-evidence/<asset>/model.json brief/project.json`. If it fails, stop and ask the owner through the PM. Do not continue on a different model.

## 5. Quality gates stay the same

Cloud production does not relax review. Every output goes through the author's self-check. Then [studio-marketing-review](../studio-marketing-review/SKILL.md) and the design reviewer check it internally: stills at actual size and phone width, video watched in full with its playback evidence, and the caption and claims. Only after both PASS does the owner see it, at the point the owner asked to review. Each verdict is bound to the exact file sha256. The first owner-facing draft should already be polished, so the owner only needs minor feedback.

## 6. Handoff prompt template

Fill every `{{...}}` from project files. Leave nothing for the run to guess. Send the filled text as the launch prompt. Static and video add their role section from their own skills.

<!-- creative-handoff-template:start -->
```text
Cloud run settings
- model: {{setup.creativeBuildModel}}
- reasoning_effort: {{setup.creativeBuildEffort}}
- No other model params.

Role
You produce {{asset.kind}} creative for {{brand.name}} as DRAFTS. You never post, upload,
schedule, publish, create platform drafts or spend.

Read first (all paths in the repo, links are cloud artifacts)
- Checked production brief: {{brief.creativePath}} (sha256 {{brief.creativeSha256}}). Build exactly
  its concept, copy, art direction and assets. Do not pick a new concept or palette.
- Brief v{{brief.version}}: {{brief.paths}}
- Design contract and tokens: {{design.contractPath}} ; tokens {{design.tokensPath}}
- Approved site: {{site.url}} ; desktop {{site.desktopShot}} ; phone {{site.phoneShot}}
- Research: {{research.path}}
- Storyboard or art direction (approved {{direction.approvedAt}}): {{direction.path}}
- Skills: {{skills.paths}}. Library map: {{library.path}}; open only the sections this asset needs.
- Renderers: {{renderers.path}} (run `npm ci` there)
- Assets and licenses: {{assets.path}} ; {{assets.sourcesPath}} ; {{fonts.licensePath}}

Copy
Use only facts, offer, CTA and destination from the brief. Copy follows the approved voice
and audience vocabulary in {{voice.source}}. No invented proof, reviews, prices, results or
people. Reuse approved assets listed in {{assets.approvedList}}.

Produce
{{asset.instructions}}
Write every output under {{out.dir}}/{{asset.id}}/{{asset.version}}/. Never overwrite an
earlier version.

Check before you report
- Open every output at actual size and at phone size. Fix overflow, crop, contrast, fallback
  fonts and safe-zone collisions in the content file or the scene, then re-render.
- Never claim conversion or performance. Never switch or upgrade the model.
- Write the manifest with sha256 of every input and output and the exact command.
- Write {{evidence.dir}}/model.json from the real Cloud selector or run metadata.

Report back
Cloud artifact links for each output, caption, alt text, destination, sha256 values, what you
checked, what is unverified. Mark everything DRAFT. Wait for review notes in this same run.
```
<!-- creative-handoff-template:end -->

## 7. Follow-up template (same agent)

```text
Revision {{asset.version}} for {{asset.id}} (same brief sha256 {{brief.creativeSha256}}). Change only:
{{review.corrections}}
Keep everything else, including approved assets. Render into {{out.dir}}/{{asset.id}}/{{asset.version}}/,
re-run the checks and report the new links and sha256 values.
```
