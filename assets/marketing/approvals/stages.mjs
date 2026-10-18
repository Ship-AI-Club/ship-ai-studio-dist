// Marketing stage gates. Order is fixed. Owner gates need a real owner approval bound
// to the exact artifact hash; nothing here can mark a draft as owner-approved.
import { checkRunLog } from "./cloud-run.mjs";

export const STAGES = [
  { id: "offer-cta-review", gate: "internal", note: "Marketing reviews the offer and CTA before the first site build" },
  { id: "static-draft", gate: "work", note: "Checked creative brief, then one Cloud run with targeted same-run revisions" },
  { id: "static-internal-review", gate: "internal", note: "Actual-size and phone review, caption and claims" },
  { id: "static-owner-review", gate: "owner", note: "Owner feedback and revision until the exact file is approved" },
  { id: "video-direction", gate: "work", note: "Checked creative brief: concept, sourced research note and shot-by-shot storyboard" },
  { id: "storyboard-owner-review", gate: "owner" },
  { id: "video-cloud-render", gate: "work", note: "Cloud render with a full playback check" },
  { id: "video-internal-review", gate: "internal" },
  { id: "video-owner-review", gate: "owner" },
  { id: "bundle", gate: "work", note: "Exact destination, caption and assets bundle" },
  { id: "bundle-internal-review", gate: "internal" },
  { id: "bundle-owner-review", gate: "owner", note: "Never deferred" },
];

// Each needs its own exact owner approval; none is a stage that can be advanced into.
export const EXTERNAL_ACTIONS = ["zernio-draft", "schedule", "publish", "campaign", "spend", "meta-write"];

export class GateError extends Error {
  constructor(msg) { super(`Stage gate: ${msg}`); this.name = "GateError"; }
}

const HASH = /^[0-9a-f]{64}$/;

// mode "staged": owner sees each owner gate. mode "complete-bundle": the brief asked for one
// complete draft bundle, so intermediate owner gates are deferred (never approved) and the
// owner sees one final bundle. holdBeforeNext: the owner said "show me before the next stage";
// every owner gate is then required even in complete-bundle mode.
export function newState({ mode, holdBeforeNext = false }) {
  if (!["staged", "complete-bundle"].includes(mode)) throw new GateError('mode must be "staged" or "complete-bundle"');
  return { mode, holdBeforeNext: holdBeforeNext === true, done: {} };
}

export function nextStage(state) {
  return STAGES.find(s => !state.done[s.id]) ?? null;
}

function checkOwnerApproval(stage, record) {
  const a = record?.approval;
  if (!a) throw new GateError(`${stage.id} needs the owner's approval`);
  if (a.by !== "owner") throw new GateError(`${stage.id} approval must come from the owner (got "${a.by}")`);
  if (typeof a.quote !== "string" || !a.quote.trim()) throw new GateError(`${stage.id} approval must quote the owner's exact words`);
  if (a.sha256 !== record.sha256) throw new GateError(`${stage.id} approval is for a different file; any edit resets approval`);
}

export function complete(state, stageId, record = {}) {
  const stage = STAGES.find(s => s.id === stageId);
  if (!stage) throw new GateError(`unknown stage ${stageId}`);
  const expected = nextStage(state);
  if (!expected || expected.id !== stageId) throw new GateError(`next stage is ${expected?.id ?? "none"}, not ${stageId}`);
  if (stage.gate !== "owner" || record.deferred !== true) {
    if (!HASH.test(record.sha256 ?? "")) throw new GateError(`${stageId} needs the sha256 of the exact artifact`);
  }
  if (stage.gate === "internal") {
    if (record.review?.verdict !== "PASS") throw new GateError(`${stageId} needs a PASS from an independent reviewer; send corrections back first`);
    if (record.review.subject?.sha256 !== record.sha256) throw new GateError(`${stageId} review is for a different version`);
  }
  if (stageId === "static-draft" || stageId === "video-direction") {
    if (!HASH.test(record.briefSha256 ?? "")) throw new GateError(`${stageId} needs the sha256 of the checked creative brief (brief/creative-brief.mjs)`);
  }
  if (stageId === "static-draft" || stageId === "video-cloud-render") {
    const e = record.evidence;
    try { checkRunLog(e?.runLog); } catch (err) { throw new GateError(`${stageId}: ${err.message}`); }
    const brief = stageId === "static-draft" ? record.briefSha256 : state.done["video-direction"]?.briefSha256;
    if (e.runLog.briefSha256 !== brief) throw new GateError(`${stageId}: the Cloud run was launched with a different creative brief`);
    if (!e?.modelEvidence) throw new GateError(`${stageId} needs the recorded model evidence`);
  }
  if (stageId === "video-cloud-render") {
    const e = record.evidence;
    if (!/^https:\/\//.test(e?.cloudArtifactUrl ?? "")) throw new GateError("video render needs a cloud artifact URL");
    if (e?.playback?.fullDecode !== true || !(e.playback.durationSec > 0) || !(e.playback.frames > 0)) throw new GateError("video render needs a full playback check (full decode, duration, frames)");
  }
  if (stage.gate === "owner") {
    const deferrable = state.mode === "complete-bundle" && !state.holdBeforeNext && stageId !== "bundle-owner-review";
    if (record.deferred === true) {
      if (!deferrable) throw new GateError(`${stageId} cannot be deferred${state.holdBeforeNext ? ": the owner asked to see each stage first" : ""}`);
      state.done[stageId] = { deferred: true, ownerApproved: false };
      return state;
    }
    checkOwnerApproval(stage, record);
    state.done[stageId] = { sha256: record.sha256, ownerApproved: true, approval: record.approval };
    return state;
  }
  state.done[stageId] = { sha256: record.sha256, ownerApproved: false, ...(record.briefSha256 ? { briefSha256: record.briefSha256 } : {}) };
  return state;
}

export function isOwnerApproved(state, stageId) {
  return state.done[stageId]?.ownerApproved === true;
}

// An external action needs its own approval that names the action and the exact hash.
export function assertExternalApproval(state, action, approval, sha256) {
  if (!EXTERNAL_ACTIONS.includes(action)) throw new GateError(`unknown external action ${action}`);
  if (!isOwnerApproved(state, "bundle-owner-review")) throw new GateError(`${action} needs the owner-approved final bundle first`);
  if (approval?.by !== "owner" || approval.action !== action) throw new GateError(`${action} needs the owner's separate approval of that exact action`);
  if (approval.sha256 !== sha256 || state.done["bundle-owner-review"].sha256 !== sha256) throw new GateError(`${action} approval does not match the approved bundle hash`);
  if (typeof approval.quote !== "string" || !approval.quote.trim()) throw new GateError(`${action} approval must quote the owner's exact words`);
  return true;
}
