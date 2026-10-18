import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { assertProps, type StillProps } from "./types";
import { tightenEndPunctuation, useBrandFonts } from "./useBrandFonts";

const Line: React.FC<{ text: string }> = ({ text }) => {
  const { head, tail } = tightenEndPunctuation(text);
  return <div>{head}{tail && <span style={{ marginLeft: "-0.07em" }}>{tail}</span>}</div>;
};

// Photo-led still: licensed image on top, solid surface panel below, no text on the photo.
// Geometry scales with the canvas; every color, face, radius and string comes from props.
export const Still: React.FC<StillProps> = props => {
  assertProps(props, "still");
  const { brand, still } = props;
  useBrandFonts(brand);
  const { width: W, height: H } = useVideoConfig();
  const c = brand.colors;
  const u = W / 1080;
  const photoH = Math.round(H * (H > W ? 0.56 : 0.5));
  const pad = 84 * u;
  const headSize = (still.headlineLines.length > 2 ? 72 : 88) * u;
  return (
    <AbsoluteFill style={{ background: c.surface, color: c.text, fontFamily: `"${brand.family}"`, fontKerning: "normal" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: photoH, overflow: "hidden", background: c.background }}>
        <Img src={staticFile(still.image.src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: still.image.position ?? "50% 50%" }} />
      </div>
      <div style={{ position: "absolute", left: pad, right: pad, top: photoH + 60 * u, bottom: 64 * u, display: "flex", flexDirection: "column" }}>
        {still.eyebrow && (
          <div style={{ display: "flex", alignItems: "center", gap: 16 * u, fontSize: 26 * u, fontWeight: brand.weights.label, letterSpacing: 2.5 * u, textTransform: "uppercase", color: c.accent }}>
            <span style={{ width: 40 * u, height: 4 * u, background: c.accent, display: "inline-block" }} />{still.eyebrow}
          </div>
        )}
        <div style={{ marginTop: 22 * u, fontSize: headSize, fontWeight: brand.weights.display, lineHeight: 1.02, letterSpacing: -1.2 * u }}>
          {still.headlineLines.map(l => <Line key={l} text={l} />)}
        </div>
        <div style={{ marginTop: 22 * u, fontSize: 32 * u, lineHeight: 1.4, fontWeight: brand.weights.body, color: c.textMuted, maxWidth: 900 * u }}>{still.body}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 * u }}>
          <div style={{ background: c.accent, color: c.onAccent, fontSize: 32 * u, fontWeight: brand.weights.display, padding: `${24 * u}px ${36 * u}px`, borderRadius: brand.radius * u }}>{still.ctaLabel}</div>
          <div style={{ height: 52 * u, display: "flex", alignItems: "center" }}
            dangerouslySetInnerHTML={{ __html: brand.lockupSvg.replace(/<svg\b/, `<svg height="${52 * u}" style="width:auto;max-width:${320 * u}px"`) }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
