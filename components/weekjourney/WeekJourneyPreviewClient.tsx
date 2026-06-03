'use client';

import React, { useMemo, useState } from 'react';
import { Player } from '@remotion/player';
import { WeekJourneyComposition } from '@/remotion/WeekJourneyComposition';
import type { DayResponse } from '@/types/just-for-a-week';

type Props = {
  responses: DayResponse[];
  userEmail: string;
  showDownload?: boolean;
};

export function WeekJourneyPreviewClient({ responses, userEmail, showDownload = true }: Props) {
  const fps = 30;
  const width = 1080;
  const height = 1920;
  const durationInFrames = useMemo(() => fps * (5 + responses.length * 10 + 5), [fps, responses]);

  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setIsRendering(true);
    setProgress(0);
    try {
      const isFirefox =
        typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox');
      const audioCodec = isFirefox ? 'opus' : 'aac';
      const container = isFirefox ? 'webm' : 'mp4';
      const videoCodec = isFirefox ? 'vp8' : 'h264';
      const fileExtension = isFirefox ? 'webm' : 'mp4';

      const { renderMediaOnWeb } = await import('@remotion/web-renderer');
      const CompositionComponent = (props: { responses: DayResponse[]; userEmail: string }) =>
        React.createElement(WeekJourneyComposition, props);

      const { getBlob } = await renderMediaOnWeb({
        composition: {
          id: 'WeekJourney',
          component: CompositionComponent,
          durationInFrames: durationInFrames,
          fps,
          width,
          height,
          defaultProps: { responses, userEmail },
        },
        inputProps: { responses, userEmail },
        container,
        videoCodec,
        audioCodec,
        audioBitrate: isFirefox ? 'high' : undefined,
        videoBitrate: 'high',
        hardwareAcceleration: 'prefer-hardware',
        keyframeIntervalInSeconds: 5,
        transparent: false,
        muted: false,
        delayRenderTimeoutInMilliseconds: 30000,
        logLevel: 'error',
        outputTarget: 'web-fs',
        licenseKey: 'free-license',
        onProgress: ({ encodedFrames }) => {
          const pct = Math.round((encodedFrames / durationInFrames) * 100);
          setProgress(pct);
        },
      });

      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `week-journey.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setProgress(0);
    } catch (err) {
      console.error('WeekJourney download failed', err);
      alert('Failed to render video. Please try again.');
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="grid gap-4">
      <Player
        component={WeekJourneyComposition}
        durationInFrames={durationInFrames}
        compositionWidth={width}
        compositionHeight={height}
        fps={fps}
        acknowledgeRemotionLicense
        controls
        autoPlay
        loop
        style={{ width: 360, height: 640 }}
        className="rounded-lg overflow-hidden shadow-sm"
        inputProps={{ responses, userEmail }}
      />
      {showDownload && (
        <button
          onClick={handleDownload}
          disabled={isRendering}
          className="px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRendering ? `Rendering ${progress}%` : 'Download Video'}
        </button>
      )}
    </div>
  );
}
