import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import type { BrandProps } from "./types";

// Blocks every frame until the token-selected font files load. A failed load cancels the
// render instead of silently falling back to a system face.
export function useBrandFonts(brand: BrandProps) {
  const [handle] = useState(() => delayRender(`fonts: ${brand.family}`));
  useEffect(() => {
    Promise.all(brand.fonts.map(f =>
      new FontFace(brand.family, `url(${staticFile(f.src)})`, { weight: String(f.weight) }).load()
        .then(face => { document.fonts.add(face); })))
      .then(() => continueRender(handle))
      .catch(err => cancelRender(new Error(`Font ${brand.family} failed to load: ${err}`)));
  }, [brand, handle]);
}

// Display weights set a loose sidebearing before end punctuation; tuck it in.
export function tightenEndPunctuation(line: string) {
  return /[.!?]$/.test(line) ? { head: line.slice(0, -1), tail: line.slice(-1) } : { head: line, tail: "" };
}
