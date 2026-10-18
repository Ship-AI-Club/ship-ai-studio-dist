// Zernio connection preflight, run at team startup and before any delivery step.
// tools/list on the hosted server needs no credential, so a tool list proves nothing about
// sign-in. Connected means: the live tools resolve, the create-post schema still carries
// the draft flags, and the authenticated profiles and accounts reads succeed.
// It only reads. It never posts, drafts or uploads anything, and it never writes a key.
//
// A bot calls its Zernio tools itself and saves what it saw, then this script checks it:
//   node connection.mjs --tools live-tools.json --profiles profiles.json --accounts accounts.json \
//     --out marketing/zernio/connection.json
// Decide the startup message (prints the decision and marks the one message as sent):
//   node connection.mjs --out marketing/zernio/connection.json --startup site-only|marketing|distribution
// Record the owner's pick:
//   node connection.mjs --out marketing/zernio/connection.json --select-profile <id> --select-account <id> \
//     --quote "<owner's exact words>" --at <ISO time>
// Saved files are the raw tool results (MCP { content | structuredContent } or plain JSON).
// A file holding { "error": "<message>" } records a failed call.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonical, sha256 } from "../bundle/approval-hash.mjs";
import { isAuthFailure, readOnlyClient, readResult, resolveTools, restToolClient, ToolGuardError, ZERNIO_MCP_URL } from "./tool-client.mjs";

export const CONNECTION_SCHEMA = "studio-zernio-connection/1";
export const STATUSES = ["connected", "no-accounts", "needs-sign-in", "not-connected", "schema-changed"];

const idOf = v => (v && typeof v === "object" ? v._id ?? v.id : v) ?? null;
const listOf = (data, key) => (Array.isArray(data) ? data : data?.[key] ?? data?.data ?? []);
const LINE = /^\s*[-*]\s*(.+?)\s*\(ID:\s*([A-Za-z0-9_-]+)\)/;

export function parseProfiles(res) {
  const { data, text } = readResult(res);
  if (data) return listOf(data, "profiles").map(p => ({ id: idOf(p), name: p.name ?? null }));
  return text.split("\n").map(l => LINE.exec(l)).filter(Boolean).map(m => ({ id: m[2], name: m[1] }));
}

export function parseAccounts(res) {
  const { data, text } = readResult(res);
  if (data) return listOf(data, "accounts").map(a => ({
    id: idOf(a),
    platform: a.platform ?? null,
    handle: a.username ?? a.handle ?? a.displayName ?? a.name ?? null,
    profileId: idOf(a.profileId ?? a.profile_id ?? a.profile),
  }));
  if (/no accounts connected/i.test(text)) return [];
  return text.split("\n").map(l => LINE.exec(l)).filter(Boolean).map(m => {
    const [platform, ...rest] = m[1].split(":");
    return { id: m[2], platform: rest.length ? platform.trim().toLowerCase() : null, handle: (rest.length ? rest.join(":") : m[1]).trim(), profileId: null };
  });
}

const STEP = {
  "connected": "Ready. Show the owner the profiles and accounts and let them pick one destination.",
  "no-accounts": "Signed in, but no social account is connected. Ask the owner to connect one in Zernio, then check again on their next message.",
  "needs-sign-in": "Sign-in is missing or expired. Start the Zernio sign-in for the owner (remove and re-add the connection if it was cached), then check again on their next message.",
  "not-connected": "Zernio is not connected to this bot. Guide the owner through one OAuth sign-in, then check again on their next message.",
  "schema-changed": "The live Zernio tools changed. Stop delivery, report the real tool list, and do not guess fields.",
};

function record(status, extra = {}, now) {
  return {
    schema: CONNECTION_SCHEMA,
    status,
    checkedAt: now().toISOString(),
    endpoint: ZERNIO_MCP_URL,
    blocks: status === "connected" ? "nothing" : "delivery only: site, static, video and review work continue",
    nextStep: STEP[status],
    ...extra,
  };
}

// Tool-client replay of what the bot saw. Any call it did not save is refused.
export function recordedClient({ tools, results, source = "mcp-recorded" }) {
  return {
    source,
    async listTools() { return tools; },
    async callTool(name) {
      if (!(name in results)) throw new ToolGuardError(`${name} was not called by the bot; call it and save its result`);
      const r = results[name];
      if (r && typeof r === "object" && "error" in r && Object.keys(r).length === 1) throw new Error(String(r.error));
      return r;
    },
  };
}

// scopeAccountsByProfile: when the accounts tool takes a profile argument, read accounts once
// per profile so each account carries its profile. A replayed single accounts read cannot.
export async function checkZernioConnection({ client, now = () => new Date(), scopeAccountsByProfile = true } = {}) {
  if (!client) return record("not-connected", {}, now);
  const liveTools = await client.listTools();
  let tools;
  try { tools = resolveTools(liveTools); } catch (e) {
    return record(/no Zernio accounts tool/.test(e.message) ? "not-connected" : "schema-changed", { problem: e.message }, now);
  }
  const ro = readOnlyClient(client, liveTools, tools.prefix);
  const toolsInfo = {
    prefix: tools.prefix, profiles: tools.profiles, accounts: tools.accounts, getPost: tools.getPost,
    createPost: tools.createPost, dialect: tools.dialect, getPostArg: tools.getPostArg,
    schemaSha256: sha256(canonical(liveTools)),
    createPostSchema: liveTools.find(t => t.name === tools.createPost).inputSchema,
  };
  let profiles, accounts;
  try {
    profiles = parseProfiles(await ro.callTool(tools.profiles));
    if (scopeAccountsByProfile && tools.accountsProfileArg && profiles.length) {
      accounts = [];
      for (const p of profiles) {
        for (const a of parseAccounts(await ro.callTool(tools.accounts, { [tools.accountsProfileArg]: p.id }))) accounts.push({ ...a, profileId: a.profileId ?? p.id });
      }
    } else {
      accounts = parseAccounts(await ro.callTool(tools.accounts));
      if (profiles.length === 1) accounts = accounts.map(a => ({ ...a, profileId: a.profileId ?? profiles[0].id }));
    }
  } catch (e) {
    if (e instanceof ToolGuardError) throw e;
    return record(isAuthFailure(e) ? "needs-sign-in" : "not-connected", { tools: toolsInfo, problem: e.message.slice(0, 300) }, now);
  }
  const authVerifiedBy = [tools.profiles, tools.accounts];
  if (!accounts.length) return record("no-accounts", { tools: toolsInfo, authVerifiedBy, profiles, accounts }, now);
  return record("connected", { source: client.source ?? "mcp", tools: toolsInfo, authVerifiedBy, profiles, accounts, selected: null }, now);
}

// The owner picks one destination. Its IDs must be in the checked connection.
export function selectDestination(connection, { profileId, accountId, quote, at }) {
  if (connection?.schema !== CONNECTION_SCHEMA || connection.status !== "connected") throw new Error("select a destination only from a connected Zernio check");
  const profile = connection.profiles.find(p => p.id === profileId);
  const account = connection.accounts.find(a => a.id === accountId);
  if (!profile) throw new Error(`profile ${profileId} is not in the checked Zernio profiles`);
  if (!account) throw new Error(`account ${accountId} is not in the checked Zernio accounts`);
  if (account.profileId !== profileId) throw new Error(`account ${accountId} belongs to profile ${account.profileId}, not ${profileId}`);
  if (typeof quote !== "string" || !quote.trim() || Number.isNaN(Date.parse(at ?? ""))) throw new Error("record the owner's exact words and the time they chose the destination");
  return { ...connection, selected: { profileId, profileName: profile.name, accountId, platform: account.platform, handle: account.handle, by: "owner", quote, at } };
}

export const ZERNIO_OWNER_TEXT = "We can prepare your site and creative now. To send them later, connect Zernio. I will open sign-in if needed. Do not paste a key here.";
export const NO_ACCOUNT_TEXT = "Zernio is signed in, but no social account is connected yet. Connect one in Zernio and I will check again.";
export const SCOPES = ["site-only", "marketing", "distribution"];
export const DELIVERY_ACTIONS = ["upload", "draft", "schedule", "publish"];

// Startup is silent unless marketing or distribution is in scope and Zernio is not ready.
// Then the owner gets one short message, once; later checks stay silent. A missing
// connection blocks only DELIVERY_ACTIONS, never site or creative work.
export function startupDecision({ connection, scope }) {
  if (!SCOPES.includes(scope)) throw new Error(`scope must be one of ${SCOPES.join(", ")}`);
  const status = connection?.schema === CONNECTION_SCHEMA ? connection.status : "not-connected";
  const inScope = scope !== "site-only";
  const base = { scope, status, blocks: status === "connected" ? [] : DELIVERY_ACTIONS, continues: ["site", "static", "video", "review"] };
  if (status === "connected") return { ...base, prompt: false, ownerMessage: null, reason: "reuse the working connection silently" };
  if (!inScope) return { ...base, prompt: false, ownerMessage: null, reason: "site-only: intake is not interrupted; check again if marketing or distribution is added" };
  if (status === "schema-changed") return { ...base, prompt: false, ownerMessage: null, reason: "report the changed tool list to the PM; nothing for the owner to do" };
  if (connection?.startup?.prompted) return { ...base, prompt: false, ownerMessage: null, reason: "the owner already had the one startup message; check again on their next message" };
  return { ...base, prompt: true, ownerMessage: status === "no-accounts" ? NO_ACCOUNT_TEXT : ZERNIO_OWNER_TEXT, reason: "marketing or distribution is in scope and Zernio is not ready" };
}

const readJson = f => JSON.parse(fs.readFileSync(f, "utf8"));
const readSaved = f => { const t = fs.readFileSync(f, "utf8"); try { return JSON.parse(t); } catch { return { content: [{ type: "text", text: t }] }; } };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = k => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : undefined; };
  try {
    if (!a("--out")) throw new Error("--out is required");
    if (a("--startup")) {
      const conn = fs.existsSync(a("--out")) ? readJson(a("--out")) : null;
      const d = startupDecision({ connection: conn, scope: a("--startup") });
      if (conn) fs.writeFileSync(a("--out"), JSON.stringify({ ...conn, startup: { scope: d.scope, prompted: Boolean(conn.startup?.prompted || d.prompt), at: new Date().toISOString() } }, null, 2) + "\n");
      console.log(JSON.stringify(d, null, 2));
      process.exit(0);
    }
    if (a("--select-account")) {
      const picked = selectDestination(readJson(a("--out")), { profileId: a("--select-profile"), accountId: a("--select-account"), quote: a("--quote"), at: a("--at") });
      fs.writeFileSync(a("--out"), JSON.stringify(picked, null, 2) + "\n");
      const s = picked.selected;
      console.log(`Destination: ${s.platform} ${s.handle} (${s.accountId}), profile ${s.profileName} (${s.profileId})`);
      process.exit(0);
    }
    let client = null;
    if (a("--tools")) {
      const tools = readJson(a("--tools"));
      const live = Array.isArray(tools) ? tools : tools.tools;
      const t = (() => { try { return resolveTools(live); } catch { return null; } })();
      const results = {};
      if (t && a("--profiles")) results[t.profiles] = readSaved(a("--profiles"));
      if (t && a("--accounts")) results[t.accounts] = readSaved(a("--accounts"));
      client = recordedClient({ tools: live, results });
    } else if (process.env.ZERNIO_API_KEY) {
      client = restToolClient({ apiKey: process.env.ZERNIO_API_KEY });
    }
    const out = await checkZernioConnection({ client, scopeAccountsByProfile: !a("--tools") });
    fs.mkdirSync(path.dirname(path.resolve(a("--out"))), { recursive: true });
    const startup = fs.existsSync(a("--out")) ? readJson(a("--out")).startup : undefined;
    fs.writeFileSync(a("--out"), JSON.stringify(startup ? { ...out, startup } : out, null, 2) + "\n");
    console.log(`Zernio ${out.status}: ${out.nextStep}`);
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
