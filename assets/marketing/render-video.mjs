// Renders one short video (H.264, yuv420p, faststart) plus a poster from approved
// design tokens and video content.
// Usage: node render-video.mjs --tokens <design-tokens.json> --content <video.json> --assets <dir> --out <dir>
//        [--scene <project scene entry> --composition <id>]   (custom Remotion scenes)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { loadTokens } from "./lib/tokens.mjs";
import { FORMATS, readJson, validateCustomVideo, validateVideo } from "./lib/content.mjs";
import { arg, assertGeometry, brandProps, browserOptions, bundleOptions, requireArgs, sceneSource, sha256File, stagePublicDir } from "./lib/stage.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv;

try {
  requireArgs(argv, ["--tokens", "--content", "--assets", "--out"]);
  const scene = sceneSource(argv, here, "ShortVideo");
  const { tokens, file: tokensFile, fontFiles } = loadTokens(arg(argv, "--tokens"));
  const { data, file: contentFile } = readJson(arg(argv, "--content"), "--content <video.json>");
  const video = scene.custom ? validateCustomVideo(data, contentFile) : validateVideo(data, contentFile);
  const staged = stagePublicDir({ tokens, fontFiles, assetsDir: arg(argv, "--assets"), content: video });
  const out = path.resolve(arg(argv, "--out"));
  fs.mkdirSync(out, { recursive: true });
  const inputProps = { brand: brandProps(tokens, staged.fonts, staged.lockupSvg), video };
  const serveUrl = await bundle(bundleOptions(here, scene.entryPoint, staged.dir));
  const browser = await browserOptions();
  const composition = await selectComposition({ serveUrl, id: scene.compositionId, inputProps, ...browser });
  assertGeometry(composition, video, FORMATS);
  const mp4 = path.join(out, `${video.id}.mp4`);
  const poster = path.join(out, `${video.id}.poster.png`);
  await renderMedia({
    composition, serveUrl, inputProps, codec: "h264", crf: 18, pixelFormat: "yuv420p",
    muted: video.audio.mode === "silent", outputLocation: mp4,
    ffmpegOverride: ({ args }) => [...args.slice(0, -1), "-movflags", "+faststart", args[args.length - 1]],
    ...browser,
  });
  await renderStill({ composition, serveUrl, inputProps, output: poster, frame: Math.round(video.posterSec * composition.fps), ...browser });
  fs.writeFileSync(path.join(out, `${video.id}.caption.txt`), video.caption + "\n");
  fs.writeFileSync(path.join(out, `${video.id}.alt.txt`), video.alt + "\n");
  const sceneFlags = scene.custom ? ` --scene <scene>/${path.basename(scene.entryPoint)} --composition ${scene.compositionId}` : "";
  const manifest = {
    kind: "short-video",
    status: "DRAFT",
    id: video.id,
    composition: scene.compositionId,
    bespoke: scene.custom,
    width: composition.width,
    height: composition.height,
    fps: composition.fps,
    frames: composition.durationInFrames,
    durationSec: composition.durationInFrames / composition.fps,
    audio: video.audio,
    destination: video.destination,
    command: `node render-video.mjs --tokens ${path.basename(tokensFile)} --content ${path.basename(contentFile)} --assets <assets> --out <out>${sceneFlags}`,
    inputs: [
      { path: path.basename(tokensFile), sha256: sha256File(tokensFile) },
      { path: path.basename(contentFile), sha256: sha256File(contentFile) },
      ...staged.inputs,
      ...scene.inputs,
    ],
    outputs: [mp4, poster].map(f => ({ path: path.basename(f), sha256: sha256File(f) })),
  };
  fs.writeFileSync(path.join(out, `${video.id}.manifest.json`), JSON.stringify(manifest, null, 2) + "\n");
  fs.rmSync(staged.dir, { recursive: true, force: true });
  console.log(`[${video.id}] DRAFT ${composition.width}x${composition.height} ${manifest.frames}f @${composition.fps} ${mp4} sha256=${manifest.outputs[0].sha256}`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
