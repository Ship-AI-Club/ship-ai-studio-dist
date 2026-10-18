---
name: studio-zernio-handoff
description: Use at team startup to connect and verify Zernio (references/connect-zernio.md), when the Social Media Manager needs real Zernio destinations for a bundle, or when the owner asks for social drafts in Zernio. Resolves the live tool schema, profiles and accounts read-only, then, only after the owner approves the exact bundle hash, creates DRAFTS with is_draft=true, publish_now=false and the exact account and profile IDs, and reads back the remote status.
---

# Studio Zernio handoff

Owned by the Social Media Manager. Two parts: a read-only resolve before the bundle, and draft creation after the owner approves the exact bundle hash. Nothing is uploaded, drafted, scheduled or published before that approval.

## 0. Resolve

From this folder run `node ../../scripts/resolve-studio.mjs --skill studio-zernio-handoff`. Stop on any error.

## 1. Read-only: live schema, profiles and accounts

Run this before the bundle names any destination. A destination that was not resolved here is invented, and the bundle builder refuses it.

1. Re-check the current Zernio docs and note the date. As of this release the hosted MCP at `https://mcp.zernio.com/mcp` offers `profiles_list`, `accounts_list`, `posts_get` and `posts_create` (`is_draft`, `publish_now`, `account_id`, `profile_id`, `platform`, `media_urls`); `is_draft: true` saves a draft and is never scheduled. The REST fallback is `POST /v1/posts` with `isDraft`, `publishNow` and `platforms`.
2. Run [Connect Zernio](references/connect-zernio.md). It reuses a working connection or guides one OAuth sign-in, and proves sign-in with the authenticated profiles and accounts reads, never with the public tool list or a test post. The result is `marketing/zernio/connection.json`.
3. Show the PM the profiles and accounts (profile name and ID, platform, handle and account ID). The owner picks the destination. Never default to the first account. Record the pick (step 4 of Connect Zernio), then write the snapshot:

   ```
   node ../../assets/marketing/zernio/resolve-destinations.mjs --connection marketing/zernio/connection.json --out marketing/zernio/destinations.json
   ```

The helpers resolve the real tool names (with any connector prefix) from the live list, refuse a create-post schema without draft flags, and call only read tools. Any other call is refused by the guard.

Never ask for a key in chat and never paste one. If Zernio is not connected or has no account, report it. That blocks delivery only: the bundle can still be reviewed with `action: "none"`.

## 2. What the approval binds

The bundle builder computes `bundleSha256` with [approval-hash.mjs](../../assets/marketing/bundle/approval-hash.mjs). For every item, the hash binds:

- the byte sha256 of every media file;
- the exact caption text, including line breaks;
- the links;
- the destination platform, account ID and profile ID;
- the action: `none`, `upload`, `draft`, `schedule` or `publish`;
- the schedule time and timezone (`null` unless the action is `schedule`).

Any edit to any of these is a new hash. The old approval no longer applies. The bundle `status` is not part of the hash, so editing it can neither fake nor break an approval.

## 3. Dry run

The bundle builder writes `outbox/<item>.zernio-draft.NOT-SENT.json` for every `draft` item. Show the owner the assets, exact caption, links, destination, action and the exact request. NOT SENT never counts as done.

## 4. Exact approval

Show the exact caption, assets and link for each item first. Then ask one question: "Approve bundle <version> (<bundleSha256>): <action> <items> on <platform> account <handle> (<account ID>), profile <name> (<profile ID>), schedule <time and timezone, or none>?" Record the owner's answer in `marketing/APPROVALS.md` and as `marketing/bundle/<version>/approval.json`:

```json
{ "schema": "studio-owner-approval/1", "by": "owner", "quote": "<owner's exact words>",
  "at": "<ISO time>", "bundleSha256": "<hex>" }
```

Only the owner's words count. Never write this file for an approval the owner did not give.

## 5. Create drafts through the guard

Never hand-write a request. Use [zernio-draft.mjs](../../assets/marketing/zernio/zernio-draft.mjs):

- **Bot with a connected MCP.** Save a fresh live tool list, then run:

  ```
  node ../../assets/marketing/zernio/zernio-draft.mjs --bundle marketing/bundle/<version>/bundle.json \
    --call <call.json> --approval marketing/bundle/<version>/approval.json --root <repo root> \
    --tools marketing/zernio/live-tools.json --out marketing/bundle/<version>/outbox
  ```

  It runs every check below and writes `<item>.zernio-draft.APPROVED-REQUEST.json`. Call the named tool with exactly those args, once.
- **Code with a tool client.** Call `createDraft({ bundle, call, approval, readMedia, client })`. `readMedia` reads the media bytes (for example `readMediaFromRoot(<repo root>)`).

The call must be:

```json
{ "is_draft": true, "publish_now": false, "account_id": "<exact id>", "profile_id": "<exact id>",
  "platform": "<platform>", "item_id": "<item-id>", "bundle_sha256": "<hex>" }
```

Before any write tool runs, the helper:

1. refuses when there is no approval record, or the record is not the owner's exact words with a time and a hash;
2. recomputes the hash from the bundle and the media bytes as they are now, and refuses when it differs from the approved hash;
3. refuses unless the item's action is `draft` with no schedule, the call matches the approved destination, and media are cloud https URLs;
4. re-reads the live tool list and refuses if the create-post schema lost its draft flags, then builds args for that schema with no schedule field.

It sends a stable idempotency key per bundle, account and item, so a retry cannot duplicate a draft.

## 6. Read back

After each create, read the post back with the posts read (for example `posts_get`), save the raw result, and check it:

```
node ../../assets/marketing/zernio/zernio-draft.mjs --read-back <saved result> --post-id <id>
```

Report a draft only when the remote status is `draft`. Store the returned post IDs in `marketing/bundle/<version>/zernio-drafts.json` and show the links. Never reuse draft IDs from an earlier version.

## 7. Upload, schedule and publish

The hash binds these actions too, but this helper does not carry them out. Each needs a bundle that names that action and schedule, the owner's approval of that exact hash, and a guard of its own. Until one exists, report the item as NOT SENT.
