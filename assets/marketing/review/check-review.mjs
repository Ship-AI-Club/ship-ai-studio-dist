// Validates an independent review record before anything reaches the owner.
// Copy is judged against the business's approved voice and audience vocabulary.
// Owner-language rules govern owner and interface text only; they are not copy criteria here.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REVIEW_SCHEMA = "studio-review/1";

export const CRITERIA = {
  "offer-cta": ["offer-clarity", "cta-match", "proof", "voice-and-audience", "truthful-claims"],
  "site-pages": ["composition", "branding", "typography", "copy-density", "proof", "cta-match", "voice-and-audience", "truthful-claims"],
  creative: ["concept-fit", "composition", "branding", "typography", "copy-density", "proof", "cta-match", "voice-and-audience", "truthful-claims", "caption-claims", "rights", "safe-zones"],
};

export const MEDIA = ["static", "video", "bundle"];

export const CRITERIA_HELP = {
  "offer-clarity": "A visitor can say what is offered, for whom, and what happens next.",
  "cta-match": "The CTA matches the approved brief and the destination keeps its promise.",
  proof: "Proof is real and sourced; weak or missing proof is flagged, never invented.",
  "voice-and-audience": "Copy follows the approved brand voice and the audience's own vocabulary from the brief, positioning and design contract.",
  "truthful-claims": "No invented reviews, results, prices, guarantees or conversion claims without measured data.",
  composition: "One clear focal point and hierarchy; no weak or default-starter composition.",
  branding: "Specific to this business; not generic branding.",
  typography: "Type follows the design contract; no poor sizing, fallback faces or awkward breaks.",
  "copy-density": "Copy is not dense; each frame or section carries one idea.",
  rights: "Every image, font and audio file is licensed or original and listed in SOURCES.md.",
  "safe-zones": "Text and marks sit inside the platform safe zones at the delivered size.",
  "concept-fit": "One strong concept specific to this business, its audience and offer; not a palette-swapped default card or a forced template sequence.",
  "caption-claims": "Caption, alt, on-image and on-screen text match the brief and CTA; every claim is sourced; nothing claims measured conversion or performance.",
};

const LAYOUT_QUESTION = /layout|spacing|padding|margin|alignment|column|grid|font size|button (size|color|placement)|which (version|option) looks/i;

export function checkReview(r) {
  const p = [];
  if (r?.schema !== REVIEW_SCHEMA) p.push(`schema must be "${REVIEW_SCHEMA}"`);
  const list = CRITERIA[r?.kind];
  if (!list) p.push(`kind must be one of ${Object.keys(CRITERIA).join(", ")}`);
  if (!r?.reviewer?.role || !r?.author?.role) p.push("reviewer.role and author.role are required");
  else if (r.reviewer.role === r.author.role) p.push("the reviewer must be independent of the author");
  if (!/^[0-9a-f]{64}$/.test(r?.subject?.sha256 ?? "")) p.push("subject.sha256 of the reviewed version is required");
  if (typeof r?.voiceSource !== "string" || !r.voiceSource.trim()) p.push("voiceSource is required: the approved brief, positioning or design contract the copy was checked against");
  if (r?.kind === "site-pages" || r?.kind === "creative") {
    const shots = r?.screenshots ?? [];
    const need = r.kind === "site-pages" ? ["desktop", "phone"] : ["actual-size", "phone"];
    for (const v of need) {
      const s = shots.find(x => x.viewport === v);
      if (!s) p.push(`a ${v} render of the actual output is required`);
      else if (!/^https:\/\//.test(s.url ?? "") || !/^[0-9a-f]{64}$/.test(s.sha256 ?? "")) p.push(`${v} render needs a cloud artifact URL and sha256`);
    }
    const actual = shots.find(x => x.viewport === "actual-size");
    if (r.kind === "creative" && actual && !(actual.width > 0 && actual.height > 0)) p.push("the actual-size review records the delivered width and height it was viewed at");
  }
  if (r?.kind === "creative") {
    if (!MEDIA.includes(r?.subject?.medium)) p.push(`subject.medium must be one of ${MEDIA.join(", ")}`);
    if (r?.subject?.medium === "video") {
      const pb = r.playback;
      if (pb?.fullDecode !== true || !(pb?.durationSec > 0) || !(pb?.frames > 0)) p.push("a video review needs the playback evidence: full decode, duration and frames");
      else if (!(pb.watchedSec >= pb.durationSec)) p.push("the reviewer watches the full video with sound settings as delivered (playback.watchedSec >= durationSec)");
      if (!/^https:\/\//.test(pb?.contactSheetUrl ?? "")) p.push("a video review needs the contact sheet as a cloud artifact URL");
    }
  }
  const failed = [];
  for (const c of list ?? []) {
    const v = r?.criteria?.[c];
    if (typeof v?.pass !== "boolean" || typeof v?.note !== "string" || !v.note.trim()) p.push(`criteria.${c} needs pass and a specific note`);
    else if (!v.pass) failed.push(c);
  }
  const expected = failed.length ? "REJECT" : "PASS";
  if (r?.verdict !== expected) p.push(`verdict must be ${expected}${failed.length ? ` (failed: ${failed.join(", ")})` : ""}`);
  if (expected === "REJECT" && !(Array.isArray(r?.corrections) && r.corrections.length && r.corrections.every(x => x?.criterion && x?.fix))) {
    p.push("a REJECT needs specific corrections ({criterion, fix}) sent back internally");
  }
  for (const q of r?.ownerQuestions ?? []) {
    if (q?.type !== "business-decision" || LAYOUT_QUESTION.test(q?.text ?? "")) p.push(`owner question "${q?.text}" is a routine layout decision; settle it internally`);
  }
  if (p.length) throw new Error(`Review record is not valid:\n- ${p.join("\n- ")}`);
  return { verdict: r.verdict, ownerVisible: r.verdict === "PASS", failed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const f = process.argv[2];
    if (!f) throw new Error("usage: node check-review.mjs <review.json>");
    console.log(JSON.stringify(checkReview(JSON.parse(fs.readFileSync(f, "utf8")))));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
