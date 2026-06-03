import { Composition, getInputProps } from 'remotion';
import { SlowedReverbComposition } from './SlowedReverbComposition';

export const Video = () => {
  const inputProps = getInputProps() as Record<string, unknown> | undefined;
  const fps = 30;

  // Calculate duration from input props or default to 10 seconds
  const durationInFrames = inputProps?.durationInFrames || fps * 10;

  return (
    <Composition
      component={SlowedReverbComposition as React.ComponentType<Record<string, unknown>>}
      durationInFrames={durationInFrames}
      width={1920}
      height={1080}
      fps={fps}
      id="slowed-gen"
      defaultProps={inputProps}
    />
  );
};
