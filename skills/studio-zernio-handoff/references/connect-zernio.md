# Connect Zernio

Part of team startup. The PM runs it before the first owner question, and the Social Media Manager runs it again before any delivery step. The settings live in `setup.connectedApps.zernio` in [studio-role-registry.json](../../../studio-role-registry.json).

A missing connection blocks delivery only (upload, draft, schedule, publish). Site, static, video and review work continue.

## 1. Check silently and decide

Look for Zernio tools in your live tool list (type `@` in chat to see connectors). A connector may add a prefix in front of the names, such as `zernio__accounts_list`. Use the real names and prefix you see. The names on this page are examples only. Do not add a second connection.

Run step 3 (it only reads), then decide with the scope of the requested organization: `marketing` when it includes any marketing-team role, `distribution` when the owner asks to send, post or schedule creative, otherwise `site-only`.

```
node ../../assets/marketing/zernio/connection.mjs --out marketing/zernio/connection.json --startup <scope>
```

| Result | What you do |
|---|---|
| Connected | Say nothing about Zernio. Reuse the connection. |
| Not ready, `site-only` | Say nothing. Intake goes on. Decide again if marketing or distribution is added. |
| Not ready, `marketing` or `distribution` | Send its `ownerMessage` once, now, next to your first intake question. Do not wait for bundle approval. Then step 2. |

## 2. Guide one sign-in

The startup message is exactly:

> We can prepare your site and creative now. To send them later, connect Zernio. I will open sign-in if needed. Do not paste a key here.

Then pick the first option that works:

1. **Connect apps.** Open Connect apps, find the Zernio plugin and choose Add. Finish the browser sign-in when asked.
2. **Custom connector from chat.** If there is no Zernio plugin, add a remote HTTPS connector through the supported chat or Setup flow: "Add this MCP server: https://mcp.zernio.com/mcp". Confirm the details. Sign-in uses OAuth in the browser. The new tools appear from the next message.
3. **API key, only when no OAuth path works.** Use the platform's masked secret request, or the connector's masked header setup. Never ask for a key in chat. Never echo, log or store it in plain text, and never put it in a prompt, template, file or source.

Do not use grok.com/connectors. Do not ask the owner to edit a local `.cursor/mcp.json`. Everything stays remote.

If the owner needs to type a password or code, they take over the browser for that step only.

Check again on the owner's next message.

## 3. Verify sign-in

The tool list on the hosted server is public, so seeing the tools does not prove sign-in.

1. Save the live tool list with its schemas to `marketing/zernio/live-tools.json`.
2. Call the profiles read (for example `profiles_list`) and the accounts read (for example `accounts_list`). Save each raw result to `marketing/zernio/profiles.json` and `marketing/zernio/accounts.json`.
3. From this skill's folder, run:

   ```
   node ../../assets/marketing/zernio/connection.mjs --tools marketing/zernio/live-tools.json \
     --profiles marketing/zernio/profiles.json --accounts marketing/zernio/accounts.json \
     --out marketing/zernio/connection.json
   ```

   It only reads. It checks that the create-post schema still has the draft flags.

| Status | What to do |
|---|---|
| `connected` | Show the PM the profiles and accounts. The owner picks one. |
| `no-accounts` | Signed in, but no social account. Ask the owner to connect one in Zernio, then check again. |
| `needs-sign-in` | Start the sign-in again. If it was cached, remove and re-add the connection. |
| `not-connected` | Go to step 2. |
| `schema-changed` | Stop delivery. Report the real tool list. Never guess fields. |

Never make a test post, draft or upload to prove sign-in.

## 4. Record the destination

When the owner picks, record their exact words:

```
node ../../assets/marketing/zernio/connection.mjs --out marketing/zernio/connection.json \
  --select-profile <profile ID> --select-account <account ID> --quote "<owner's words>" --at <ISO time>
```

`connection.json` then holds the profile, account, platform, handle and ID. Then build the destinations snapshot for the bundle:

```
node ../../assets/marketing/zernio/resolve-destinations.mjs --connection marketing/zernio/connection.json \
  --out marketing/zernio/destinations.json
```

## 5. Delivery stays separate

Approving the creative is not permission to upload, draft, schedule or publish. The final bundle shows the exact caption, assets, link, profile, account and action, plus the schedule and timezone. Each action needs the owner's approval of that exact bundle hash. See [the Zernio handoff](../SKILL.md).

Templates carry no account IDs, profile IDs, handles or keys. Every new owner connects their own account.
