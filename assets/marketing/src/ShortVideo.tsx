import React from "react";
import { AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { assertProps, type BrandProps, type EndScene, type ListScene, type PhotoScene, type VideoProps } from "./types";
import { tightenEndPunctuation, useBrandFonts } from "./useBrandFonts";

const ease = Easing.bezier(0.22, 1, 0.36, 1);

type Frame = { W: number; H: number; seam: number; top: number; bottom: number; side: number; u: number };

function frameOf(W: number, H: number, sz: VideoProps["video"]["safeZonePct"]): Frame {
  const top = (H * sz.top) / 100, bottom = H - (H * sz.bottom) / 100, side = Math.max((W * sz.side) / 100, 48);
  return { W, H, top, bottom, side, seam: Math.round(top + (bottom - top) * 0.55), u: W / 1080 };
}

const Line: React.FC<{ text: string }> = ({ text }) => {
  const { head, tail } = tightenEndPunctuation(text);
  return <div>{head}{tail && <span style={{ marginLeft: "-0.07em" }}>{tail}</span>}</div>;
};

const Rise: React.FC<{ delay?: number; children: React.ReactNode }> = ({ delay = 0, children }) => {
  const f = useCurrentFrame();
  const p = interpolate(f - delay, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 28}px)` }}>{children}</div>;
};

const Photo: React.FC<{ src: string; position?: string; motion: PhotoScene["motion"]; dur: number; fr: Frame }> = ({ src, position, motion, dur, fr }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, dur], [0, 1], { extrapolateRight: "clamp" });
  const scale = motion === "push" ? 1.04 + 0.04 * p : motion === "pan" ? 1.12 : motion === "drift" ? 1.06 + 0.02 * p : 1;
  const tx = motion === "pan" ? interpolate(p, [0, 1], [30, -30]) : motion === "drift" ? interpolate(p, [0, 1], [-12, 12]) : 0;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: fr.W, height: fr.seam + 40, overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: position ?? "50% 50%", transform: `scale(${scale}) translateX(${tx}px)` }} />
    </div>
  );
};

const Panel: React.FC<{ b: BrandProps; fr: Frame }> = ({ b, fr }) =>
  <div style={{ position: "absolute", left: 0, top: fr.seam, width: fr.W, height: fr.H - fr.seam, background: b.colors.surface }} />;

const PhotoBeat: React.FC<{ s: PhotoScene; b: BrandProps; fr: Frame; dur: number }> = ({ s, b, fr, dur }) => (
  <AbsoluteFill>
    <Photo src={s.image.src} position={s.image.position} motion={s.motion} dur={dur} fr={fr} />
    <Panel b={b} fr={fr} />
    <div style={{ position: "absolute", left: fr.side, right: fr.side, top: fr.seam + 80 * fr.u, maxHeight: fr.bottom - fr.seam - 80 * fr.u, overflow: "hidden" }}>
      {s.eyebrow && <Rise delay={6}><div style={{ fontWeight: b.weights.label, fontSize: 36 * fr.u, letterSpacing: 1, color: b.colors.accent, marginBottom: 22 * fr.u }}>{s.eyebrow}</div></Rise>}
      <Rise delay={s.eyebrow ? 10 : 6}>
        <div style={{ fontWeight: b.weights.display, fontSize: (s.headline.length > 18 ? 96 : 116) * fr.u, lineHeight: 1.04, letterSpacing: "-0.02em", color: b.colors.text }}><Line text={s.headline} /></div>
      </Rise>
      <Rise delay={16}><div style={{ marginTop: 34 * fr.u, width: 120 * fr.u, height: 10 * fr.u, borderRadius: 5 * fr.u, background: b.colors.accent }} /></Rise>
    </div>
  </AbsoluteFill>
);

const ListBeat: React.FC<{ s: ListScene; b: BrandProps; fr: Frame; dur: number }> = ({ s, b, fr, dur }) => {
  const f = useCurrentFrame();
  const per = dur / s.items.length;
  const i = Math.min(s.items.length - 1, Math.floor(f / per));
  const local = f - i * per;
  return (
    <AbsoluteFill>
      {s.items.map((it, k) => k === i && (
        <Sequence key={it.label} from={Math.round(k * per)} durationInFrames={Math.round(per)} layout="none">
          <Photo src={it.image.src} position={it.image.position} motion="drift" dur={per} fr={fr} />
        </Sequence>
      ))}
      <Panel b={b} fr={fr} />
      <div style={{ position: "absolute", left: fr.side, right: fr.side, top: fr.seam + 80 * fr.u }}>
        <div style={{ fontWeight: b.weights.display, fontSize: 88 * fr.u, letterSpacing: "-0.015em", color: b.colors.text, opacity: interpolate(local, [0, 8], [0, 1], { extrapolateRight: "clamp" }) }}>{s.items[i].label}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 * fr.u, marginTop: 56 * fr.u }}>
          {s.items.map((it, k) => (
            <div key={it.label} style={{ fontWeight: b.weights.label, fontSize: 36 * fr.u, padding: `${14 * fr.u}px ${28 * fr.u}px`, borderRadius: 999, border: `3px solid ${b.colors.accent}`, background: k === i ? b.colors.accent : "transparent", color: k === i ? b.colors.onAccent : b.colors.text }}>{it.label}</div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EndBeat: React.FC<{ s: EndScene; b: BrandProps; fr: Frame }> = ({ s, b, fr }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const btn = spring({ frame: f - 18, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <AbsoluteFill style={{ background: b.colors.surface }}>
      <div style={{ position: "absolute", top: fr.top + (fr.bottom - fr.top) * 0.18, left: fr.side, right: fr.side, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <Rise><div style={{ height: 96 * fr.u, display: "flex", alignItems: "center" }} dangerouslySetInnerHTML={{ __html: b.lockupSvg.replace(/<svg\b/, `<svg height="${96 * fr.u}" style="width:auto;max-width:${720 * fr.u}px"`) }} /></Rise>
        <Rise delay={6}><div style={{ marginTop: 70 * fr.u, fontWeight: b.weights.display, fontSize: 70 * fr.u, lineHeight: 1.1, letterSpacing: "-0.015em", color: b.colors.text }}>{s.headlineLines.map(l => <Line key={l} text={l} />)}</div></Rise>
        {s.subline && <Rise delay={10}><div style={{ marginTop: 34 * fr.u, fontWeight: b.weights.body, fontSize: 38 * fr.u, lineHeight: 1.35, color: b.colors.textMuted, maxWidth: 820 * fr.u }}>{s.subline}</div></Rise>}
        <div style={{ marginTop: 90 * fr.u, transform: `scale(${0.6 + 0.4 * btn})`, opacity: Math.min(1, btn * 1.5), background: b.colors.accent, color: b.colors.onAccent, fontWeight: b.weights.display, fontSize: 52 * fr.u, padding: `${38 * fr.u}px ${64 * fr.u}px`, borderRadius: b.radius * 2 * fr.u }}>{s.ctaLabel}</div>
      </div>
    </AbsoluteFill>
  );
};

// Short vertical (or square/portrait) video. Copy stays inside the content file's
// percentage safe zones; silent unless the content supplies licensed audio.
export const ShortVideo: React.FC<VideoProps> = props => {
  assertProps(props, "video");
  const { brand, video } = props;
  useBrandFonts(brand);
  const { fps, width, height } = useVideoConfig();
  const fr = frameOf(width, height, video.safeZonePct);
  return (
    <AbsoluteFill style={{ fontFamily: `"${brand.family}"`, background: brand.colors.surface }}>
      {video.scenes.map(s => {
        const from = Math.round(s.from * fps), dur = Math.round((s.to - s.from) * fps);
        return (
          <Sequence key={s.id} from={from} durationInFrames={dur}>
            {s.type === "photo" ? <PhotoBeat s={s} b={brand} fr={fr} dur={dur} />
              : s.type === "list" ? <ListBeat s={s} b={brand} fr={fr} dur={dur} />
              : <EndBeat s={s} b={brand} fr={fr} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
