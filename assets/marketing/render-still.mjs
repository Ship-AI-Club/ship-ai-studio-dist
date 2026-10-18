// Renders one social still from approved design tokens and still content.
// Usage: node render-still.mjs --tokens <design-tokens.json> --content <still.json> --assets <dir> --out <dir>
//        [--scene <project scene entry> --composition <id>]   (bespoke composition)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { loadTokens } from "./lib/tokens.mjs";
import { FORMATS, readJson, validateCustomStill, validateStill } from "./lib/content.mjs";
import { arg, assertGeometry, brandProps, browserOptions, bundleOptions, requireArgs, sceneSource, sha256File, stagePublicDir } from "./lib/stage.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv;

try {
  requireArgs(argv, ["--tokens", "--content", "--assets", "--out"]);
  const scene = sceneSource(argv, here, "Still");
  const { tokens, file: tokensFile, fontFiles } = loadTokens(arg(argv, "--tokens"));
  const { data, file: contentFile } = readJson(arg(argv, "--content"), "--content <still.json>");
  const still = scene.custom ? validateCustomStill(data, contentFile) : validateStill(data, contentFile);
  const staged = stagePublicDir({ tokens, fontFiles, assetsDir: arg(argv, "--assets"), content: still });
  const out = path.resolve(arg(argv, "--out"));
  fs.mkdirSync(out, { recursive: true });
  const inputProps = { brand: brandProps(tokens, staged.fonts, staged.lockupSvg), still };
  const serveUrl = await bundle(bundleOptions(here, scene.entryPoint, staged.dir));
  const browser = await browserOptions();
  const composition = await selectComposition({ serveUrl, id: scene.compositionId, inputProps, ...browser });
  assertGeometry(composition, still, FORMATS);
  const output = path.join(out, `${still.id}.png`);
  await renderStill({ composition, serveUrl, output, inputProps, ...browser });
  fs.writeFileSync(path.join(out, `${still.id}.caption.txt`), still.caption + "\n");
  fs.writeFileSync(path.join(out, `${still.id}.alt.txt`), still.alt + "\n");
  const sceneFlags = scene.custom ? ` --scene <scene>/${path.basename(scene.entryPoint)} --composition ${scene.compositionId}` : "";
  const manifest = {
    kind: "social-still",
    status: "DRAFT",
    id: still.id,
    composition: scene.compositionId,
    bespoke: scene.custom,
    width: composition.width,
    height: composition.height,
    destination: still.destination,
    command: `node render-still.mjs --tokens ${path.basename(tokensFile)} --content ${path.basename(contentFile)} --assets <assets> --out <out>${sceneFlags}`,
    inputs: [
      { path: path.basename(tokensFile), sha256: sha256File(tokensFile) },
      { path: path.basename(contentFile), sha256: sha256File(contentFile) },
      ...staged.inputs,
      ...scene.inputs,
    ],
    outputs: [{ path: path.basename(output), sha256: sha256File(output) }],
  };
  fs.writeFileSync(path.join(out, `${still.id}.manifest.json`), JSON.stringify(manifest, null, 2) + "\n");
  fs.rmSync(staged.dir, { recursive: true, force: true });
  console.log(`[${still.id}] DRAFT ${composition.width}x${composition.height} ${output} sha256=${manifest.outputs[0].sha256}`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
