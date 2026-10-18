// The owner approves one hash. It binds, for every item: the byte sha256 of every media
// file, the exact caption text, the links, the destination (platform, account ID,
// profile ID), the action, and the schedule time and timezone. Any edit gives a new hash.
//
// Usage: node approval-hash.mjs --bundle bundle.json --root <dir media paths resolve from>
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ACTIONS = ["none", "upload", "draft", "schedule", "publish"];
export const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");

export class ApprovalHashError extends Error {
  constructor(reason) { super(`Approval hash refused: ${reason}`); this.name = "ApprovalHashError"; }
}

export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}

function subject(bundle, mediaSha) {
  return {
    schema: bundle.schema,
    project: bundle.project,
    version: bundle.version,
    items: bundle.items.map(it => ({
      id: it.id,
      media: it.media.map(m => ({ path: m.path, url: m.url, type: m.type, sha256: mediaSha(m) })),
      caption: it.caption,
      links: it.links,
      destination: { platform: it.destination?.platform, accountId: it.destination?.accountId, profileId: it.destination?.profileId },
      action: it.action,
      schedule: it.schedule ? { at: it.schedule.at, timezone: it.schedule.timezone } : null,
    })),
  };
}

// Hash from the sha256 values recorded in the bundle. Used when the bundle is built.
export function approvalHash(bundle) {
  return sha256(canonical(subject(bundle, m => m.sha256)));
}

export const readMediaFromRoot = root => m => fs.readFileSync(path.resolve(root, m.path));

// Hash from the media bytes as they are now. readMedia(media) returns the bytes
// (Buffer or Uint8Array, sync or async). A missing file or a changed byte is a refusal.
export async function recomputeApprovalHash(bundle, readMedia) {
  if (typeof readMedia !== "function") throw new ApprovalHashError("no media reader; the hash must be recomputed from the media bytes");
  const shas = new Map();
  for (const it of bundle.items) for (const m of it.media) {
    let bytes;
    try { bytes = await readMedia(m); } catch (e) { throw new ApprovalHashError(`media ${m.path} could not be read (${e.message})`); }
    if (!bytes?.length) throw new ApprovalHashError(`media ${m.path} is empty or missing`);
    const actual = sha256(bytes);
    if (actual !== m.sha256) throw new ApprovalHashError(`media ${m.path} bytes changed: sha256 ${actual} != bundle ${m.sha256}`);
    shas.set(m, actual);
  }
  return sha256(canonical(subject(bundle, m => shas.get(m))));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = k => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : undefined; };
  try {
    for (const k of ["--bundle", "--root"]) if (!a(k)) throw new Error(`${k} is required`);
    const bundle = JSON.parse(fs.readFileSync(a("--bundle"), "utf8"));
    const hash = await recomputeApprovalHash(bundle, readMediaFromRoot(path.resolve(a("--root"))));
    if (hash !== bundle.bundleSha256) throw new Error(`bundle content changed: recomputed ${hash} != recorded ${bundle.bundleSha256}`);
    console.log(hash);
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
