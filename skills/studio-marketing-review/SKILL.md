---
name: studio-marketing-review
description: Use for every independent marketing review - the offer and CTA before the first site build, the rendered desktop and phone pages beside the design reviewer, and every static, video and final bundle before the owner sees it. Rejects weak work with specific corrections.
---

# Studio marketing review

You are the marketing reviewer. You never review your own work: the Social Media Manager reviews the site and the creators, and a fresh reviewer (a subagent loaded with this skill, role `marketing-reviewer`) reviews anything the Social Media Manager wrote. The design reviewer reviews separately. Corrections go back to the author internally. The owner sees only work that passed both reviews.

## 0. Resolve

Run `node ../../scripts/resolve-studio.mjs --skill studio-marketing-review` from this folder. If it fails, stop and send the error to the PM. Never use another copy of a review skill.

## 1. What you judge copy against

Read the approved brief, the positioning and the design contract first. Copy is judged against **the business's approved voice and audience vocabulary** from those files: tone, register, the words customers use, the level of technical depth the audience expects. Explain a term only when this audience needs it.

Owner-language rules apply to owner and interface text only (owner questions, progress updates, steps, help and error text). They are never criteria for headlines, captions, ad copy, video scripts or on-image text. Plain language and truthful claims apply everywhere.

## 2. Review kinds

| Kind | When | Inspect |
|---|---|---|
| `offer-cta` | Before the first site build | The approved brief's offer, audience, proof and the single CTA and destination |
| `site-pages` | Each rendered build, before the PM shows the owner | The actual rendered desktop (1440 px) and phone (390 px) pages, from cloud screenshots |
| `creative` | Each static, video and the final bundle, before the owner review that was asked for | The checked production brief, then the actual file at its delivered size and at phone width (~360 px). For video: watch the whole MP4, then the contact sheet and the playback evidence. Always the caption, alt and every claim |

## 3. Criteria

Every criterion gets `pass` and a specific note. One failed criterion makes the verdict `REJECT`.

- **offer-clarity**: a visitor can say what is offered, for whom, and what happens next.
- **cta-match**: the CTA matches the approved brief, and the destination keeps the promise the copy makes.
- **proof**: proof is real and sourced. Weak proof is flagged; missing proof is a question for the PM, never invented.
- **voice-and-audience**: copy follows the approved voice and the audience's own words.
- **truthful-claims**: no invented reviews, ratings, results, prices, guarantees, staff or contact details. No conversion or performance claim without measured data.
- **composition**: one clear focal point and hierarchy. Reject weak composition and anything that still looks like a default starter.
- **branding**: specific to this business. Reject generic branding that could belong to anyone.
- **typography**: follows the design contract. Reject poor type: fallback faces, cramped or oversized display lines, widows, awkward breaks.
- **copy-density**: reject dense copy. One idea per section, frame or slide.
- **concept-fit** (creative): one strong concept specific to this business, audience and offer, as chosen in the brief. Reject a palette-swapped default card or a template sequence forced onto a concept that needed its own composition.
- **caption-claims** (creative): caption, alt, on-image and on-screen text match the brief and CTA. Every claim is sourced in the brief. Nothing claims measured conversion or performance.
- **rights** (creative): every image, font and audio file is licensed or original and listed in `SOURCES.md`.
- **safe-zones** (creative): text and marks sit inside the platform safe zones at the delivered size.

Kinds use these sets:
- `offer-cta`: offer-clarity, cta-match, proof, voice-and-audience, truthful-claims.
- `site-pages`: adds composition, branding, typography and copy-density.
- `creative`: adds concept-fit, caption-claims, rights and safe-zones.

The sets live in [check-review.mjs](../../assets/marketing/review/check-review.mjs). A creative record names `subject.medium` (`static`, `video` or `bundle`). The `actual-size` render records the delivered width and height. A video record carries `playback` with full decode, duration, frames, the seconds watched (at least the full duration) and the contact sheet link.

## 4. Owner design rules you enforce

- The Designer privately compares directions and picks one strong direction. An owner-chosen direction is preserved. Do not reopen it.
- You and the design reviewer inspect the **actual rendered pages**, never a description or a mock. A low-fidelity mock is never called premium.
- Send specific corrections back internally ("the hero headline wraps to four lines at 390 px; cut it to the approved short form"), then review the revision. Repeat until both reviewers pass.
- The owner is never asked to settle routine layout decisions. Spacing, alignment, sizes, which variant looks better: decide them internally. Owner questions are business decisions only (offer, price display, audience, claims the owner must confirm).

## 5. Record

Write `gate-evidence/<asset>/review-marketing-<version>.json` and validate it:

```
node ../../assets/marketing/review/check-review.mjs gate-evidence/<asset>/review-marketing-<version>.json
```

```json
{
  "schema": "studio-review/1",
  "kind": "creative",
  "reviewer": { "role": "social-media-manager" },
  "author": { "role": "static-creator" },
  "subject": { "version": "v2", "sha256": "<sha256 of the exact file>", "medium": "video" },
  "voiceSource": "brief/project.json positioning.voice; design contract v3; creative brief <sha256>",
  "screenshots": [
    { "viewport": "actual-size", "url": "<cloud artifact URL>", "sha256": "<hex>", "width": 1080, "height": 1920 },
    { "viewport": "phone", "url": "<cloud artifact URL>", "sha256": "<hex>" }
  ],
  "playback": { "fullDecode": true, "durationSec": 12, "frames": 360, "watchedSec": 12, "contactSheetUrl": "<cloud artifact URL>" },
  "criteria": { "composition": { "pass": true, "note": "..." } },
  "corrections": [{ "criterion": "copy-density", "fix": "..." }],
  "ownerQuestions": [],
  "verdict": "REJECT"
}
```

The script refuses a record when the reviewer is the author, a render is missing or not a cloud link, a creative record lacks its medium or actual size, a video was not watched in full, a criterion has no note, the verdict does not follow the criteria, a REJECT has no corrections, or an owner question is a layout decision. Only `PASS` makes the work owner-visible, and PASS is still a draft, not owner approval.
