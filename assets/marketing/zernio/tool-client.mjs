// Zernio is reached through a tool client: { listTools(), callTool(name, args, opts) }.
// A connected MCP fits this shape directly. restToolClient adapts the REST API to it.
// Tool names are never fixed here: resolveTools reads the live list, accepts the hosted
// MCP names (profiles_list, accounts_list, posts_get, posts_create) or the REST adapter
// names, and allows one connector prefix in front of all of them.

export const ZERNIO_API = "https://zernio.com/api/v1";
export const ZERNIO_MCP_URL = "https://mcp.zernio.com/mcp";

export const TOOL_ROLES = Object.freeze({
  profiles: ["profiles_list", "list_profiles"],
  accounts: ["accounts_list", "list_accounts"],
  getPost: ["posts_get", "get_post"],
  createPost: ["posts_create", "create_post"],
});

// Draft flags per create-post schema. "mcp" is the hosted core tool; "rest" is POST /v1/posts.
export const DIALECTS = Object.freeze({
  mcp: ["content", "platform", "account_id", "is_draft", "publish_now"],
  rest: ["content", "platforms", "isDraft", "publishNow"],
});

const READ_VERB = /(^|_)(list|get|read|search|describe|fetch|check)(_|$)/;
const WRITE_VERB = /(^|_)(create|update|delete|publish|retry|cross|upload|generate|send|schedule|pause|resume|call|connect|disconnect)(_|$)/;

export class ToolGuardError extends Error {
  constructor(reason) { super(`Zernio tool refused: ${reason}`); this.name = "ToolGuardError"; }
}

function baseName(name, prefix) {
  return prefix && name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

// Finds each role's tool in the live list. Exactly one prefix may sit in front of every
// name (a connector can add one); an ambiguous or partial match is a refusal.
export function resolveTools(liveTools) {
  const names = liveTools.map(t => t.name);
  const matches = [];
  for (const candidate of TOOL_ROLES.accounts) for (const n of names) {
    if (n === candidate || (n.endsWith(candidate) && /[_.:/-]$/.test(n.slice(0, -candidate.length)))) matches.push({ prefix: n.slice(0, -candidate.length), candidate });
  }
  if (!matches.length) throw new ToolGuardError("the live tool list has no Zernio accounts tool; Zernio is not connected to this bot");
  const prefixes = [...new Set(matches.map(m => m.prefix))];
  if (prefixes.length > 1) throw new ToolGuardError(`more than one Zernio connection is live (${prefixes.map(p => p || "no prefix").join(", ")}); keep one and stop`);
  const prefix = prefixes[0];
  const byName = new Map(liveTools.map(t => [t.name, t]));
  const tools = { prefix };
  for (const [role, candidates] of Object.entries(TOOL_ROLES)) {
    const found = candidates.map(c => prefix + c).filter(n => byName.has(n));
    if (!found.length) throw new ToolGuardError(`the live Zernio tools have no ${candidates[0]} (prefix "${prefix}"); stop and report the real tool list`);
    tools[role] = found[0];
  }
  const create = byName.get(tools.createPost);
  const props = create.inputSchema?.properties ?? {};
  const dialect = Object.entries(DIALECTS).find(([, keys]) => keys.every(k => k in props))?.[0];
  if (!dialect) throw new ToolGuardError(`live ${tools.createPost} schema has no draft flags (${DIALECTS.mcp.join(", ")} or ${DIALECTS.rest.join(", ")}); the draft guard cannot be applied, so stop and report it`);
  tools.dialect = dialect;
  tools.getPostArg = "post_id" in (byName.get(tools.getPost).inputSchema?.properties ?? {}) ? "post_id" : "postId";
  tools.accountsProfileArg = ["profile_id", "profileId"].find(k => k in (byName.get(tools.accounts).inputSchema?.properties ?? {})) ?? null;
  return tools;
}

export function isReadTool(descriptor, prefix = "") {
  if (!descriptor) return false;
  if (descriptor.annotations?.readOnlyHint === false) return false;
  const base = baseName(descriptor.name, prefix);
  if (WRITE_VERB.test(base)) return false;
  return descriptor.annotations?.readOnlyHint === true || READ_VERB.test(base);
}

// Wraps a client so that only read tools named in the live tool list can be called.
export function readOnlyClient(client, liveTools, prefix = "") {
  const byName = new Map(liveTools.map(t => [t.name, t]));
  return {
    async callTool(name, args = {}) {
      const d = byName.get(name);
      if (!d) throw new ToolGuardError(`${name} is not in the live tool list`);
      if (!isReadTool(d, prefix)) throw new ToolGuardError(`${name} is not a read-only tool; nothing is written before the owner approves the exact bundle hash`);
      return client.callTool(name, args);
    },
  };
}

// MCP tool results arrive as { structuredContent } or { content: [{ type: "text", text }] };
// the REST adapter returns plain JSON. Returns { data, text }.
export function readResult(res) {
  if (res?.isError) {
    const text = (res.content ?? []).map(c => c.text ?? "").join("\n");
    throw new Error(`Zernio tool error: ${text || "no detail"}`);
  }
  if (res?.structuredContent) return { data: res.structuredContent, text: "" };
  if (Array.isArray(res?.content)) {
    const text = res.content.filter(c => c.type === "text").map(c => c.text).join("\n");
    try { return { data: JSON.parse(text), text }; } catch { return { data: null, text }; }
  }
  return { data: res ?? null, text: "" };
}

export const isAuthFailure = e => /\b401\b|\b403\b|unauthori[sz]ed|forbidden|invalid[_ ]token|sign[- ]?in|authenticat|oauth/i.test(e?.message ?? String(e));

const REST_TOOLS = [
  { name: "list_profiles", method: "GET", path: () => "/profiles", annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {} } },
  { name: "list_accounts", method: "GET", path: a => (a.profileId ? `/accounts?profileId=${encodeURIComponent(a.profileId)}` : "/accounts"), annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: { profileId: { type: "string" } } } },
  { name: "get_post", method: "GET", path: a => `/posts/${encodeURIComponent(a.postId)}`, annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: { postId: { type: "string" } }, required: ["postId"] } },
  { name: "create_post", method: "POST", path: () => "/posts", annotations: { readOnlyHint: false },
    inputSchema: { type: "object", properties: { content: { type: "string" }, isDraft: { type: "boolean" }, publishNow: { type: "boolean" }, platforms: { type: "array" }, mediaItems: { type: "array" } }, required: ["content", "platforms"] } },
];

// API-key fallback for runs without a connected MCP. The key comes from a secret in the
// service environment (ZERNIO_API_KEY), never from chat, a template, a log or source.
export function restToolClient({ fetchImpl = globalThis.fetch, apiKey, baseUrl = ZERNIO_API } = {}) {
  if (!apiKey) throw new ToolGuardError("ZERNIO_API_KEY must come from a secret in the service environment, never from chat");
  if (typeof fetchImpl !== "function") throw new ToolGuardError("no fetch implementation");
  return {
    source: "rest-adapter",
    async listTools() { return REST_TOOLS.map(({ name, annotations, inputSchema }) => ({ name, annotations, inputSchema })); },
    async callTool(name, args = {}, opts = {}) {
      const t = REST_TOOLS.find(x => x.name === name);
      if (!t) throw new ToolGuardError(`unknown tool ${name}`);
      const headers = { Authorization: `Bearer ${apiKey}` };
      const init = { method: t.method, headers };
      if (t.method !== "GET") {
        headers["Content-Type"] = "application/json";
        if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
        init.body = JSON.stringify(args);
      }
      const res = await fetchImpl(`${baseUrl}${t.path(args)}`, init);
      const json = await res.json();
      if (res.status < 200 || res.status >= 300) throw new Error(`Zernio ${name} failed (HTTP ${res.status})`);
      return json;
    },
  };
}
