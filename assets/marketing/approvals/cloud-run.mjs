// Checks gate-evidence/<asset>/run.json: one Cloud run per creative asset, and every revision
// is a targeted follow-up to that same run. A new launch needs a recorded reason.
// Usage: node cloud-run.mjs <gate-evidence/<asset>/run.json>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RUN_SCHEMA = "studio-cloud-run/1";
export const MAX_CORRECTIONS = 8;
export const RELAUNCH_REASONS = ["run-cannot-accept-follow-ups", "new-creative-project"];

const isText = v => typeof v === "string" && v.trim().length > 0;

export function checkRunLog(run) {
  const p = [];
  if (run?.schema !== RUN_SCHEMA) p.push(`schema must be "${RUN_SCHEMA}"`);
  if (!isText(run?.asset)) p.push("asset is required");
  if (!isText(run?.agentId)) p.push("agentId of the launched Cloud run is required");
  if (!/^https:\/\//.test(run?.runUrl ?? "")) p.push("runUrl must be the Cloud run's https URL");
  if (!isText(run?.briefSha256) || !/^[0-9a-f]{64}$/.test(run.briefSha256)) p.push("briefSha256 of the checked creative brief the run was launched with is required");
  const relaunches = Array.isArray(run?.relaunches) ? run.relaunches : [];
  for (const r of relaunches) {
    if (!isText(r?.agentId) || !isText(r?.beforeVersion) || !RELAUNCH_REASONS.includes(r?.reason) || !isText(r?.note)) {
      p.push(`relaunch ${JSON.stringify(r)} needs {agentId, beforeVersion, reason (${RELAUNCH_REASONS.join(" | ")}), note}`);
    }
  }
  const versions = Array.isArray(run?.versions) ? run.versions : [];
  if (!versions.length) p.push("versions[] is required");
  let agent = run?.agentId;
  const seen = new Set();
  versions.forEach((v, i) => {
    const at = `versions[${i}] (${v?.version})`;
    if (!isText(v?.version) || seen.has(v.version)) p.push(`${at}: each version needs a unique name`);
    seen.add(v?.version);
    if (!isText(v?.at)) p.push(`${at}: at is required`);
    const relaunch = relaunches.find(r => r.beforeVersion === v?.version);
    if (i === 0) {
      if (v?.via !== "launch" || v?.agentId !== run?.agentId) p.push(`${at}: the first version comes from the launch of ${run?.agentId}`);
      return;
    }
    if (v?.via === "launch") {
      if (!relaunch) p.push(`${at}: a new launch for an iteration; revise as a follow-up in run ${agent}, or record why that run cannot accept follow-ups`);
      else if (v.agentId !== relaunch.agentId) p.push(`${at}: launched in ${v.agentId}, but the relaunch record names ${relaunch.agentId}`);
      else agent = relaunch.agentId;
    } else if (v?.via !== "follow-up") p.push(`${at}: via must be "launch" or "follow-up"`);
    else if (v.agentId !== agent) p.push(`${at}: follow-up went to ${v.agentId}, not the same run ${agent}`);
    const c = v?.corrections;
    if (!Array.isArray(c) || !c.length || !c.every(isText)) p.push(`${at}: a revision names its targeted corrections`);
    else if (c.length > MAX_CORRECTIONS) p.push(`${at}: ${c.length} corrections; a revision is targeted (at most ${MAX_CORRECTIONS}). Rewrite the brief instead`);
  });
  if (p.length) throw new Error(`Cloud run log is not valid:\n- ${p.join("\n- ")}`);
  return { agentId: agent, versions: versions.map(v => v.version) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const f = process.argv[2];
    if (!f) throw new Error("usage: node cloud-run.mjs <gate-evidence/<asset>/run.json>");
    console.log(JSON.stringify(checkRunLog(JSON.parse(fs.readFileSync(f, "utf8")))));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
