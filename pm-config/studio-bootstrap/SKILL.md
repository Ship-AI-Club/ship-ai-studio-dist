---
name: studio-bootstrap
description: First-run and update path for the Studio PM. Hydrates the pinned Studio release from its public source onto this bot's own computer, verifies the commit, digest and file and skill counts, and refuses on any mismatch. Works with no native Studio plugin installed. Run it before any Studio skill.
---

# Studio bootstrap

This skill is the PM's own skill. It is not part of the Studio plugin and needs nothing from it: only `git`, `node` and the standard shell tools on your computer. Run it yourself, before any Studio skill, at the start of every new project and whenever you are told about a new Studio release. Never ask the client or the owner to run it.

## 1. Native catalog evidence

Write down what your platform's native plugin catalog shows for the Studio plugin: `present` with its version and skill count, or `absent`, or `unreadable`. That is all it proves. The native catalog may list only skill entries, without the scripts and assets, or may not show Studio at all, for example in an account that cannot see the plugin. Never rely on it. Never treat it as the runtime.

## 2. Hydrate and verify the runtime

Run this block with `bash`. Set `REL` to the release you were given, for example `REL=0.1.1`. If you were given none, it uses the newest `vX.Y.Z` tag at the source.

<!-- studio-hydrate:start -->
```bash
set -euo pipefail
SRC=https://github.com/Ship-AI-Club/ship-ai-studio-dist
BASE="$HOME/.studio-runtime"
refuse() { echo "STUDIO HYDRATE REFUSED: $*" >&2; exit 1; }
REL="${REL:-$(git ls-remote --tags --refs "$SRC" 'v*' | sed -n 's#.*refs/tags/v\([0-9][0-9.]*\)$#\1#p' | sort -V | tail -n 1)}"
[[ "$REL" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || refuse "no release tag vX.Y.Z at $SRC"
COMMIT="$(git ls-remote "$SRC" "refs/tags/v$REL^{}" | cut -f1)"
[ -n "$COMMIT" ] || refuse "v$REL is not an annotated release tag at $SRC"
DIR="$BASE/$REL"; TMP=""
trap '[ -z "$TMP" ] || rm -rf "$TMP"' EXIT
mkdir -p "$BASE"
if [ -e "$DIR" ]; then CAND="$DIR"; else
  TMP="$(mktemp -d "$BASE/.incoming-$REL.XXXXXX")"; CAND="$TMP/tree"
  git -c advice.detachedHead=false clone --quiet --depth 1 --branch "v$REL" "$SRC" "$CAND" || refuse "could not clone v$REL from $SRC"
fi
[ "$(git -C "$CAND" rev-parse HEAD)" = "$COMMIT" ] || refuse "$CAND is not the v$REL commit $COMMIT"
[ -z "$(git -C "$CAND" status --porcelain --ignored)" ] || refuse "$CAND has changed or extra files"
DIGEST="$(cd "$CAND" && git ls-files -z | LC_ALL=C sort -z | grep -zvxE 'catalog\.json|distribution\.json' | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
TAGGED="$(git -C "$CAND" cat-file -p "refs/tags/v$REL" | sed -n 's/^studio-runtime-digest: \([0-9a-f]\{64\}\)$/\1/p')"
FILES="$(git -C "$CAND" ls-files | wc -l | tr -d ' ')"
SKILLS="$(find "$CAND/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
read -r DREL DTAG DDIGEST DFILES DSKILLS CSKILLS < <(node -e 'const [d,c]=[1,2].map(i=>require(process.argv[i]));const r=d.runtime||{};console.log([d.release,d.tag,r.digest||"-",r.files||"-",r.skills||"-",(c.skills||[]).length].join(" "))' "$CAND/distribution.json" "$CAND/catalog.json")
[ "$DREL" = "$REL" ] && [ "$DTAG" = "v$REL" ] || refuse "distribution.json names release $DREL ($DTAG), not $REL"
[ "$TAGGED" = "$DIGEST" ] || refuse "tree digest $DIGEST does not match the v$REL tag annotation (${TAGGED:-none})"
[ "$DDIGEST" = "$DIGEST" ] || refuse "tree digest $DIGEST does not match distribution.json ($DDIGEST)"
[ "$DFILES" = "$FILES" ] || refuse "release has $FILES files; distribution.json says $DFILES"
[ "$DSKILLS" = "$SKILLS" ] && [ "$CSKILLS" = "$SKILLS" ] || refuse "release has $SKILLS skills; distribution.json says $DSKILLS, catalog.json $CSKILLS"
node "$CAND/scripts/verify-install.mjs" --root "$CAND" > "$BASE/verify-install-$REL.json" || refuse "verify-install failed; see $BASE/verify-install-$REL.json"
[ "$CAND" = "$DIR" ] || mv "$CAND" "$DIR"
ln -sfn "$REL" "$BASE/.current.new" && mv -T "$BASE/.current.new" "$BASE/current"
printf '{"runtime":{"status":"VERIFIED","release":"%s","root":"%s","current":"%s","commit":"%s","digest":"%s","files":%s,"skills":%s,"source":"%s","verifyInstall":"PASS"}}\n' "$REL" "$DIR" "$BASE/current" "$COMMIT" "$DIGEST" "$FILES" "$SKILLS" "$SRC"
```
<!-- studio-hydrate:end -->

It downloads only the release tag from the public source into `$HOME/.studio-runtime/<release>/`, checks it, and only then points `$HOME/.studio-runtime/current` at it. It refuses, with exit code 1 and a line starting `STUDIO HYDRATE REFUSED`, when any of these disagree: the tag commit, a clean checkout with no extra files, the tree digest against both the tag annotation and `distribution.json`, the file count, the skill count, or the release's own `scripts/verify-install.mjs`.

The digest is the sha256 of the `sha256sum` list of every release file except `catalog.json` and `distribution.json`, sorted bytewise by path. Those two are left out because `distribution.json` carries the digest and `catalog.json` pins `distribution.json`; `verify-install.mjs` then requires `catalog.json` to be exactly the catalog of the verified tree. The release tag annotation carries the same digest on a line `studio-runtime-digest: <sha256>`.

On a refusal, stop. Report the line to the owner as "Studio could not be verified", and send the technical line in your handoff notes. Never edit, patch or re-download files inside a release folder to make it pass, and never use another copy.

## 3. Record the evidence

Save `evidence/studio-runtime.json` in the project with two separate parts:

- `nativeCatalog`: what step 1 found (`present` with version and skill count, `absent` or `unreadable`).
- `runtime`: the JSON the block printed (release, root, commit, digest, files, skills).

Never describe the runtime copy as a refreshed or updated native catalog. They are different things.

## 4. Work from the verified runtime

Read every Studio skill as the full `SKILL.md` file under `$HOME/.studio-runtime/current/skills/`, not a catalog summary. Run each skill's commands from that skill's folder there. Start with `studio-pm`:

```bash
cd "$HOME/.studio-runtime/current/skills/studio-pm" && node ../../scripts/resolve-studio.mjs --skill studio-pm --expect-release <release>
```

Then follow `studio-pm`, which runs `studio-product-setup` and `studio-team-setup`.

## 5. Updates

For a new release, run the same block with the new `REL`. It hydrates a new versioned folder, verifies it and only then switches `current`. It never changes an existing release folder. Projects already under way keep their recorded release until the owner agrees to move.

## 6. Adding the plugin to an account (owner only, optional)

The runtime above is what the team uses. If the owner also wants Studio in their own Cursor account, tell the owner, never the client conversation:

In your Cursor account, open Customize, then Add Marketplace, then Import from GitHub with `https://github.com/Ship-AI-Club/ship-ai-studio-dist`, then Add to Cursor, then Add for Myself.

Typing `/add-plugin` in Grok Bot chat is not a working import. Customize shows only Remove for this marketplace, with no Refresh or Update, so a newer release reaches the team through step 5, not through the account. An import in one account does not prove that another owner's account can see the plugin; the runtime path does not depend on it.

## Never

- Never write, copy into, clear or edit a vendor plugin cache.
- Never fall back to a creator's workspace, another bot's files or the older product-team plugin.
- Never ask the client to install, run or check anything. The owner's only optional step is section 6.
