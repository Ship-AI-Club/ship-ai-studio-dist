# Compact production brief

The owner gives a basic ask ("make a post for the new weekend slots", "a short reel for the launch"). The Static or Video Creator turns it into one `studio-creative-brief/1` file before any Cloud run, from files the project already has. The owner is never asked to coach copy, design, layout, pacing or models.

Check it before launch:

```
node ../../assets/marketing/brief/creative-brief.mjs marketing/creative/<asset>/creative-brief.json brief/project.json --catalog ../../catalog.json
```

The output carries the brief's sha256. The Cloud run, the stage record and every review name that hash.

## 1. Where each field comes from

| Field | Source in the project | If it is missing |
|---|---|---|
| `ownerInput` | The owner's words, verbatim | - |
| `sources.brief`, `sources.positioning` | `brief/project.json`, readable brief, positioning doc, decision log | Stop; ask the PM for the approved file |
| `sources.designTokens`, `sources.site` | Exported design tokens; the approved site URL and its reviewed screenshots | Stop; ask the Social Media Manager to get them from the Designer |
| `strategy.positioning` | The approved positioning line | - |
| `strategy.audience.who`, `.words` | Audience and customer language in the brief (their own phrases, not yours) | Use the brief's audience; never invent quotes |
| `strategy.audience.awareness` | Judge it from the brief and channel (table below) | - |
| `strategy.offer` | The approved offer and price-display decision | Never invent a price or discount |
| `strategy.objections` | Objections and FAQs in the brief, site and research | Pick the most likely one from the brief and note it |
| `strategy.proof` | Sourced proof only: reviews the owner supplied, counts the owner confirmed, guarantees in the offer | Leave it empty and write `proofGap`; the PM asks the owner. Never invent proof |
| `strategy.conversionGoal` | The single CTA and destination from the approved site | `measurement` is `"not-measured"`: drafts have no results |
| `artDirection.assets` | Approved site and brand assets first (hero photos, product shots, lockup), then licensed stock or original work, all in `SOURCES.md` | Ask the PM for a missing photo; never fake one |

## 2. Audience awareness sets the message

| Awareness | Lead with | Avoid |
|---|---|---|
| `unaware` | The situation or moment they recognize | Product names and features first |
| `problem-aware` | Their problem in their words, then the offer as the way out | Generic benefits |
| `solution-aware` | Why this offer beats the alternatives they already know | Explaining the category |
| `product-aware` | The objection that stops them, answered with proof | Repeating what they know |
| `most-aware` | The offer, the CTA and any time or price detail the brief approves | Long setup |

## 3. One concept, chosen privately

Compare at least two directions yourself (`alternativesConsidered`). Keep the one that is most specific to this business, its audience and offer. The owner sees that one concept, not a menu (`ownerSees: "one"`). An owner-chosen direction is kept, never reopened.

A strong concept:
- Starts from a real strategy item. `anchors` names at least two: `offer`, `positioning`, `objection:<i>`, `proof:<i>`, `audience-word:<i>`.
- Could not be pasted onto a competitor by changing the logo.
- Has one focal idea a viewer gets in a second.

Reject on sight: a palette-swapped generic card; stock "smiling person + headline" with no tie to the offer; a headline that would fit any business; a forced photo-then-list-then-end-card sequence when the concept needs something else.

## 4. Copy

Copy follows the approved brand voice and the audience's own words. The limits are enforced:

| Text | Limit |
|---|---|
| Headline | 10 words |
| Body (optional) | 25 words |
| CTA | 5 words, the approved CTA |
| Caption | 80 words |
| Each video shot's on-screen text | 12 words |

Every claim (numbers, percentages, ratings, awards, licensed, insured, guarantees, best, fastest, cheapest) appears in `copy.claims` with its source, or it is cut. Never claim that anything converts, performs or wins: nothing in a draft has been measured. Alt text describes the image for someone who cannot see it.

## 5. Art direction

The renderers are building blocks, not a mandatory look.

| `approach` | Use when | Render with |
|---|---|---|
| `renderer-template` | The concept really is photo-led with a headline panel (still), or photo, list and end-card beats (video). Say why in `rationale` | `render-still.mjs` / `render-video.mjs` with `studio-social-still/1` or `studio-short-video/1` content |
| `bespoke-still` | The still needs its own composition: full-bleed photo with type in open space, typographic poster, product cut-out, split layout, illustration | `render-still.mjs --scene <entry> --composition <id>` with `studio-custom-still/1` content |
| `custom-scene` | The video needs its own scenes, pacing or motion | `render-video.mjs --scene <entry> --composition <id>` with `studio-custom-video/1` content |

Whatever the approach:
- Color, type and lockup come from the design tokens (`palette: "design-tokens"`). Never a new palette.
- Name the `composition`, the `focalPoint`, the `typography` plan and every asset with path, role, source and license.
- Put `safeZonesPct` as percentages re-verified for the placement.

A project scene lives in `marketing/creative/<asset>/scene/index.tsx`. It calls `registerRoot` and imports building blocks from `@studio/blocks`: `useBrandFonts`, `customMetadata`, `useSafeBox`, `SafeArea`, `Lockup`, `Asset`, `TextLine`, `Reveal` and `useProgress`. Use `customMetadata` as each composition's `calculateMetadata`, so the scene renders at the content's declared size and timing. The CLI refuses any other geometry. Renders stay deterministic: frame-based motion only, no clocks, randomness or network.

## 6. Video additions

- **Research.** When the Ad Library is reachable, follow [studio-meta-ad-library-research](../../studio-meta-ad-library-research/SKILL.md): `status: "observed"`, the dated doc, and each ad actually seen with its URL, start date and observed date. When it is not reachable, `status: "not-accessible"` and the note says "no live examples reviewed". Either way, `evidenceNote` states what was and was not seen and that references are not performance evidence.
- **Storyboard.** A shot-by-shot table with exact `from`/`to` seconds, contiguous from 0. Each shot has a `beat` and the beats run hook, then message (and optional proof), then CTA. The hook lands by 3 s and the CTA is the last shot. Each shot carries `visual`, `motion`, `onScreenText` and `audio`. `durationSec` equals the last shot's end, 60 s at most (15 s or shorter unless the brief says otherwise).
- **Audio.** `silent` (with a note), `licensed` (source and license), or `original` (who made it, under what rights). Captions are burned in (`captionsBurnedIn: true`) so the ad reads with sound off.

## 7. Production and reads

- `production.model` and `production.reasoning_effort` equal `setup.creativeBuildModel` and `setup.creativeBuildEffort` (Studio default `claude-sonnet-5-5`, `medium`). This is independent of the site model, and there is no fast field at all. A different or higher-cost model needs `ownerApprovedUpgrade` with the owner's exact words. Never upgrade, fall back or spend silently.
- `reads` lists the library skills you actually read for this asset and why. Read them progressively: start from [the library map](library.md), open only the sections this asset needs, and only skills in this Studio catalog.

## 8. Skeleton

```json
{
  "schema": "studio-creative-brief/1",
  "asset": { "id": "<asset-id>", "kind": "static | video", "placement": "<channel and placement>", "format": "4x5 | 1x1 | 9x16" },
  "ownerInput": "<owner's words>",
  "sources": { "brief": "<path and version>", "positioning": "<path>", "designTokens": "<path>", "site": "<https URL>" },
  "strategy": {
    "positioning": "", "audience": { "who": "", "awareness": "problem-aware", "words": [""] },
    "offer": { "what": "" }, "objections": [{ "objection": "", "answer": "" }],
    "proof": [{ "claim": "", "source": "" }], "proofGap": "<only when proof is empty>",
    "conversionGoal": { "action": "", "destination": "https://...", "measurement": "not-measured" }
  },
  "concept": { "name": "", "idea": "", "whyThisBusiness": "", "alternativesConsidered": 3, "ownerSees": "one", "anchors": ["offer", "objection:0"] },
  "copy": { "headline": "", "body": "", "cta": "", "caption": "", "alt": "", "claims": [{ "text": "", "source": "" }] },
  "artDirection": {
    "approach": "bespoke-still", "scene": "marketing/creative/<asset>/scene/index.tsx", "rationale": "",
    "composition": "", "focalPoint": "", "typography": "", "palette": "design-tokens",
    "assets": [{ "path": "", "role": "", "source": "", "license": "" }], "safeZonesPct": { "top": 0, "bottom": 0, "side": 0 }
  },
  "production": { "model": "<setup.creativeBuildModel>", "reasoning_effort": "<setup.creativeBuildEffort>" },
  "reads": [{ "skill": "studio-<name>", "why": "" }]
}
```

Video adds `"video": { "research": {...}, "storyboard": [...], "durationSec": 0, "audio": {...}, "captionsBurnedIn": true }`.
