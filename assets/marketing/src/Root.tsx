import React from "react";
import { Composition } from "remotion";
import { ShortVideo } from "./ShortVideo";
import { Still } from "./Still";
import { SIZES, type StillProps, type VideoProps } from "./types";

// No defaultProps carry a look: the components throw unless the CLI passes approved tokens.
const none = {} as never;

export const Root: React.FC = () => (
  <>
    <Composition id="Still" component={Still} durationInFrames={1} fps={30} width={1080} height={1080} defaultProps={none}
      calculateMetadata={({ props }: { props: StillProps }) => {
        if (!props.still) throw new Error("Still needs inputProps from render-still.mjs");
        const [width, height] = SIZES[props.still.format];
        return { width, height };
      }} />
    <Composition id="ShortVideo" component={ShortVideo} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={none}
      calculateMetadata={({ props }: { props: VideoProps }) => {
        if (!props.video) throw new Error("ShortVideo needs inputProps from render-video.mjs");
        const [width, height] = SIZES[props.video.format];
        const end = props.video.scenes[props.video.scenes.length - 1].to;
        return { width, height, fps: props.video.fps, durationInFrames: Math.round(end * props.video.fps) };
      }} />
  </>
);
