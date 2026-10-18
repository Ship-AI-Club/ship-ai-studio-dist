export type Colors = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
};

export type BrandProps = {
  name: string;
  colors: Colors;
  family: string;
  weights: { display: number; label: number; body: number };
  fonts: { weight: number; src: string }[];
  radius: number;
  lockupSvg: string;
};

export type ImageRef = { src: string; alt: string; position?: string };
export type Format = "4x5" | "1x1" | "9x16";

export type StillContent = {
  schema: "studio-social-still/1";
  id: string;
  format: Format;
  image: ImageRef;
  eyebrow?: string;
  headlineLines: string[];
  body: string;
  ctaLabel: string;
  destination: string;
  caption: string;
  alt: string;
};

export type PhotoScene = { id: string; type: "photo"; from: number; to: number; image: ImageRef; eyebrow?: string; headline: string; motion: "push" | "pan" | "drift" | "none" };
export type ListScene = { id: string; type: "list"; from: number; to: number; items: { label: string; image: ImageRef }[] };
export type EndScene = { id: string; type: "endcard"; from: number; to: number; headlineLines: string[]; subline?: string; ctaLabel: string };
export type Scene = PhotoScene | ListScene | EndScene;

export type VideoContent = {
  schema: "studio-short-video/1";
  id: string;
  format: Format;
  fps: number;
  posterSec: number;
  safeZonePct: { top: number; bottom: number; side: number };
  scenes: Scene[];
};

export type StillProps = { brand: BrandProps; still: StillContent };
export type VideoProps = { brand: BrandProps; video: VideoContent };

export const SIZES: Record<Format, [number, number]> = { "4x5": [1080, 1350], "1x1": [1080, 1080], "9x16": [1080, 1920] };

export function assertProps(p: { brand?: BrandProps }, key: "still" | "video") {
  if (!p.brand || !(p as Record<string, unknown>)[key]) {
    throw new Error(`Missing inputProps.${p.brand ? key : "brand"}. Render through render-${key}.mjs with the approved design tokens; there is no default brand.`);
  }
}
