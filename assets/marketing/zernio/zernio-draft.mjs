// Zernio handoff guard. The only remote action this helper can produce is a DRAFT post
// for one exact, owner-approved account. Upload, schedule and publish items are bound by
// the same approval hash but are not carried out here; each needs its own tool and an
// owner approval of a bundle that names that action.
//
// Owner-facing call shape (snake_case):
//   { is_draft: true, publish_now: false, account_id, profile_id, platform, item_id, bundle_sha256 }
// Tool args follow the live create-post schema:
//   mcp  (hosted posts_create): { content, platform, account_id, profile_id, is_draft: true, publish_now: false, media_urls }
//   rest (POST /v1/posts):      { content, isDraft: true, publishNow: false, platforms: [{ platform, accountId }], mediaItems }
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recomputeApprovalHash, readMediaFromRoot } from "../bundle/approval-hash.mjs";
import { readResult, resolveTools } from "./tool-client.mjs";

export const APPROVAL_SCHEMA = "studio-owner-approval/1";
const FORBIDDEN_CALL_KEYS = ["scheduled_for", "scheduledFor", "schedule_minutes", "queued_from_profile", "queuedFromProfile", "publish_at", "publishAt"];
const PLACEHOLDER = /^(<.*>|first|default|any|auto|todo|tbd|x+|acc_x+|account_id|profile_id)$/i;
const HEX64 = /^[0-9a-f]{64}$/;

export class ZernioRefusal extends Error {
  constructor(reason) { super(`Zernio call refused: ${reason}`); this.name = "ZernioRefusal"; }
}

const exactId = v => typeof v === "string" && v.trim() && !PLACEHOLDER.test(v.trim());

export function assertDraftCall(call) {
  if (!call || typeof call !== "object") throw new ZernioRefusal("no call parameters");
  if (call.is_draft !== true) throw new ZernioRefusal("is_draft must be exactly true");
  if (call.publish_now !== false) throw new ZernioRefusal("publish_now must be exactly false (omitting it is not allowed)");
  if (!exactId(call.account_id)) throw new ZernioRefusal("account_id must be the exact, verified account ID (never a placeholder or the first account)");
  if (!exactId(call.profile_id)) throw new ZernioRefusal("profile_id must be the exact, verified profile ID");
  if (typeof call.platform !== "string" || !call.platform.trim()) throw new ZernioRefusal("platform is required");
  if (typeof call.item_id !== "string" || !call.item_id) throw new ZernioRefusal("item_id is required");
  if (typeof call.bundle_sha256 !== "string" || !HEX64.test(call.bundle_sha256)) throw new ZernioRefusal("bundle_sha256 of the reviewed bundle is required");
  for (const k of FORBIDDEN_CALL_KEYS) if (k in call) throw new ZernioRefusal(`${k} is not allowed: scheduling is bound in the bundle and is not done by the draft helper`);
  return call;
}

export function assertApprovalRecord(approval) {
  if (!approval) throw new ZernioRefusal("no owner approval record");
  if (approval.schema !== APPROVAL_SCHEMA) throw new ZernioRefusal(`approval record must be "${APPROVAL_SCHEMA}"`);
  if (approval.by !== "owner") throw new ZernioRefusal("approval must come from the owner, not a teammate or the bot");
  if (typeof approval.quote !== "string" || !approval.quote.trim()) throw new ZernioRefusal("approval must quote the owner's exact words");
  if (Number.isNaN(Date.parse(approval.at ?? ""))) throw new ZernioRefusal("approval needs the time the owner gave it");
  if (typeof approval.bundleSha256 !== "string" || !HEX64.test(approval.bundleSha256)) throw new ZernioRefusal("approval must name the exact bundle hash");
  return approval;
}

// Recomputes the approval hash from the bundle fields and the media bytes as they are now.
export async function assertApprovedHash({ bundle, call, approval, readMedia }) {
  assertApprovalRecord(approval);
  let now;
  try { now = await recomputeApprovalHash(bundle, readMedia); } catch (e) { throw new ZernioRefusal(e.message); }
  if (now !== approval.bundleSha256) throw new ZernioRefusal(`bundle hash ${now} differs from the owner-approved hash ${approval.bundleSha256}; any edit to media, caption, destination, action or schedule needs a new approval`);
  if (now !== bundle.bundleSha256) throw new ZernioRefusal("bundle.json was edited after it was built; rebuild it and ask for a new approval");
  if (call.bundle_sha256 !== now) throw new ZernioRefusal("call names a different bundle hash");
  return now;
}

function itemFor(bundle, call) {
  const item = bundle.items.find(i => i.id === call.item_id);
  if (!item) throw new ZernioRefusal(`bundle has no item ${call.item_id}`);
  if (item.action !== "draft") throw new ZernioRefusal(`item ${item.id} action is "${item.action}"; this helper creates drafts only`);
  if (item.schedule !== null) throw new ZernioRefusal(`item ${item.id} carries a schedule; drafts are created with no schedule`);
  const d = item.destination ?? {};
  if (d.accountId !== call.account_id || d.profileId !== call.profile_id || d.platform !== call.platform) {
    throw new ZernioRefusal("call destination differs from the approved bundle destination (platform, account ID, profile ID)");
  }
  for (const m of item.media) if (!/^https:\/\//.test(m.url ?? "")) throw new ZernioRefusal(`media ${m.path} needs a cloud https URL; local files are never uploaded from the owner's computer`);
  return item;
}

export function assertDraftArgs(args, dialect) {
  if (dialect === "mcp") {
    if (args.is_draft !== true || args.publish_now !== false) throw new ZernioRefusal("create-post args must carry is_draft:true and publish_now:false");
    if (!exactId(args.account_id)) throw new ZernioRefusal("create-post args must name the exact account_id");
    for (const k of ["schedule_minutes", "scheduled_for"]) if (k in args) throw new ZernioRefusal(`create-post args must not carry ${k}`);
    return args;
  }
  if (dialect === "rest") {
    if (args.isDraft !== true || args.publishNow !== false) throw new ZernioRefusal("create-post args must carry isDraft:true and publishNow:false");
    for (const k of ["scheduledFor", "queuedFromProfile"]) if (k in args) throw new ZernioRefusal(`create-post args must not carry ${k}`);
    if (!Array.isArray(args.platforms) || args.platforms.length !== 1 || !args.platforms[0].accountId) throw new ZernioRefusal("create-post args must target exactly one account");
    return args;
  }
  throw new ZernioRefusal(`unknown create-post schema "${dialect}"`);
}

function argsFor(item, call, dialect) {
  if (dialect === "mcp") return {
    content: item.caption, platform: call.platform, account_id: call.account_id, profile_id: call.profile_id,
    is_draft: true, publish_now: false, media_urls: item.media.map(m => m.url).join(","),
  };
  return {
    content: item.caption, isDraft: true, publishNow: false,
    platforms: [{ platform: call.platform, accountId: call.account_id }],
    mediaItems: item.media.map(m => ({ url: m.url, type: m.type })),
  };
}

function requestFor(bundle, call, tools) {
  const item = itemFor(bundle, call);
  const t = tools ?? bundle.zernioTools ?? { createPost: "posts_create", dialect: "mcp" };
  const args = assertDraftArgs(argsFor(item, call, t.dialect), t.dialect);
  return { tool: t.createPost, dialect: t.dialect, args, idempotencyKey: `${bundle.bundleSha256.slice(0, 32)}-${call.account_id}-${item.id}` };
}

// Dry run: the exact request, marked NOT SENT. Never counts as success.
export function previewDraftRequest(bundle, call) {
  assertDraftCall(call);
  return { status: "NOT SENT", request: requestFor(bundle, call) };
}

// Every approval check, then the request for the live create-post schema.
export async function buildDraftRequest({ bundle, call, approval, readMedia, liveTools }) {
  assertDraftCall(call);
  await assertApprovedHash({ bundle, call, approval, readMedia });
  let tools;
  if (liveTools) { try { tools = resolveTools(liveTools); } catch (e) { throw new ZernioRefusal(e.message); } }
  return requestFor(bundle, call, tools);
}

export function postIdOf(res) {
  const { data, text } = readResult(res);
  return data?.post?._id ?? data?.post?.id ?? data?._id ?? data?.id ?? /\bID:\s*([A-Za-z0-9_-]+)/.exec(text)?.[1] ?? null;
}

export function postStatusOf(res) {
  const { data, text } = readResult(res);
  return data?.post?.status ?? data?.status ?? /\bstatus:\s*([a-z_]+)/i.exec(text)?.[1]?.toLowerCase() ?? null;
}

// The remote post counts as a draft only when it reads back as one.
export function assertReadBack(back, postId) {
  const status = postStatusOf(back);
  if (status !== "draft") throw new Error(`Remote post ${postId} reads back as "${status}", not "draft"`);
  return status;
}

// Every check runs before the first write tool call. After create, the post is read back
// and reported only when the remote status is "draft".
export async function createDraft({ bundle, call, approval, readMedia, client }) {
  if (!client || typeof client.callTool !== "function" || typeof client.listTools !== "function") throw new ZernioRefusal("no Zernio tool client");
  assertDraftCall(call);
  await assertApprovedHash({ bundle, call, approval, readMedia });
  let tools;
  try { tools = resolveTools(await client.listTools()); } catch (e) { throw new ZernioRefusal(e.message); }
  const req = requestFor(bundle, call, tools);
  const created = await client.callTool(req.tool, req.args, { idempotencyKey: req.idempotencyKey });
  const id = postIdOf(created);
  if (!id) throw new Error("Zernio did not return a post ID; report the draft as not created");
  assertReadBack(await client.callTool(tools.getPost, { [tools.getPostArg]: id }), id);
  return { postId: id, status: "draft", accountId: call.account_id, profileId: call.profile_id, platform: call.platform, itemId: call.item_id, bundleSha256: call.bundle_sha256 };
}

// CLI:
//   preview:  node zernio-draft.mjs --bundle bundle.json --call call.json --out <outbox-dir>
//   approved: node zernio-draft.mjs --bundle bundle.json --call call.json --approval approval.json \
//               --root <media root> --tools live-tools.json --out <outbox-dir>
//             Writes the exact tool name and args. The bot calls that tool with exactly those args.
//   read-back: node zernio-draft.mjs --read-back posts-get-result.json --post-id <id>
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = k => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : undefined; };
  const json = f => JSON.parse(fs.readFileSync(f, "utf8"));
  try {
    if (a("--read-back")) {
      const t = fs.readFileSync(a("--read-back"), "utf8");
      let res; try { res = JSON.parse(t); } catch { res = { content: [{ type: "text", text: t }] }; }
      console.log(`post ${a("--post-id")} reads back as ${assertReadBack(res, a("--post-id"))}`);
    } else {
      for (const k of ["--bundle", "--call", "--out"]) if (!a(k)) throw new Error(`${k} is required`);
      const bundle = json(a("--bundle"));
      const call = json(a("--call"));
      fs.mkdirSync(a("--out"), { recursive: true });
      if (a("--approval")) {
        for (const k of ["--root", "--tools"]) if (!a(k)) throw new Error(`${k} is required with --approval`);
        const live = json(a("--tools"));
        const req = await buildDraftRequest({ bundle, call, approval: json(a("--approval")), readMedia: readMediaFromRoot(path.resolve(a("--root"))), liveTools: Array.isArray(live) ? live : live.tools });
        const file = path.join(a("--out"), `${call.item_id}.zernio-draft.APPROVED-REQUEST.json`);
        fs.writeFileSync(file, JSON.stringify({ status: "APPROVED, NOT YET SENT", request: req }, null, 2) + "\n");
        console.log(`Approved request written to ${file}. Call ${req.tool} with exactly these args, then read the post back.`);
      } else {
        const file = path.join(a("--out"), `${call.item_id}.zernio-draft.NOT-SENT.json`);
        fs.writeFileSync(file, JSON.stringify(previewDraftRequest(bundle, call), null, 2) + "\n");
        console.log(`NOT SENT preview written to ${file}`);
      }
    }
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
