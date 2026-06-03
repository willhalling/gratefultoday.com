import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Audio, staticFile } from 'remotion';
import { CaptionRenderer } from './components/CaptionRenderer';
import { milestone24hCaptions } from '../data/captions/milestone-24h';
import type { CaptionStyle } from '../lib/remotion/caption-types';

export interface MilestoneProps {
  hours: number;
  title?: string;
  subtitle?: string;
  showCaptions?: boolean;
  audioUrl?: string;
}

export const MilestoneComposition: React.FC<MilestoneProps> = ({
  hours,
  title,
  subtitle = 'Keep going. One day at a time.',
  showCaptions = false,
  audioUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Grateful Today Brand Colors
  const colors = {
    background: '#1E1F21',     // Charcoal - neutral.900
    primary: '#9EADA0',        // Muted Sage Green
    secondary: '#EFC98A',      // Warm Sand
    accent: '#B1977C',         // Warm Taupe
    text: '#F2F2EF',          // Soft Off-White - neutral.50
  };

  // Caption styling
  const captionStyle: CaptionStyle = {
    fontSize: 56,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 1.5,
    letterSpacing: '-0.01em',
    textShadow: '0 3px 12px rgba(0, 0, 0, 0.9)',
    position: 'center',
    maxWidth: 1000,
    padding: 60,
  };

  // Animation timings - only show if not using captions
  const showNumber = !showCaptions;
  
  const hoursAppear = spring({
    frame: frame - 15,
    fps,
    config: {
      damping: 100,
    },
  });

  const titleAppear = spring({
    frame: frame - 30,
    fps,
    config: {
      damping: 100,
    },
  });

  const subtitleAppear = spring({
    frame: frame - 45,
    fps,
    config: {
      damping: 100,
    },
  });

  // Gentle breathing scale animation for the hours number
  const breatheScale = interpolate(
    Math.sin((frame / fps) * Math.PI),
    [-1, 1],
    [0.98, 1.02]
  );

  // Fade out at the end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Glow pulse effect
  const glowIntensity = interpolate(
    Math.sin((frame / fps) * Math.PI * 2),
    [-1, 1],
    [0.2, 0.5]
  );

  const displayTitle = title || `${hours} ${hours === 1 ? 'Hour' : 'Hours'} Sober`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        opacity: fadeOut,
      }}
    >
      {/* Audio track */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Animated background gradient - subtle sage/sand glow */}
      <div
        style={{
          position: 'absolute',
          width: '150%',
          height: '150%',
          background: `radial-gradient(circle at 30% 40%, ${colors.primary}15 0%, transparent 50%)`,
          opacity: glowIntensity,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '150%',
          height: '150%',
          background: `radial-gradient(circle at 70% 60%, ${colors.secondary}10 0%, transparent 50%)`,
          opacity: 1 - glowIntensity,
        }}
      />

      {/* Main content - only show if not using captions */}
      {showNumber && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 40,
            zIndex: 1,
          }}
        >
          {/* Hours number - big and bold with sage green */}
          <div
            style={{
              transform: `scale(${hoursAppear * breatheScale})`,
              opacity: hoursAppear,
            }}
          >
            <div
              style={{
                fontSize: 280,
                fontWeight: 900,
                color: colors.primary,
                textShadow: `0 0 ${60 * glowIntensity}px ${colors.primary}60`,
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              {hours}
            </div>
          </div>

          {/* Title with warm sand accent */}
          <div
            style={{
              transform: `translateY(${(1 - titleAppear) * 20}px)`,
              opacity: titleAppear,
            }}
          >
            <h1
              style={{
                fontSize: 80,
                fontWeight: 700,
                color: colors.text,
                margin: 0,
                textAlign: 'center',
                textShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
                letterSpacing: '-0.01em',
              }}
            >
              {displayTitle}
            </h1>
          </div>

          {/* Subtitle */}
          <div
            style={{
              transform: `translateY(${(1 - subtitleAppear) * 20}px)`,
              opacity: subtitleAppear * 0.9,
            }}
          >
            <p
              style={{
                fontSize: 42,
                fontWeight: 400,
                color: colors.text,
                margin: 0,
                textAlign: 'center',
                maxWidth: 900,
                padding: '0 60px',
                opacity: 0.85,
              }}
            >
              {subtitle}
            </p>
          </div>

          {/* Decorative line with warm sand */}
          <div
            style={{
              width: interpolate(subtitleAppear, [0, 1], [0, 240]),
              height: 5,
              backgroundColor: colors.secondary,
              opacity: subtitleAppear * 0.6,
              borderRadius: 3,
            }}
          />
        </div>
      )}

      {/* Captions - only show if enabled */}
      {showCaptions && (
        <CaptionRenderer
          captionData={milestone24hCaptions}
          style={captionStyle}
          fadeInDuration={0.4}
          fadeOutDuration={0.4}
        />
      )}

      {/* Bottom branding - subtle */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          opacity: showNumber ? subtitleAppear * 0.5 : 0.5,
        }}
      >
        <p
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: colors.text,
            margin: 0,
            letterSpacing: '0.05em',
          }}
        >
          GRATEFUL TODAY
        </p>
      </div>
    </AbsoluteFill>
  );
};
