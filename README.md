# Studio

A Cursor plugin for running a small product and marketing team of agents from one owner-facing PM. Everything stays a draft until the owner approves each exact action.

- Source: https://github.com/Ship-AI-Club/ship-ai-studio-dist
- Release: 0.1.1 (https://github.com/Ship-AI-Club/ship-ai-studio-dist/releases/tag/v0.1.1)
- Catalog: https://github.com/Ship-AI-Club/ship-ai-studio-dist/blob/v0.1.1/catalog.json
- Start here: https://github.com/Ship-AI-Club/ship-ai-studio-dist/blob/v0.1.1/skills/studio-team-setup/SKILL.md

## What is inside

| Path | Contents |
|---|---|
| `skills/` | The Studio entry skills. Each one starts with a resolve step that proves the plugin root, release and catalog. |
| `studio-role-registry.json` | The roles the PM creates, and the saved site and creative model settings. |
| `assets/marketing/` | Token-driven still and video renderers, and the bundle, approval, stage, review and Zernio draft guards. See its README. |
| `scripts/resolve-studio.mjs` | The resolve step. Stops on any mismatch and never falls back to another copy of a skill. |
| `catalog.json` | The sha256 of every skill folder and shipped file. |
| `distribution.json` | The one place public URLs come from. |

## Use

Create the PM from its entry config, [pm-config/pm.json](pm-config/pm.json): the description, the `studio-bootstrap` skill ([pm-config/studio-bootstrap/SKILL.md](pm-config/studio-bootstrap/SKILL.md)) as the PM's own skill, plugin refs and settings. The bootstrap needs nothing from the plugin. On its own computer the PM clones the release tag from this repository into `$HOME/.studio-runtime/<release>/` and checks the commit, the digest and the file and skill counts. It refuses on any mismatch and then works from that verified copy. A new release goes into a new folder.

Adding Studio to your own Cursor account is optional and is for the owner only: open Customize, then Add Marketplace, then Import from GitHub with https://github.com/Ship-AI-Club/ship-ai-studio-dist, then Add to Cursor, then Add for Myself. Typing `/add-plugin` in Grok Bot chat is not a working import. Customize shows only Remove for this marketplace, with no Refresh or Update. An import in one account does not show whether another owner's account can see the plugin.

Rendering needs Node 20 or later and `npm ci` in `assets/marketing/`.

Release digest: `distribution.json` `runtime.digest` is the sha256 of the `sha256sum` list of every file except `catalog.json` and `distribution.json`, sorted bytewise by path. The `v0.1.1` tag annotation carries the same value on a line `studio-runtime-digest: <digest>`.

## Connect Zernio (to send finished creatives)

The PM checks Zernio quietly at startup. A working connection is reused and you hear nothing about it. If your team includes marketing or you ask to send creatives and Zernio isn't ready, the PM asks you once, at the start. A site-only request isn't interrupted. Without Zernio, your site and creative are still prepared; only uploading, drafting, scheduling and publishing wait.

- Reuse a working Zernio connection if you have one.
- Otherwise add the Zernio plugin from Connect apps and sign in with your browser. With no plugin, ask your bot: "Add this MCP server: https://mcp.zernio.com/mcp", then sign in.
- Only if browser sign-in isn't available: add an API key through the platform's masked secret request or the connector's masked header setup. Never paste a key in chat. The bot never shows, logs or stores it in plain text.
- Connect at least one social account in Zernio.

The bot proves the sign-in by reading your Zernio profiles and accounts. It never makes a test post. Nothing is uploaded, drafted, scheduled or published until you approve that exact bundle. Details: `skills/studio-zernio-handoff/references/connect-zernio.md`.

## Licenses

Ship AI-authored files: MIT ([LICENSE](LICENSE)). Third-party material, fonts and runtime dependencies: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [PROVENANCE.md](PROVENANCE.md). Remotion, which the renderers install, has its own license; larger companies need a Remotion company license.
