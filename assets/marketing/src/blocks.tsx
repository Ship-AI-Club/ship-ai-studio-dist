// Building blocks for project-local scenes rendered with --scene. They carry no layout:
// a scene composes them however its concept needs. Import them as "@studio/blocks".
import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { SIZES, type BrandProps, type Format } from "./types";
import { tightenEndPunctuation, useBrandFonts } from "./useBrandFonts";

export { SIZES, tightenEndPunctuation, useBrandFonts };
export type { BrandProps, Colors, Format } from "./types";

export type SafeZonePct = { top: number; bottom: number; side: number };

export type CustomStillContent<P = Record<string, unknown>> = {
  schema: "studio-custom-still/1"; id: string; format: Format; assets: string[];
  caption: string; alt: string; destination: string; props?: P;
};

export type CustomVideoContent<P = Record<string, unknown>> = {
  schema: "studio-custom-video/1"; id: string; format: Format; fps: number; durationSec: number; posterSec: number;
  safeZonePct: SafeZonePct; audio: { mode: "silent" | "licensed"; src?: string; license?: string };
  assets: string[]; caption: string; alt: string; destination: string; props?: P;
};

export type CustomStillProps<P = Record<string, unknown>> = { brand: BrandProps; still: CustomStillContent<P> };
export type CustomVideoProps<P = Record<string, unknown>> = { brand: BrandProps; video: CustomVideoContent<P> };

// Use as a Composition's calculateMetadata so the scene always renders at the content's
// declared size and timing (the CLI refuses any other geometry).
export function customMetadata({ props }: { props: Partial<CustomStillProps & CustomVideoProps> }) {
  const c = props.video ?? props.still;
  if (!props.brand || !c) throw new Error("Render scenes through render-still.mjs or render-video.mjs with the approved design tokens; there is no default brand.");
  const [width, height] = SIZES[c.format];
  if ("fps" in c) return { width, height, fps: c.fps, durationInFrames: Math.round(c.durationSec * c.fps) };
  return { width, height, durationInFrames: 1 };
}

// Pixel box inside the percentage safe zones of the current canvas.
export function useSafeBox(pct: SafeZonePct, minSidePx = 48) {
  const { width: W, height: H } = useVideoConfig();
  const top = (H * pct.top) / 100, bottom = H - (H * pct.bottom) / 100, side = Math.max((W * pct.side) / 100, minSidePx);
  return { W, H, top, bottom, left: side, right: W - side, width: W - 2 * side, height: bottom - top, u: W / 1080 };
}

export const SafeArea: React.FC<{ pct: SafeZonePct; style?: React.CSSProperties; children: React.ReactNode }> = ({ pct, style, children }) => {
  const b = useSafeBox(pct);
  return <div style={{ position: "absolute", left: b.left, top: b.top, width: b.width, height: b.height, ...style }}>{children}</div>;
};

export const Lockup: React.FC<{ brand: BrandProps; height: number; maxWidth?: number }> = ({ brand, height, maxWidth = height * 8 }) => (
  <div style={{ height, display: "flex", alignItems: "center" }}
    dangerouslySetInnerHTML={{ __html: brand.lockupSvg.replace(/<svg\b/, `<svg height="${height}" style="width:auto;max-width:${maxWidth}px"`) }} />
);

export const Asset: React.FC<{ src: string; style?: React.CSSProperties; position?: string }> = ({ src, style, position }) => (
  <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: position ?? "50% 50%", ...style }} />
);

export const TextLine: React.FC<{ text: string }> = ({ text }) => {
  const { head, tail } = tightenEndPunctuation(text);
  return <div>{head}{tail && <span style={{ marginLeft: "-0.07em" }}>{tail}</span>}</div>;
};

const ease = Easing.bezier(0.22, 1, 0.36, 1);

// Progress 0..1 over [start, start + frames], eased. Deterministic: frame-based only.
export function useProgress(start: number, frames: number) {
  const f = useCurrentFrame();
  return interpolate(f - start, [0, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
}

export const Reveal: React.FC<{ at?: number; frames?: number; distance?: number; children: React.ReactNode }> = ({ at = 0, frames = 14, distance = 28, children }) => {
  const p = useProgress(at, frames);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * distance}px)` }}>{children}</div>;
};
