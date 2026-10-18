// Creative content comes from the approved brief and copy. Like the tokens, nothing is defaulted.
import fs from "node:fs";
import path from "node:path";

export const STILL_SCHEMA = "studio-social-still/1";
export const VIDEO_SCHEMA = "studio-short-video/1";
// Bespoke work: a project-local Remotion scene owns the composition; the content file only
// carries what the CLI must check, stage and write (format, timing, assets, caption, alt).
export const CUSTOM_STILL_SCHEMA = "studio-custom-still/1";
export const CUSTOM_VIDEO_SCHEMA = "studio-custom-video/1";
export const FORMATS = { "4x5": [1080, 1350], "1x1": [1080, 1080], "9x16": [1080, 1920] };
const SCENE_TYPES = ["photo", "list", "endcard"];
const MOTIONS = ["push", "pan", "drift", "none"];

export class ContentError extends Error {
  constructor(file, problems) {
    super(`Creative content ${file} is not usable:\n- ${problems.join("\n- ")}`);
    this.name = "ContentError";
    this.problems = problems;
  }
}

const isText = v => typeof v === "string" && v.trim().length > 0;
const isImage = v => isText(v?.src) && isText(v?.alt);

export function readJson(file, label) {
  if (!file) throw new ContentError("<none>", [`${label} is required`]);
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) throw new ContentError(abs, ["file does not exist"]);
  try { return { data: JSON.parse(fs.readFileSync(abs, "utf8")), file: abs }; }
  catch (e) { throw new ContentError(abs, [`invalid JSON: ${e.message}`]); }
}

export function validateStill(c, file = "<content>") {
  const p = [];
  if (c?.schema !== STILL_SCHEMA) p.push(`schema must be "${STILL_SCHEMA}"`);
  if (!isText(c?.id)) p.push("id is required");
  if (!FORMATS[c?.format]) p.push(`format must be one of ${Object.keys(FORMATS).join(", ")}`);
  if (!isImage(c?.image)) p.push("image.src and image.alt are required");
  if (!Array.isArray(c?.headlineLines) || !c.headlineLines.length || !c.headlineLines.every(isText)) p.push("headlineLines[] is required");
  for (const k of ["body", "ctaLabel", "destination", "caption", "alt"]) if (!isText(c?.[k])) p.push(`${k} is required`);
  if (c?.eyebrow !== undefined && !isText(c.eyebrow)) p.push("eyebrow must be text when present");
  if (p.length) throw new ContentError(file, p);
  return c;
}

export function validateVideo(v, file = "<content>") {
  const p = [];
  if (v?.schema !== VIDEO_SCHEMA) p.push(`schema must be "${VIDEO_SCHEMA}"`);
  if (!isText(v?.id)) p.push("id is required");
  if (!FORMATS[v?.format]) p.push(`format must be one of ${Object.keys(FORMATS).join(", ")}`);
  if (!Number.isInteger(v?.fps) || v.fps < 1) p.push("fps is required");
  const sz = v?.safeZonePct;
  for (const k of ["top", "bottom", "side"]) if (typeof sz?.[k] !== "number" || sz[k] < 0 || sz[k] >= 50) p.push(`safeZonePct.${k} is required (percent of the frame)`);
  if (!["silent", "licensed"].includes(v?.audio?.mode)) p.push('audio.mode must be "silent" or "licensed"');
  if (v?.audio?.mode === "licensed" && (!isText(v.audio.src) || !isText(v.audio.license))) p.push("licensed audio needs audio.src and audio.license");
  for (const k of ["caption", "alt", "destination"]) if (!isText(v?.[k])) p.push(`${k} is required`);
  if (!Array.isArray(v?.scenes) || !v.scenes.length) p.push("scenes[] is required");
  else {
    let end = 0;
    v.scenes.forEach((s, i) => {
      const at = `scenes[${i}]`;
      if (!isText(s?.id)) p.push(`${at}.id is required`);
      if (!SCENE_TYPES.includes(s?.type)) p.push(`${at}.type must be one of ${SCENE_TYPES.join(", ")}`);
      if (typeof s?.from !== "number" || typeof s?.to !== "number" || s.to <= s.from) p.push(`${at}.from/to must be seconds with to > from`);
      else { if (Math.abs(s.from - end) > 1e-6) p.push(`${at} starts at ${s.from}s but the previous scene ends at ${end}s`); end = s.to; }
      if (s?.type === "photo") {
        if (!isImage(s.image)) p.push(`${at}.image.src and image.alt are required`);
        if (!isText(s.headline)) p.push(`${at}.headline is required`);
        if (!MOTIONS.includes(s.motion)) p.push(`${at}.motion must be one of ${MOTIONS.join(", ")}`);
      }
      if (s?.type === "list") {
        if (!Array.isArray(s.items) || s.items.length < 2 || !s.items.every(x => isText(x?.label) && isImage(x?.image))) p.push(`${at}.items[] needs 2+ entries with label and image`);
      }
      if (s?.type === "endcard") {
        if (!Array.isArray(s.headlineLines) || !s.headlineLines.every(isText) || !s.headlineLines.length) p.push(`${at}.headlineLines[] is required`);
        if (!isText(s.ctaLabel)) p.push(`${at}.ctaLabel is required`);
      }
    });
    if (typeof v?.posterSec !== "number" || v.posterSec < 0 || v.posterSec >= end) p.push("posterSec is required and must fall inside the video");
  }
  if (p.length) throw new ContentError(file, p);
  return v;
}

function customCommon(c, schema, p) {
  if (c?.schema !== schema) p.push(`schema must be "${schema}"`);
  if (!isText(c?.id)) p.push("id is required");
  if (!FORMATS[c?.format]) p.push(`format must be one of ${Object.keys(FORMATS).join(", ")}`);
  for (const k of ["caption", "alt", "destination"]) if (!isText(c?.[k])) p.push(`${k} is required`);
  if (!Array.isArray(c?.assets) || !c.assets.every(isText)) p.push("assets[] lists every file the scene loads from the assets folder (may be empty)");
  if (c?.props !== undefined && (typeof c.props !== "object" || Array.isArray(c.props))) p.push("props must be an object when present");
}

export function validateCustomStill(c, file = "<content>") {
  const p = [];
  customCommon(c, CUSTOM_STILL_SCHEMA, p);
  if (p.length) throw new ContentError(file, p);
  return c;
}

export function validateCustomVideo(v, file = "<content>") {
  const p = [];
  customCommon(v, CUSTOM_VIDEO_SCHEMA, p);
  if (!Number.isInteger(v?.fps) || v.fps < 1) p.push("fps is required");
  if (typeof v?.durationSec !== "number" || v.durationSec <= 0) p.push("durationSec is required");
  else if (typeof v?.posterSec !== "number" || v.posterSec < 0 || v.posterSec >= v.durationSec) p.push("posterSec is required and must fall inside the video");
  const sz = v?.safeZonePct;
  for (const k of ["top", "bottom", "side"]) if (typeof sz?.[k] !== "number" || sz[k] < 0 || sz[k] >= 50) p.push(`safeZonePct.${k} is required (percent of the frame)`);
  if (!["silent", "licensed"].includes(v?.audio?.mode)) p.push('audio.mode must be "silent" or "licensed"');
  if (v?.audio?.mode === "licensed" && (!isText(v.audio.src) || !isText(v.audio.license))) p.push("licensed audio needs audio.src and audio.license");
  if (p.length) throw new ContentError(file, p);
  return v;
}

export function imagesOf(content) {
  if (content.schema === CUSTOM_STILL_SCHEMA || content.schema === CUSTOM_VIDEO_SCHEMA) {
    return [...content.assets, ...(content.audio?.mode === "licensed" ? [content.audio.src] : [])];
  }
  if (content.schema === STILL_SCHEMA) return [content.image.src];
  return content.scenes.flatMap(s => s.type === "photo" ? [s.image.src] : s.type === "list" ? s.items.map(x => x.image.src) : []);
}
