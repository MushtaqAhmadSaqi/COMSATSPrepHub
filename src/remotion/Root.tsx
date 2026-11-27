import React from 'react';
import { Composition } from 'remotion';
import { PrepHubShowcase } from './PrepHubShowcase';
import { PrepHubLaunchLandscape } from './PrepHubLaunchLandscape';
import { PrepHubReelVertical } from './PrepHubReelVertical';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PrepHubShowcase"
        component={PrepHubShowcase}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ theme: 'light' }}
      />
      <Composition
        id="PrepHubLaunchLandscape"
        component={PrepHubLaunchLandscape}
        durationInFrames={540}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ theme: 'dark' }}
      />
      <Composition
        id="PrepHubReelVertical"
        component={PrepHubReelVertical}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ theme: 'dark' }}
      />
    </>
  );
};
