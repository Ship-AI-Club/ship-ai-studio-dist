// Builds the Remotion public folder for one render: the project's assets plus the
// token-selected font files, and the inputProps that reference them.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { imagesOf } from "./content.mjs";

export const sha256 = buf => crypto.createHash("sha256").update(buf).digest("hex");
export const sha256File = f => sha256(fs.readFileSync(f));

export function arg(argv, key) {
  const i = argv.indexOf(key);
  return i > -1 ? argv[i + 1] : undefined;
}

export function requireArgs(argv, keys) {
  const missing = keys.filter(k => !arg(argv, k));
  if (missing.length) throw new Error(`Missing required ${missing.join(", ")}. There are no defaults: pass the approved design tokens, content, assets folder and output folder.`);
}

export function stagePublicDir({ tokens, fontFiles, assetsDir, content }) {
  const assets = path.resolve(assetsDir);
  if (!fs.existsSync(assets)) throw new Error(`Assets folder ${assets} does not exist`);
  const need = [...new Set([tokens.brand.logo.lockup, ...imagesOf(content)])];
  const missing = need.filter(f => !fs.existsSync(path.join(assets, f)));
  if (missing.length) throw new Error(`Missing assets in ${assets}: ${missing.join(", ")}`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "studio-render-"));
  fs.cpSync(assets, dir, { recursive: true });
  fs.mkdirSync(path.join(dir, "__fonts"));
  const fonts = fontFiles.map(f => {
    const name = `${f.weight}-${path.basename(f.abs)}`;
    fs.copyFileSync(f.abs, path.join(dir, "__fonts", name));
    return { weight: f.weight, src: `__fonts/${name}` };
  });
  const lockupSvg = fs.readFileSync(path.join(assets, tokens.brand.logo.lockup), "utf8");
  return { dir, fonts, lockupSvg, inputs: need.map(f => ({ path: f, sha256: sha256File(path.join(assets, f)) })) };
}

export function brandProps(tokens, fonts, lockupSvg) {
  return {
    name: tokens.brand.name,
    colors: tokens.colors,
    family: tokens.typography.family,
    weights: tokens.typography.weights,
    fonts,
    radius: tokens.shape.radius,
    lockupSvg,
  };
}

// --scene <entry> renders a project-local Remotion entry (registerRoot) instead of the generic
// compositions. It resolves remotion and react from this folder and can import the shared
// building blocks as "@studio/blocks". Every file beside the entry is hashed into the manifest.
export function sceneSource(argv, here, generic) {
  const entry = arg(argv, "--scene");
  if (!entry) return { custom: false, entryPoint: path.join(here, "src/index.ts"), compositionId: generic, inputs: [] };
  const abs = path.resolve(entry);
  if (!fs.existsSync(abs)) throw new Error(`--scene ${abs} does not exist`);
  const compositionId = arg(argv, "--composition");
  if (!compositionId) throw new Error("--scene needs --composition <id> naming the composition the entry registers");
  const dir = path.dirname(abs);
  const files = fs.readdirSync(dir, { recursive: true }).map(String).filter(f => fs.statSync(path.join(dir, f)).isFile() && !f.split(path.sep).includes("node_modules"));
  return {
    custom: true, entryPoint: abs, compositionId,
    inputs: files.sort().map(f => ({ path: `scene/${f.split(path.sep).join("/")}`, sha256: sha256File(path.join(dir, f)) })),
  };
}

export function bundleOptions(here, entryPoint, publicDir) {
  return {
    entryPoint, publicDir,
    webpackOverride: config => ({
      ...config,
      resolve: {
        ...config.resolve,
        alias: { ...(config.resolve?.alias ?? {}), "@studio/blocks": path.join(here, "src/blocks.tsx") },
        modules: [...(config.resolve?.modules ?? ["node_modules"]), path.join(here, "node_modules")],
      },
    }),
  };
}

// A scene must render at the size and timing its content file declares.
export function assertGeometry(composition, content, FORMATS) {
  const [w, h] = FORMATS[content.format];
  const p = [];
  if (composition.width !== w || composition.height !== h) p.push(`size ${composition.width}x${composition.height}, expected ${w}x${h} for format ${content.format}`);
  if (content.fps !== undefined && composition.fps !== content.fps) p.push(`fps ${composition.fps}, expected ${content.fps}`);
  if (content.durationSec !== undefined && composition.durationInFrames !== Math.round(content.durationSec * content.fps)) p.push(`${composition.durationInFrames} frames, expected ${Math.round(content.durationSec * content.fps)}`);
  if (p.length) throw new Error(`Composition ${composition.id} does not match its content file: ${p.join("; ")}. Read width, height, fps and duration from the content props.`);
}

export async function browserOptions() {
  const exe = process.env.REMOTION_BROWSER_EXECUTABLE;
  return exe ? { browserExecutable: exe } : {};
}
