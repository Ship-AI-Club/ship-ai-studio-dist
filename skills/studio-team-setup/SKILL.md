---
name: studio-team-setup
description: Use by the owner-facing PM only, to run the startup preflight (connect and verify Zernio), create every Studio role from the role registry with CreateAgent (name, description, section_id), send each new bot its entry skill, and verify each bot resolved the exact Studio catalog, root and release. Also saves the site and creative model choices.
---

# Studio team setup

Only the owner-facing PM runs this skill. Every other bot is created by the PM. The owner never imports, wires or briefs bots, never writes technical prompts and never picks a model per asset.

## 0. Hydrate and resolve your own copy

Your `studio-bootstrap` skill (PM entry config, outside this plugin) hydrates and verifies the pinned release before this skill runs. Teammates get the same hydrate block, copied unchanged from that skill into their first message (step 4); each bot runs it on its own computer with `REL=<release>` first. It clones the release tag from the public source into `$HOME/.studio-runtime/<release>/`, checks the tag commit, the digest (tag annotation and `distribution.json`) and the file and skill counts, runs the release's `verify-install.mjs`, and only then switches `$HOME/.studio-runtime/current`. It refuses on any mismatch. A new release goes into a new folder; an existing release folder is never changed. Never write vendor plugin caches and never fall back to a creator workspace or the older product-team plugin. Native catalog evidence (version and skill count, or absent) is recorded separately from the verified runtime; the runtime is never called a refreshed native catalog.
From this folder in the verified runtime (`$HOME/.studio-runtime/current/skills/studio-team-setup`) run:

```
node ../../scripts/resolve-studio.mjs --skill studio-team-setup
```

Save the JSON to `evidence/studio-resolve/pm.json`. Its `root`, `release` and `catalogSha256` are the values every teammate must match. If it fails, stop and tell the owner the Studio plugin is not available. Never fall back to the older product-team skills.

When you link the owner or a teammate to Studio, use only the `urls` in that JSON (`repository`, `release`, `catalog`, `bootstrap`, `entrySkill`). They come from `distribution.json`. Never type a repository URL yourself.

## 1. Read the registry

Read [studio-role-registry.json](../../studio-role-registry.json). For each role it gives the display name pattern, the description (the bot's startup instruction, at most 600 characters), the entry skill, when to create it and who it reports to.

- `status: "ready"`: create when its `createdWhen` moment arrives. For a role with `prerequisites` (Designer, Frontend), run `node ../../scripts/role-gate.mjs --role <id> --project <project>`. `create: true` (exit 0) means create it now, automatically, with no owner question. Exit 2 lists what is `missing`. In review mode, the default, that is an internal draft step, never an owner approval. Only in staged mode (`setup.approvalFlow` "staged", set only when the owner chose staged approvals) does it wait for the owner's recorded approvals. Never write an approval to pass the gate. Performance Marketer, Static Creator and Video Creator: in complete-draft-bundle mode, create them after the internal site review passes; the site stays unapproved and no owner approval is recorded.
- `status: "stub"`: the role is not filled in this release. Do not create it. Report "The <role> role is not available in Studio <release> yet" to the owner once, and continue with what is available.

### Startup preflight

Run every `startupPreflight` entry on your own role (`pm`) now, before the first owner question. Each names a block in `setup.connectedApps`.

- `zernio`: run [Connect Zernio](../studio-zernio-handoff/references/connect-zernio.md) and decide with `setup.connectedApps.zernio.startup`. A working connection is reused silently. If marketing or distribution is in the requested organization and Zernio is not ready, send the owner the decision's `ownerMessage` once, now, next to your first intake question, and guide one OAuth sign-in; never defer it to bundle approval. For a site-only request, say nothing and decide again if marketing or distribution is added. Save the status in `marketing/zernio/connection.json`.

A missing connection blocks delivery only. Never hold the intake, the site or the creative for it, and never ask for a key in chat. Pass `connection.json` to the Social Media Manager when you create it; it runs the same check before delivery.

## 2. Save the model choices

The rules are `setup.modelPrecedence` in the registry. For a new owner, the project is prepared first (`studio-product-setup` step 4); then apply them once with:

```
node ../../scripts/model-setup.mjs --brief <project>/brief/project.json
```

| Field | Use | Precedence |
|---|---|---|
| `setup.siteBuildModel`, `setup.siteBuildEffort`, `setup.siteBuildFast` | Website implementation | A saved preference is used; ask nothing. With none saved, ask the owner the registry `site.question` exactly once (Opus uses more tokens, Sonnet is more conservative), then save it with `--answer opus\|sonnet\|none`. `none` saves the default `claude-opus-5-5`, `medium`, fast `false`. |
| `setup.creativeBuildModel`, `setup.creativeBuildEffort` | Static and video creative production | Always `claude-sonnet-5-5`, `reasoning_effort` `medium`, independent of the site. |

Creative runs carry no fast field at all: never pass, save or record one. Choosing Opus for the site never changes creative. There is no silent upgrade and no fallback: ask the owner only if a model is unavailable or a higher-cost choice needs approval, and record any approved creative upgrade as `setup.creativeUpgrade` with the owner's exact words. Every Cloud run records the real model selector text, effort and Fast state as evidence.

## 3. Create a role

Before the first create, read the live CreateAgent schema. If it does not accept exactly what you need, stop and report the real schema; never guess fields.

Call CreateAgent with exactly three fields:

- `name`: the registry `displayName` with `<Project>` replaced by the project name.
- `description`: the registry `description`, verbatim.
- `section_id`: the section of this project, read from your own live context. Never invent it.

No other fields. CreateAgent cannot attach plugins or skills, so step 4 is required. Check `evidence/team.json` first so a role is never created twice.

Order:

- Social Media Manager: before the first site build, so marketing reviews the offer and CTA and later the rendered pages.
- Performance Marketer, Static Creator, Video Creator: after the owner approves the working site.
- Product roles: as their filled registry entries say.

## 4. First message to each new bot

Send this, filled in, as the bot's first message, with the hydrate block from your `studio-bootstrap` skill pasted where shown:

```text
Load your entry skill from the verified Studio runtime only, on your own computer.
First run this with bash, unchanged, after the line REL=<release>:
<the hydrate block from studio-bootstrap, unchanged>
Reply with its JSON. If it prints STUDIO HYDRATE REFUSED, reply with that line and stop.
Plugin root: <root from pm.json>
Release: <release>
Catalog sha256: <catalogSha256>
Run from <root>/skills/<entry-skill>:
  node ../../scripts/resolve-studio.mjs --skill <entry-skill> --expect-release <release> --expect-catalog-sha256 <catalogSha256>
Reply with the full JSON output. If it fails, reply with the error and stop.
Do not load any other copy of a skill with a similar name.
Project folder: <path>. Brief: brief/project.json v<n>.
Zernio status: marketing/zernio/connection.json (<status>).
```

## 5. Verify before any work

The bot is ready only when its reply is a `RESOLVED` JSON whose `plugin`, `release`, `root` and `catalogSha256` equal yours, and whose `skill.sha256` equals the catalog entry for its entry skill. Anything else (an error, a different root, an older product-team skill, a summary instead of the JSON) means not ready: resend step 4 once, then report the blocker. Never brief an unverified bot.

Record `evidence/team/<role-id>.json`: agent ID, name, created time, the resolve JSON and `verified: true`.

## 6. Running the team

- You are the only owner-facing bot. Pass files between bots; the owner never relays anything.
- Owner and interface text (questions, updates, steps, help and errors): short, clear, active. Ask one clear decision at a time.
- The owner never settles routine layout decisions. The Designer picks one strong direction privately; design and marketing reviewers settle layout internally.
- Show the owner only work that passed both independent reviews. Drafts are never approved until the owner approves the exact version.
- External actions (deploy, send, post, schedule, Zernio drafts, campaigns, spend) each need the owner's exact approval.

The tools this skill uses (the live CreateAgent schema and the message tool) are verified at run time. They are not assumed from this text.
