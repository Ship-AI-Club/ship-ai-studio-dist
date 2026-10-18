// Checks the compact production brief a Static or Video Creator writes before any Cloud run.
// The owner gives basic input; the creator expands it from the shared project files into
// strategy, one privately chosen concept, concise copy, art direction and (for video) research
// and a storyboard. The Cloud creator builds from this file, so nothing is left to coaching.
// Usage: node creative-brief.mjs <creative-brief.json> <brief/project.json> [--catalog <catalog.json>]
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BRIEF_SCHEMA = "studio-creative-brief/1";
export const AWARENESS = ["unaware", "problem-aware", "solution-aware", "product-aware", "most-aware"];
export const APPROACHES = ["renderer-template", "bespoke-still", "custom-scene"];
export const BEATS = ["hook", "message", "proof", "cta"];
export const LIMITS = { headlineWords: 10, bodyWords: 25, ctaWords: 5, captionWords: 80, shotTextWords: 12, hookEndsBySec: 3, maxVideoSec: 60 };

// Conversion or performance language. Nothing in a draft brief has been measured.
const PERFORMANCE = /\b(high[- ]converting|converts?|converted|conversion rate|proven to|proven winner|guaranteed results|best[- ]performing|winning ad|top[- ]performing|performs best)\b/i;
// Claims that need a sourced entry in copy.claims before they can appear in copy.
const CLAIM = /#1\b|\bno\.? ?1\b|\b\d+(\.\d+)?\s?%|\b\d[\d,]*\+?\s+(customers|clients|reviews|families|homes|projects|years|jobs|orders|members)\b|\b(rated|award\w*|certified|licen[cs]ed|insured|guarantee\w*|best|fastest|cheapest)\b/gi;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const isText = v => typeof v === "string" && v.trim().length > 0;
const words = s => (isText(s) ? s.trim().split(/\s+/).length : 0);

export const canonical = v => Array.isArray(v) ? `[${v.map(canonical).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`
  : JSON.stringify(v);
export const briefSha256 = b => crypto.createHash("sha256").update(canonical(b)).digest("hex");

function anchorTarget(s, anchor) {
  const m = /^(offer|positioning|objection|proof|audience-word):?(\d+)?$/.exec(anchor ?? "");
  if (!m) return null;
  const i = Number(m[2] ?? 0);
  if (m[1] === "offer") return s?.offer?.what;
  if (m[1] === "positioning") return s?.positioning;
  if (m[1] === "objection") return s?.objections?.[i]?.objection;
  if (m[1] === "proof") return s?.proof?.[i]?.claim;
  return s?.audience?.words?.[i];
}

function checkStrategy(s, p) {
  if (!isText(s?.positioning)) p.push("strategy.positioning is required (from the approved positioning)");
  if (!isText(s?.audience?.who)) p.push("strategy.audience.who is required");
  if (!AWARENESS.includes(s?.audience?.awareness)) p.push(`strategy.audience.awareness must be one of ${AWARENESS.join(", ")}`);
  if (!Array.isArray(s?.audience?.words) || !s.audience.words.length || !s.audience.words.every(isText)) p.push("strategy.audience.words[] needs the audience's own phrases from the brief");
  if (!isText(s?.offer?.what)) p.push("strategy.offer.what is required");
  if (!Array.isArray(s?.objections) || !s.objections.length || !s.objections.every(o => isText(o?.objection) && isText(o?.answer))) p.push("strategy.objections[] needs at least one {objection, answer}");
  if (!Array.isArray(s?.proof) || !s.proof.every(x => isText(x?.claim) && isText(x?.source))) p.push("strategy.proof[] entries need {claim, source}");
  else if (!s.proof.length && !isText(s?.proofGap)) p.push("with no proof, strategy.proofGap must say what is missing (asked through the PM, never invented)");
  const g = s?.conversionGoal;
  if (!isText(g?.action)) p.push("strategy.conversionGoal.action is required");
  if (!/^https:\/\//.test(g?.destination ?? "")) p.push("strategy.conversionGoal.destination must be the approved https destination");
  if (g?.measurement !== "not-measured" && !(isText(g?.measurement?.metric) && isText(g?.measurement?.source) && DATE.test(g?.measurement?.measuredAt ?? ""))) {
    p.push('strategy.conversionGoal.measurement must be "not-measured" unless real measured data is cited {metric, source, measuredAt}');
  }
}

function checkCopy(b, p) {
  const c = b.copy;
  if (!isText(c?.headline)) p.push("copy.headline is required");
  else if (words(c.headline) > LIMITS.headlineWords) p.push(`copy.headline has ${words(c.headline)} words; keep it to ${LIMITS.headlineWords}`);
  if (c?.body !== undefined && words(c.body) > LIMITS.bodyWords) p.push(`copy.body has ${words(c.body)} words; keep it to ${LIMITS.bodyWords}`);
  if (!isText(c?.cta)) p.push("copy.cta is required");
  else if (words(c.cta) > LIMITS.ctaWords) p.push(`copy.cta has ${words(c.cta)} words; keep it to ${LIMITS.ctaWords}`);
  if (!isText(c?.caption)) p.push("copy.caption is required");
  else if (words(c.caption) > LIMITS.captionWords) p.push(`copy.caption has ${words(c.caption)} words; keep it to ${LIMITS.captionWords}`);
  if (!isText(c?.alt)) p.push("copy.alt is required");
  const claims = Array.isArray(c?.claims) ? c.claims : [];
  if (!claims.every(x => isText(x?.text) && isText(x?.source))) p.push("copy.claims[] entries need {text, source}");
  const shotText = (b.video?.storyboard ?? []).map((s, i) => [`video.storyboard[${i}].onScreenText`, s?.onScreenText]);
  const texts = [["copy.headline", c?.headline], ["copy.body", c?.body], ["copy.cta", c?.cta], ["copy.caption", c?.caption], ...shotText].filter(([, t]) => isText(t));
  for (const [at, t] of texts) {
    if (PERFORMANCE.test(t)) p.push(`${at}: "${t.match(PERFORMANCE)[0]}" is a conversion or performance claim; nothing here is measured`);
    for (const m of t.matchAll(CLAIM)) {
      const covered = claims.some(x => isText(x?.source) && isText(x?.text) && x.text.toLowerCase().includes(m[0].toLowerCase()) && t.toLowerCase().includes(x.text.toLowerCase()));
      if (!covered) p.push(`${at}: "${m[0]}" is a claim; add the exact phrase to copy.claims with its source, or cut it`);
    }
  }
}

function checkConcept(b, p) {
  const k = b.concept;
  for (const f of ["name", "idea", "whyThisBusiness"]) if (!isText(k?.[f])) p.push(`concept.${f} is required`);
  if (!Number.isInteger(k?.alternativesConsidered) || k.alternativesConsidered < 2) p.push("concept.alternativesConsidered: compare at least 2 directions privately, then keep one");
  if (k?.ownerSees !== "one") p.push('concept.ownerSees must be "one": the owner sees the chosen concept, not a menu');
  const anchors = Array.isArray(k?.anchors) ? k.anchors : [];
  if (anchors.length < 2) p.push("concept.anchors[] needs 2+ references to this business's strategy (offer, positioning, objection:<i>, proof:<i>, audience-word:<i>)");
  for (const a of anchors) if (!isText(anchorTarget(b.strategy, a))) p.push(`concept.anchors "${a}" does not point at a strategy item`);
  for (const f of ["idea", "whyThisBusiness"]) if (PERFORMANCE.test(k?.[f] ?? "")) p.push(`concept.${f} predicts performance; describe the idea, not results`);
}

function checkArt(b, p) {
  const a = b.artDirection;
  if (!APPROACHES.includes(a?.approach)) p.push(`artDirection.approach must be one of ${APPROACHES.join(", ")}`);
  for (const f of ["rationale", "composition", "focalPoint", "typography"]) if (!isText(a?.[f])) p.push(`artDirection.${f} is required`);
  if (a?.palette !== "design-tokens") p.push('artDirection.palette must be "design-tokens": color comes from the approved tokens, never a new palette');
  if (a?.approach && a.approach !== "renderer-template" && !isText(a?.scene)) p.push("a bespoke or custom-scene approach needs artDirection.scene (the project scene entry rendered with --scene)");
  if (b.asset?.kind === "static" && a?.approach === "custom-scene") p.push('static uses "bespoke-still" for a custom composition');
  if (b.asset?.kind === "video" && a?.approach === "bespoke-still") p.push('video uses "custom-scene" for custom Remotion scenes');
  if (!Array.isArray(a?.assets) || !a.assets.length || !a.assets.every(x => isText(x?.path) && isText(x?.role) && isText(x?.source) && isText(x?.license))) {
    p.push("artDirection.assets[] needs every asset with {path, role, source, license} (existing site and brand assets first)");
  }
  const sz = a?.safeZonesPct;
  for (const k of ["top", "bottom", "side"]) if (typeof sz?.[k] !== "number" || sz[k] < 0 || sz[k] >= 50) p.push(`artDirection.safeZonesPct.${k} is required (percent, re-verified for the placement)`);
}

function checkVideo(b, p) {
  const v = b.video;
  if (b.asset?.kind !== "video") { if (v !== undefined) p.push("only video briefs carry a video section"); return; }
  if (!v) { p.push("a video brief needs video.research, video.storyboard and video.audio"); return; }
  const r = v.research;
  if (!["observed", "not-accessible"].includes(r?.status)) p.push('video.research.status must be "observed" or "not-accessible"');
  if (!isText(r?.evidenceNote)) p.push("video.research.evidenceNote is required: what was and was not observed, and its limits");
  else if (PERFORMANCE.test(r.evidenceNote)) p.push("video.research.evidenceNote: an observed ad is a reference, not performance evidence");
  if (r?.status === "observed") {
    if (!isText(r.doc)) p.push("observed research needs video.research.doc (the dated Ad Library notes)");
    if (!Array.isArray(r.observed) || !r.observed.length || !r.observed.every(o => /^https:\/\//.test(o?.url ?? "") && DATE.test(o?.startDate ?? "") && DATE.test(o?.observedOn ?? ""))) {
      p.push("observed research needs video.research.observed[] with {url, startDate, observedOn} for each ad actually seen");
    }
    if (!/not (performance|conversion) evidence/i.test(r.evidenceNote ?? "")) p.push('video.research.evidenceNote must say the references are "not performance evidence"');
  }
  if (r?.status === "not-accessible") {
    if ((r.observed ?? []).length) p.push("not-accessible research cannot list observed ads");
    if (!/no live examples reviewed/i.test(r.evidenceNote ?? "")) p.push('when the Ad Library was not accessible, the evidenceNote must say "no live examples reviewed"');
  }
  const shots = Array.isArray(v.storyboard) ? v.storyboard : [];
  if (shots.length < 3) p.push("video.storyboard needs a shot-by-shot table: at least a hook, a message and a CTA shot");
  let end = 0, rank = 0;
  const RANK = { hook: 0, message: 1, proof: 1, cta: 2 };
  shots.forEach((s, i) => {
    const at = `video.storyboard[${i}]`;
    if (!BEATS.includes(s?.beat)) p.push(`${at}.beat must be one of ${BEATS.join(", ")}`);
    else { if (RANK[s.beat] < rank) p.push(`${at}: beats run hook, then message or proof, then CTA`); rank = RANK[s.beat]; }
    if (typeof s?.from !== "number" || typeof s?.to !== "number" || s.to <= s.from) p.push(`${at}.from/to must be seconds with to > from`);
    else { if (Math.abs(s.from - end) > 1e-6) p.push(`${at} starts at ${s.from}s but the previous shot ends at ${end}s`); end = s.to; }
    for (const f of ["visual", "motion", "audio"]) if (!isText(s?.[f])) p.push(`${at}.${f} is required`);
    if (typeof s?.onScreenText !== "string") p.push(`${at}.onScreenText is required ("" for none)`);
    else if (words(s.onScreenText) > LIMITS.shotTextWords) p.push(`${at}.onScreenText has ${words(s.onScreenText)} words; keep it to ${LIMITS.shotTextWords}`);
  });
  if (shots.length) {
    if (shots[0]?.beat !== "hook" || !(shots[0]?.to <= LIMITS.hookEndsBySec)) p.push(`the first shot is the hook and lands by ${LIMITS.hookEndsBySec}s`);
    if (shots.at(-1)?.beat !== "cta") p.push("the last shot is the CTA");
    if (!shots.some(s => s?.beat === "message")) p.push("the storyboard needs a message shot");
  }
  if (v.durationSec !== end) p.push(`video.durationSec must equal the storyboard end (${end}s)`);
  if (end > LIMITS.maxVideoSec) p.push(`the storyboard runs ${end}s; keep short-form video to ${LIMITS.maxVideoSec}s`);
  const au = v.audio;
  if (!["silent", "licensed", "original"].includes(au?.mode)) p.push('video.audio.mode must be "silent", "licensed" or "original"');
  if (au?.mode === "licensed" && !(isText(au.source) && isText(au.license))) p.push("licensed audio needs video.audio.source and video.audio.license");
  if (au?.mode === "original" && !isText(au.source)) p.push("original audio needs video.audio.source (who made it, under what rights)");
  if (v.captionsBurnedIn !== true) p.push("video.captionsBurnedIn must be true so the ad reads with sound off");
}

function checkProduction(b, setup, p) {
  const pr = b.production;
  const fast = Object.keys(pr ?? {}).filter(k => /fast/i.test(k));
  if (fast.length) p.push(`production.${fast.join(", production.")} must not be present: creative runs carry no fast field at all`);
  if (!setup?.creativeBuildModel || !setup?.creativeBuildEffort) { p.push("brief setup.creativeBuildModel and setup.creativeBuildEffort are required"); return; }
  const up = pr?.ownerApprovedUpgrade;
  const approved = up && up.by === "owner" && isText(up.quote) && up.model === pr?.model && isText(up.at);
  if (pr?.model !== setup.creativeBuildModel && !approved) p.push(`production.model "${pr?.model}" is not setup.creativeBuildModel "${setup.creativeBuildModel}". Never upgrade or fall back silently; a different model needs ownerApprovedUpgrade {by: "owner", quote, model, at}`);
  if (pr?.reasoning_effort !== setup.creativeBuildEffort && !approved) p.push(`production.reasoning_effort "${pr?.reasoning_effort}" is not setup.creativeBuildEffort "${setup.creativeBuildEffort}"`);
  if (setup.siteBuildModel && pr?.model === setup.siteBuildModel && setup.siteBuildModel !== setup.creativeBuildModel && !approved) p.push("the site model is never a creative fallback");
}

function checkReads(b, catalog, p) {
  const reads = Array.isArray(b.reads) ? b.reads : [];
  if (!reads.length) p.push("reads[] records the library skills read for this asset, each with why (read only what this asset needs)");
  for (const r of reads) {
    if (!/^studio-[a-z0-9-]+$/.test(r?.skill ?? "") || !isText(r?.why)) p.push(`reads entry ${JSON.stringify(r)} needs a studio-* skill and why`);
    else if (catalog && !catalog.skills.some(s => s.name === r.skill)) p.push(`reads: ${r.skill} is not in this Studio catalog; never load it from another plugin`);
  }
}

export function checkCreativeBrief(b, setup, { catalog } = {}) {
  const p = [];
  if (b?.schema !== BRIEF_SCHEMA) p.push(`schema must be "${BRIEF_SCHEMA}"`);
  if (!isText(b?.asset?.id)) p.push("asset.id is required");
  if (!["static", "video"].includes(b?.asset?.kind)) p.push('asset.kind must be "static" or "video"');
  for (const f of ["placement", "format"]) if (!isText(b?.asset?.[f])) p.push(`asset.${f} is required`);
  for (const f of ["brief", "positioning", "designTokens", "site"]) if (!isText(b?.sources?.[f])) p.push(`sources.${f} is required: expand from the shared project files, not from new owner questions`);
  if (!isText(b?.ownerInput)) p.push("ownerInput keeps the owner's basic ask verbatim");
  checkStrategy(b?.strategy, p);
  if (b?.strategy) checkConcept(b, p);
  checkCopy(b ?? {}, p);
  checkArt(b ?? {}, p);
  checkVideo(b ?? {}, p);
  checkProduction(b ?? {}, setup, p);
  checkReads(b ?? {}, catalog, p);
  if (p.length) throw new Error(`Creative brief is not ready for the Cloud run:\n- ${p.join("\n- ")}`);
  return { ok: true, asset: b.asset.id, kind: b.asset.kind, approach: b.artDirection.approach, sha256: briefSha256(b) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [briefFile, projectFile] = process.argv.slice(2);
    if (!briefFile || !projectFile) throw new Error("usage: node creative-brief.mjs <creative-brief.json> <brief/project.json> [--catalog <catalog.json>]");
    const i = process.argv.indexOf("--catalog");
    const catalog = i > -1 ? JSON.parse(fs.readFileSync(process.argv[i + 1], "utf8")) : undefined;
    const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
    console.log(JSON.stringify(checkCreativeBrief(JSON.parse(fs.readFileSync(briefFile, "utf8")), project.setup, { catalog })));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
