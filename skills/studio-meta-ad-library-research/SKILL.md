---
name: studio-meta-ad-library-research
description: Use when researching category or competitor ads in Meta Ad Library and current Meta Ads Guide specs before proposing paid or organic creative. Records only real observed links and dates, labels references as non-proof, and stays read-only.
---

# Studio Meta Ad Library research

## 0. Resolve

From this folder run `node ../../scripts/resolve-studio.mjs --skill studio-meta-ad-library-research`. Stop on any error.

## 1. Scope

- Read-only. No ad account access, no writes, no spend.
- Confirm audience, category and country from the approved brief. Do not ask the owner again.

## 2. Specs

Read the current official Meta Ads Guide page for each target placement (Feed, Reels, Stories). Record the URL and the date you read it for each spec: ratio, resolution, length, safe zones. Meta states safe zones as percentages; any pixel math is yours, so label it.

## 3. Ad Library

1. Search active ads for the target country with exact-phrase category keywords.
2. Inspect 3-6 relevant ads. Record only what you actually observed.
3. If a page is unreachable (Ad Library is JavaScript-heavy and often returns 403 to plain fetches), use a browser session if you have one. Otherwise write "no live examples reviewed". Never fill the gap from memory.

## 4. Third-party archives

Zernio's ad archive API cannot verify US-only commercial ads: public ad archives mainly cover political and EU-regulated ads. Never cite it as proof that a US commercial ad exists or ran. Every research doc carries this statement.

## 5. Rules

- An active ad is a reference, not performance evidence. Never say an ad "works" or "converts".
- Never reuse competitor claims, prices, footage, copy or artwork.
- Prefer official pages. Label articles about Meta studies as secondary. Say when a source was a search excerpt, not a full fetch.

## 6. Research doc

Save `marketing/research/ad-library-<YYYY-MM-DD>.md`:

```markdown
# Ad reference research, <YYYY-MM-DD>
Brief v<n>. Country <code>. Keywords: "<phrase>", "<phrase>".
Zernio's archive API cannot verify US-only commercial ads; it is not used as proof here.

## Specs (official)
| Placement | Spec | Source URL | Read on |

## Observed ads
| Advertiser | Library ID | Ad URL | Start date shown | Observed on | Format | What I saw | Hook / framing / pacing / proof / CTA |

## Patterns to carry forward (as references, not proof)
## Do not reuse
## Unverified or unreachable
```

Every observed row needs a real URL and two dates: the start date the library shows and the date you observed it. A row without both is removed, not guessed.
