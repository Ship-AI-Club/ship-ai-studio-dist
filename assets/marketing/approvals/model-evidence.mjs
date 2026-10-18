// Checks gate-evidence/<asset>/model.json against the saved creative model choice.
// Creative runs use setup.creativeBuildModel; the site model is never a creative fallback.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCES = ["cloud-selector", "run-metadata"];

export function checkModelEvidence(ev, setup) {
  const p = [];
  if (!setup?.creativeBuildModel || !setup?.creativeBuildEffort) p.push("brief setup.creativeBuildModel and setup.creativeBuildEffort are required");
  if (!ev?.asset) p.push("asset is required");
  if (!ev?.agentId && !ev?.runUrl) p.push("agentId or runUrl of the creative Cloud run is required");
  if (!SOURCES.includes(ev?.source)) p.push(`source must be one of ${SOURCES.join(", ")} (the real setting, not the requested one)`);
  if (!ev?.recordedAt) p.push("recordedAt is required");
  const fastKeys = [...Object.keys(ev ?? {}), ...Object.keys(ev?.params ?? {}).map(k => `params.${k}`)].filter(k => /fast/i.test(k));
  if (fastKeys.length) p.push(`${fastKeys.join(", ")} must not be present: creative runs carry no fast field at all`);
  if (setup && ev?.model !== setup.creativeBuildModel) {
    p.push(`run model "${ev?.model}" is not setup.creativeBuildModel "${setup.creativeBuildModel}". Stop and ask the owner; never fall back or upgrade silently`);
  }
  if (setup && ev?.params?.reasoning_effort !== setup.creativeBuildEffort) {
    p.push(`run reasoning_effort "${ev?.params?.reasoning_effort}" is not setup.creativeBuildEffort "${setup.creativeBuildEffort}"`);
  }
  if (p.length) throw new Error(`Model evidence is not valid:\n- ${p.join("\n- ")}`);
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [evFile, briefFile] = process.argv.slice(2);
    if (!evFile || !briefFile) throw new Error("usage: node model-evidence.mjs <gate-evidence/<asset>/model.json> <brief/project.json>");
    const brief = JSON.parse(fs.readFileSync(briefFile, "utf8"));
    checkModelEvidence(JSON.parse(fs.readFileSync(evFile, "utf8")), brief.setup);
    console.log("model evidence OK");
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
