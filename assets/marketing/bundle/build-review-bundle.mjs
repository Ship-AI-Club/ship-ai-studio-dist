// Builds the one versioned review bundle the owner sees: exact media hashes, captions,
// links, destinations, action and schedule. bundleSha256 is the approval hash from
// approval-hash.mjs, so any edit to a bound field produces a new hash and resets approval.
//
// Usage: node build-review-bundle.mjs --spec bundle-spec.json --root <dir media paths resolve from>
//          --destinations marketing/zernio/destinations.json --out <dir>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ACTIONS, approvalHash, canonical, sha256 } from "./approval-hash.mjs";
import { assertDestinationResolved } from "../zernio/resolve-destinations.mjs";
import { previewDraftRequest } from "../zernio/zernio-draft.mjs";

export const BUNDLE_SCHEMA = "studio-review-bundle/1";
export { ACTIONS };

function validTimeZone(tz) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return typeof tz === "string" && tz.length > 0; } catch { return false; }
}

export function validateSpec(spec) {
  const p = [];
  if (spec?.schema !== BUNDLE_SCHEMA) p.push(`schema must be "${BUNDLE_SCHEMA}"`);
  if (!spec?.project || !spec?.version) p.push("project and version are required");
  if (!Array.isArray(spec?.items) || !spec.items.length) p.push("items[] is required");
  for (const [i, it] of (spec?.items ?? []).entries()) {
    const at = `items[${i}]`;
    if (!it.id) p.push(`${at}.id is required`);
    if (!Array.isArray(it.media) || !it.media.length) p.push(`${at}.media[] is required`);
    for (const m of it.media ?? []) {
      if (!m.path || !["image", "video"].includes(m.type)) p.push(`${at}.media needs path and type image|video`);
      if (!/^https:\/\//.test(m.url ?? "")) p.push(`${at}.media ${m.path} needs its cloud artifact https URL`);
    }
    if (typeof it.caption !== "string" || !it.caption.trim()) p.push(`${at}.caption is required (exact text and line breaks)`);
    if (!Array.isArray(it.links)) p.push(`${at}.links[] is required (may be empty)`);
    if (!Array.isArray(it.authors) || !it.authors.length) p.push(`${at}.authors[] is required: who wrote each part (for example { "part": "caption", "role": "social-media-manager" })`);
    if (!ACTIONS.includes(it.action)) p.push(`${at}.action must be one of ${ACTIONS.join(", ")}`);
    if (it.action === "schedule") {
      if (!it.schedule || Number.isNaN(Date.parse(it.schedule.at ?? "")) || !validTimeZone(it.schedule.timezone)) p.push(`${at}.schedule needs { at: ISO time, timezone: IANA name } when action is schedule`);
    } else if (it.schedule !== null) p.push(`${at}.schedule must be null unless action is schedule ("drafts only, no schedule")`);
    const d = it.destination;
    if (it.action !== "none" && (!d?.platform || !d?.accountId || !d?.profileId)) p.push(`${at}.destination needs platform, accountId and profileId from the read-only destinations snapshot`);
  }
  if (p.length) throw new Error(`Bundle spec is not usable:\n- ${p.join("\n- ")}`);
  return spec;
}

export function buildBundle(spec, root, destinations) {
  validateSpec(spec);
  const external = spec.items.filter(it => it.action !== "none");
  if (external.length && !destinations) throw new Error("A destinations snapshot from resolve-destinations.mjs is required before any item names an action; destinations are never invented");
  const items = spec.items.map(it => {
    const resolved = it.action === "none" ? null : assertDestinationResolved(it.destination, destinations);
    return {
      id: it.id,
      media: it.media.map(m => {
        const abs = path.resolve(root, m.path);
        if (!fs.existsSync(abs)) throw new Error(`Media ${m.path} not found under ${root}`);
        const bytes = fs.readFileSync(abs);
        return { path: m.path, url: m.url, type: m.type, bytes: bytes.length, sha256: sha256(bytes) };
      }),
      caption: it.caption,
      links: it.links,
      authors: it.authors,
      destination: resolved
        ? { platform: it.destination.platform, accountId: it.destination.accountId, accountName: resolved.account.name, handle: resolved.account.handle ?? resolved.account.name, profileId: it.destination.profileId, profileName: resolved.profile.name }
        : null,
      action: it.action,
      schedule: it.schedule ? { at: it.schedule.at, timezone: it.schedule.timezone } : null,
    };
  });
  const body = {
    schema: BUNDLE_SCHEMA,
    project: spec.project,
    version: spec.version,
    status: "DRAFT - NOT OWNER APPROVED",
    destinationsResolvedAt: destinations?.resolvedAt ?? null,
    destinationsSha256: destinations ? sha256(canonical(destinations)) : null,
    zernioTools: destinations?.tools ?? null,
    items,
  };
  return { ...body, bundleSha256: approvalHash(body) };
}

export function writeBundle(bundle, out) {
  fs.mkdirSync(path.join(out, "outbox"), { recursive: true });
  fs.writeFileSync(path.join(out, "bundle.json"), JSON.stringify(bundle, null, 2) + "\n");
  for (const it of bundle.items.filter(i => i.action === "draft")) {
    const call = { is_draft: true, publish_now: false, account_id: it.destination.accountId, profile_id: it.destination.profileId, platform: it.destination.platform, item_id: it.id, bundle_sha256: bundle.bundleSha256 };
    fs.writeFileSync(path.join(out, "outbox", `${it.id}.zernio-draft.NOT-SENT.json`), JSON.stringify(previewDraftRequest(bundle, call), null, 2) + "\n");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = k => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : undefined; };
  try {
    for (const k of ["--spec", "--root", "--out"]) if (!a(k)) throw new Error(`${k} is required`);
    const destinations = a("--destinations") ? JSON.parse(fs.readFileSync(a("--destinations"), "utf8")) : null;
    const bundle = buildBundle(JSON.parse(fs.readFileSync(a("--spec"), "utf8")), path.resolve(a("--root")), destinations);
    writeBundle(bundle, path.resolve(a("--out")));
    console.log(`bundle ${bundle.version} sha256=${bundle.bundleSha256} (DRAFT, NOT SENT)`);
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
