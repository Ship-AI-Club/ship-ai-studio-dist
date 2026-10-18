// Applies setup.modelPrecedence from the Studio role registry to a project brief.
// Site: a saved setup.siteBuildModel wins and nothing is asked; with none saved the PM asks
// the owner exactly once and saves the answer. Creative: always the registry default,
// independent of the site, with no fast field, no silent upgrade and no fallback.
//
// Usage: node scripts/model-setup.mjs --brief brief/project.json [--available id,id]
//        node scripts/model-setup.mjs --brief brief/project.json --answer opus|sonnet|none
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const loadPrecedence = (root = join(here, "..")) => JSON.parse(readFileSync(join(root, "studio-role-registry.json"), "utf8")).setup.modelPrecedence;

const ALIASES = { opus: "claude-opus-5-5", sonnet: "claude-sonnet-5-5", "opus-5.5": "claude-opus-5-5", "sonnet-5.5": "claude-sonnet-5-5" };
const normalize = m => (m == null ? null : ALIASES[m] ?? m);

export class ModelSetupError extends Error {
  constructor(reason) { super(`Model setup refused: ${reason}`); this.name = "ModelSetupError"; }
}

function siteOf(p, setup, available) {
  const f = p.site.fields;
  const saved = normalize(setup[f.model]);
  if (saved == null) return { values: { [f.model]: null, [f.effort]: null, [f.fast]: false }, source: "unset", question: { id: "site-model", to: "owner", text: p.site.question } };
  if (!p.site.choices.includes(saved)) throw new ModelSetupError(`setup.${f.model} ${saved} is not one of ${p.site.choices.join(", ")}`);
  if (setup[f.fast] != null && setup[f.fast] !== false) throw new ModelSetupError(`setup.${f.fast} stays false`);
  const values = { [f.model]: saved, [f.effort]: setup[f.effort] ?? p.site.default.effort, [f.fast]: false };
  if (available && !available.includes(saved)) return { values, source: "saved", question: { id: "site-unavailable", to: "owner", text: `${saved} is not available. Which available model should build your website?` } };
  return { values, source: "saved", question: null };
}

function creativeOf(p, setup, available) {
  const f = p.creative.fields;
  for (const k of Object.keys(setup)) if (/^creative/i.test(k) && /fast/i.test(k)) throw new ModelSetupError(`setup.${k}: creative runs carry no fast field`);
  const want = p.creative.default;
  const saved = normalize(setup[f.model]) ?? want.model;
  const effort = setup[f.effort] ?? want.effort;
  if (effort !== want.effort) throw new ModelSetupError(`setup.${f.effort} must be ${want.effort}`);
  let source = "default";
  if (saved !== want.model) {
    const u = setup.creativeUpgrade;
    if (!(u?.by === "owner" && typeof u.quote === "string" && u.quote.trim() && normalize(u.model) === saved && !Number.isNaN(Date.parse(u.at ?? "")))) {
      throw new ModelSetupError(`setup.${f.model} ${saved} differs from ${want.model} without the owner's recorded approval; creative never upgrades or follows the site model silently`);
    }
    source = "owner-approved-upgrade";
  }
  const values = { [f.model]: saved, [f.effort]: effort };
  if (available && !available.includes(saved)) return { values, source, question: { id: "creative-unavailable", to: "owner", text: `${saved} is not available for creative production. Which model should make your creative? Higher-cost choices need your approval.` } };
  return { values, source, question: null };
}

// Returns the effective setup and the questions still owed to the owner (at most one per side).
export function modelSetup({ brief, precedence = loadPrecedence(), available } = {}) {
  const setup = brief?.setup ?? {};
  const site = siteOf(precedence, setup, available);
  const creative = creativeOf(precedence, setup, available);
  return {
    setup: { ...site.values, ...creative.values },
    source: { site: site.source, creative: creative.source },
    questions: [site.question, creative.question].filter(Boolean),
    evidence: precedence.evidence,
  };
}

// Saves the owner's one answer. null (no answer, "not sure") saves the default.
export function saveSiteAnswer({ brief, answer, precedence = loadPrecedence() }) {
  const f = precedence.site.fields;
  if (normalize(brief?.setup?.[f.model]) != null) throw new ModelSetupError("a site model is already saved; the question is never asked twice");
  const model = answer == null || answer === "none" ? precedence.site.default.model : normalize(answer);
  if (!precedence.site.choices.includes(model)) throw new ModelSetupError(`answer ${answer} is not one of ${precedence.site.choices.join(", ")}`);
  return { ...brief, setup: { ...(brief.setup ?? {}), [f.model]: model, [f.effort]: precedence.site.default.effort, [f.fast]: false, siteBuildSource: answer == null || answer === "none" ? "default-no-answer" : "owner" } };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const a = k => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : undefined; };
  try {
    if (!a("--brief")) throw new Error("--brief is required");
    let brief = JSON.parse(readFileSync(a("--brief"), "utf8"));
    if (process.argv.includes("--answer")) {
      brief = saveSiteAnswer({ brief, answer: a("--answer") });
      writeFileSync(a("--brief"), JSON.stringify(brief, null, 2) + "\n");
    }
    console.log(JSON.stringify(modelSetup({ brief, available: a("--available")?.split(",") }), null, 2));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
