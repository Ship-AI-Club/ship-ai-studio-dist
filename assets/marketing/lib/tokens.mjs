// Design tokens come from the approved design contract. Nothing here supplies a
// fallback: a missing or invalid token throws, so one brand can never leak into another.
import fs from "node:fs";
import path from "node:path";

export const TOKEN_SCHEMA = "studio-design-tokens/1";
export const REQUIRED_COLORS = ["background", "surface", "text", "textMuted", "accent", "onAccent"];
const CONTRAST_PAIRS = [
  ["text", "surface", 4.5],
  ["textMuted", "surface", 4.5],
  ["onAccent", "accent", 4.5],
];

export class TokenError extends Error {
  constructor(file, problems) {
    super(`Design tokens ${file} are not usable:\n- ${problems.join("\n- ")}`);
    this.name = "TokenError";
    this.problems = problems;
  }
}

const isHex = v => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
const isText = v => typeof v === "string" && v.trim().length > 0;

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Pure validation so it can run without touching the file system.
export function validateTokens(t, file = "<tokens>") {
  const p = [];
  if (!t || typeof t !== "object") throw new TokenError(file, ["file is not a JSON object"]);
  if (t.schema !== TOKEN_SCHEMA) p.push(`schema must be "${TOKEN_SCHEMA}"`);
  if (!isText(t.brand?.name)) p.push("brand.name is required");
  if (!isText(t.brand?.logo?.lockup)) p.push("brand.logo.lockup (SVG path relative to the assets folder) is required");
  for (const k of REQUIRED_COLORS) if (!isHex(t.colors?.[k])) p.push(`colors.${k} must be a #RRGGBB value`);
  const ty = t.typography;
  if (!isText(ty?.family)) p.push("typography.family is required");
  for (const role of ["display", "label", "body"]) {
    if (!Number.isInteger(ty?.weights?.[role])) p.push(`typography.weights.${role} is required`);
  }
  if (!Array.isArray(ty?.files) || ty.files.length === 0) p.push("typography.files must list the licensed font files");
  else ty.files.forEach((f, i) => {
    if (!Number.isInteger(f?.weight)) p.push(`typography.files[${i}].weight is required`);
    if (!isText(f?.src) || !/\.(woff2|woff|ttf|otf)$/.test(f.src)) p.push(`typography.files[${i}].src must be a font file`);
  });
  if (!isText(ty?.license)) p.push("typography.license is required (path to the font license)");
  if (Number.isInteger(ty?.weights?.display) && Array.isArray(ty?.files)) {
    for (const role of ["display", "label", "body"]) {
      const w = ty.weights[role];
      if (Number.isInteger(w) && !ty.files.some(f => f?.weight === w)) p.push(`no font file for typography.weights.${role}=${w}`);
    }
  }
  if (typeof t.shape?.radius !== "number" || t.shape.radius < 0) p.push("shape.radius is required (number, px)");
  if (!isText(t.source?.designContract)) p.push("source.designContract is required (where these tokens were approved)");
  if (!p.some(x => x.startsWith("colors."))) {
    for (const [fg, bg, min] of CONTRAST_PAIRS) {
      const r = contrast(t.colors[fg], t.colors[bg]);
      if (r < min) p.push(`contrast ${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${min}:1`);
    }
  }
  if (p.length) throw new TokenError(file, p);
  return t;
}

// Loads and validates tokens; font and license paths resolve relative to the token file.
export function loadTokens(file) {
  if (!file) throw new TokenError("<none>", ["--tokens <design-tokens.json> is required; there is no default brand"]);
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) throw new TokenError(abs, ["file does not exist"]);
  let t;
  try { t = JSON.parse(fs.readFileSync(abs, "utf8")); } catch (e) { throw new TokenError(abs, [`invalid JSON: ${e.message}`]); }
  validateTokens(t, abs);
  const dir = path.dirname(abs);
  const missing = [];
  const fontFiles = t.typography.files.map(f => {
    const src = path.resolve(dir, f.src);
    if (!fs.existsSync(src)) missing.push(`font file ${f.src} not found next to ${abs}`);
    return { weight: f.weight, abs: src };
  });
  const license = path.resolve(dir, t.typography.license);
  if (!fs.existsSync(license)) missing.push(`font license ${t.typography.license} not found`);
  if (missing.length) throw new TokenError(abs, missing);
  return { tokens: t, file: abs, fontFiles, license };
}
