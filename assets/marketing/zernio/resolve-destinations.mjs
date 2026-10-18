// Read-only step that runs before any bundle names a destination. It builds on the
// connection check (live tools, draft flags, authenticated profiles and accounts) and
// writes a snapshot. The bundle builder accepts only destinations found in that snapshot.
//
// Usage: node resolve-destinations.mjs --connection marketing/zernio/connection.json --out marketing/zernio/destinations.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkZernioConnection, CONNECTION_SCHEMA } from "./connection.mjs";
import { resolveTools, ToolGuardError } from "./tool-client.mjs";

export const DESTINATIONS_SCHEMA = "studio-zernio-destinations/1";

export function assertCreatePostSchema(liveTools) {
  return resolveTools(liveTools);
}

export function destinationsFromConnection(c) {
  if (c?.schema !== CONNECTION_SCHEMA) throw new ToolGuardError(`a "${CONNECTION_SCHEMA}" check from connection.mjs is required`);
  if (c.status !== "connected") throw new ToolGuardError(`Zernio is ${c.status}: ${c.nextStep}`);
  return {
    schema: DESTINATIONS_SCHEMA,
    resolvedAt: c.checkedAt,
    source: c.source ?? "mcp",
    authVerifiedBy: c.authVerifiedBy,
    toolSchemaSha256: c.tools.schemaSha256,
    tools: { prefix: c.tools.prefix, createPost: c.tools.createPost, getPost: c.tools.getPost, dialect: c.tools.dialect, getPostArg: c.tools.getPostArg },
    createPostTool: { name: c.tools.createPost, inputSchema: c.tools.createPostSchema },
    profiles: c.profiles,
    accounts: c.accounts.map(a => ({ ...a, name: a.handle })),
    selected: c.selected ?? null,
  };
}

export async function resolveDestinations({ client, now = () => new Date() }) {
  return destinationsFromConnection(await checkZernioConnection({ client, now }));
}

export function assertDestinationResolved(destination, snapshot) {
  if (snapshot?.schema !== DESTINATIONS_SCHEMA) throw new Error(`destinations snapshot must be "${DESTINATIONS_SCHEMA}" from resolve-destinations.mjs`);
  const d = destination ?? {};
  const profile = snapshot.profiles.find(p => p.id === d.profileId);
  if (!profile) throw new Error(`profile ${d.profileId} is not in the resolved Zernio profiles`);
  const account = snapshot.accounts.find(a => a.id === d.accountId);
  if (!account) throw new Error(`account ${d.accountId} is not in the resolved Zernio accounts`);
  if (account.platform !== d.platform) throw new Error(`account ${d.accountId} is on ${account.platform}, not ${d.platform}`);
  if (account.profileId === null) throw new Error(`account ${d.accountId} has no resolved profile; re-check with the accounts read scoped per profile`);
  if (account.profileId !== d.profileId) throw new Error(`account ${d.accountId} belongs to profile ${account.profileId}, not ${d.profileId}`);
  return { profile, account };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = k => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : undefined; };
  try {
    for (const k of ["--connection", "--out"]) if (!a(k)) throw new Error(`${k} is required`);
    const snapshot = destinationsFromConnection(JSON.parse(fs.readFileSync(a("--connection"), "utf8")));
    fs.mkdirSync(path.dirname(path.resolve(a("--out"))), { recursive: true });
    fs.writeFileSync(a("--out"), JSON.stringify(snapshot, null, 2) + "\n");
    console.log(`${snapshot.profiles.length} profiles, ${snapshot.accounts.length} accounts resolved read-only -> ${a("--out")}`);
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
