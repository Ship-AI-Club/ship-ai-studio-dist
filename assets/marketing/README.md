# Marketing renderers and guards

Generic tooling for the Studio marketing skills. It holds no brand, palette, copy, example media or client path. Every look-bearing value comes from a design-token file exported from the approved design contract. A missing or invalid token stops the render with a list of what is missing.

## Install (in the Cloud workspace, from this folder)

```
npm ci
```

The first render downloads Chrome Headless Shell into `node_modules`. Set `REMOTION_BROWSER_EXECUTABLE` to use an existing Chrome instead.

## Render

```
node render-still.mjs --tokens <design-tokens.json> --content <still.json> --assets <assets-dir> --out <out-dir>
node render-video.mjs --tokens <design-tokens.json> --content <video.json> --assets <assets-dir> --out <out-dir>
```

All four flags are required. The generic compositions are one option, not a mandatory look. For a bespoke still or custom video scenes, add `--scene <project scene entry> --composition <id>` and use `studio-custom-still/1` or `studio-custom-video/1` content (below). Outputs are marked `DRAFT`: the PNG or MP4 (H.264, yuv420p, faststart), a poster for video, `caption.txt`, `alt.txt` and a manifest with the sha256 of every input and output.

## Design tokens (`studio-design-tokens/1`)

| Field | Meaning |
|---|---|
| `brand.name`, `brand.logo.lockup` | Business name and lockup SVG (path inside the assets folder) |
| `colors.background, surface, text, textMuted, accent, onAccent` | `#RRGGBB`. `text`, `textMuted` on `surface` and `onAccent` on `accent` must reach 4.5:1 |
| `typography.family`, `weights.{display,label,body}` | Face name and the weight for each role |
| `typography.files[]`, `typography.license` | Licensed font files and their license, relative to the token file |
| `shape.radius` | Corner radius in px |
| `source.designContract` | Where these tokens were approved |

## Content

- `studio-social-still/1`: `id`, `format` (`4x5`, `1x1`, `9x16`), `image {src, alt, position?}`, `eyebrow?`, `headlineLines[]`, `body`, `ctaLabel`, `destination`, `caption`, `alt`.
- `studio-short-video/1`: `id`, `format`, `fps`, `posterSec`, `safeZonePct {top, bottom, side}`, `audio {mode: silent|licensed, src?, license?}`, `destination`, `caption`, `alt`, `scenes[]` of `photo` (`image`, `eyebrow?`, `headline`, `motion`), `list` (`items[] {label, image}`) and `endcard` (`headlineLines[]`, `subline?`, `ctaLabel`). Scenes are contiguous `from`/`to` seconds; the last `to` is the duration.

- `studio-custom-still/1` (with `--scene`): `id`, `format`, `assets[]` (every file the scene loads), `caption`, `alt`, `destination`, `props?` (anything the scene reads).
- `studio-custom-video/1` (with `--scene`): adds `fps`, `durationSec`, `posterSec`, `safeZonePct`, `audio`.

Copy in these files follows the business's approved voice and audience vocabulary from the brief, positioning and design contract, and comes from the checked production brief.

## Project scenes (`--scene`)

The entry calls `registerRoot` and imports `remotion`, `react` and the building blocks in `@studio/blocks` ([src/blocks.tsx](src/blocks.tsx)): `useBrandFonts`, `customMetadata`, `useSafeBox`, `SafeArea`, `Lockup`, `Asset`, `TextLine`, `Reveal` and `useProgress`. These resolve from this folder, so the project needs no install of its own.

Use `customMetadata` as each composition's `calculateMetadata`. The CLI refuses a composition whose size, fps or frame count differs from the content file. Every file beside the entry is hashed into the manifest, and outputs are still DRAFT. Keep motion frame-based: no clocks, randomness or network.

## Fonts

`fonts/plus-jakarta-sans/` is one bundled open-licensed face (SIL OFL 1.1, license beside the files). It is never applied automatically: a token file must name it in `typography.files` like any other licensed font.

## Guards

| File | Enforces |
|---|---|
| `zernio/connection.mjs` | Startup preflight, read-only. Resolves the live Zernio tool names (any connector prefix), checks the create-post draft flags, and proves sign-in with the authenticated profiles and accounts reads; a public tool list is not enough. Statuses: `connected`, `no-accounts`, `needs-sign-in`, `not-connected`, `schema-changed`; anything but `connected` blocks delivery only. Records the owner's pick. Never writes a key. |
| `zernio/resolve-destinations.mjs` | Turns a `connected` check into the destinations snapshot the bundle builder accepts. |
| `zernio/tool-client.mjs` | The tool client shape (`listTools`, `callTool`), live tool resolution for the hosted MCP (`profiles_list`, `accounts_list`, `posts_get`, `posts_create`) or the REST adapter, the read-only guard, MCP result parsing, and a REST adapter whose key comes only from a secret. |
| `zernio/zernio-draft.mjs` | Refuses without an owner approval record. Recomputes the approval hash from the bundle and the media bytes and refuses on any difference, all before any write tool. Drafts only: `is_draft=true`, `publish_now=false`, the exact account and profile IDs, no schedule field, args built for the live create-post schema, then a read-back. Media must be cloud https URLs. CLI writes the NOT SENT preview, the approved request a bot sends verbatim, or checks a saved read-back. |
| `bundle/approval-hash.mjs` | The approval hash: media byte sha256, exact caption, links, platform, account ID, profile ID, action, and schedule time and timezone. |
| `bundle/build-review-bundle.mjs` | One versioned bundle whose destinations must come from the read-only snapshot, with who wrote each part. Writes Zernio previews marked NOT SENT. |
| `brief/creative-brief.mjs` | The compact production brief: strategy (positioning, awareness, offer, objections, proof or a proof gap, goal not measured), one privately chosen anchored concept, concise copy with sourced claims, art direction (template or bespoke), the saved creative model with no fast field or silent upgrade, library reads, and for video the research note and the hook-message-CTA storyboard with timing and audio rights. |
| `approvals/cloud-run.mjs` | One Cloud run per asset, launched with the checked brief. Every revision is a targeted follow-up to the same run; a relaunch needs a recorded reason. |
| `approvals/stages.mjs` | Fixed stage order, independent internal reviews, owner approvals bound to hashes, "show me before the next stage" holds, one final bundle when the brief asks for it. |
| `review/check-review.mjs` | Independent design and marketing review records, desktop and phone renders, actual-size creative review, full video playback watched end to end, concept fit, caption and claims, PASS/REJECT with specific corrections, no routine layout questions for the owner. |
| `approvals/model-evidence.mjs` | Creative runs record the real model setting and use `setup.creativeBuildModel`. |
