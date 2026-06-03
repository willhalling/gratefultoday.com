import * as Inter from '@remotion/google-fonts/Inter';
import * as PlayfairDisplay from '@remotion/google-fonts/PlayfairDisplay';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { DayResponse } from '../types/just-for-a-week';

// Brand palette (from Tailwind theme)
const BRAND = {
  bg: '#1E1F21', // neutral.DEFAULT
  textPrimaryLight: '#F2F2EF', // neutral.50
  textPrimaryDark: '#1E1F21',
  textSecondaryLight: '#9EADA0', // primary.DEFAULT
  textSecondaryDark: '#35342f', // neutral.800
  accentLight: '#EFC98A', // secondary.DEFAULT
  accentDark: '#4a3c33', // accent.900
  textMutedLight: '#e8ece9', // primary.light
  textMutedDark: '#474e49', // primary.800
} as const;

// Per-day backgrounds (7 days)
const DAY_BACKGROUNDS = [
  '#3c423d', // primary.900
  '#B1977C', // accent.DEFAULT
  '#EFC98A', // secondary.DEFAULT
  '#6a776d', // primary.600
  '#4a3c33', // accent.900
  '#7a5a2d', // secondary.900
  '#35342f', // neutral.800
] as const;

function hexToRgb(hex: string) {
  const m = hex.replace('#', '').match(/.{1,2}/g);
  if (!m) return { r: 0, g: 0, b: 0 };
  const [r, g, b] = m.map((x) => parseInt(x, 16));
  return { r, g, b } as const;
}

function isLight(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  // Perceived luminance (ITU-R BT.709)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 155; // threshold tuned for our palette
}

// Load Google Fonts
const { fontFamily: interFont } = Inter.loadFont();
const { fontFamily: playfairFont } = PlayfairDisplay.loadFont();

interface WeekJourneyCompositionProps {
  responses: DayResponse[];
  userEmail: string;
}

export const WeekJourneyComposition: React.FC<WeekJourneyCompositionProps> = ({
  responses,
  userEmail,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 5 seconds intro, 10 seconds per day, 5 seconds outro
  const introDuration = fps * 5;
  const dayDuration = fps * 10;
  const outroDuration = fps * 5;

  // Brand palette extracted from Tailwind config
  const BRAND = {
    bg: '#1E1F21', // neutral.DEFAULT
    textPrimary: '#F2F2EF', // neutral.50
    textSecondary: '#9EADA0', // primary.DEFAULT
    accent: '#B1977C', // accent.DEFAULT
    textMuted: '#e8ece9', // primary.light
  } as const;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      {/* Intro */}
      <Sequence durationInFrames={introDuration}>
        <IntroScene />
      </Sequence>

      {/* Each day's response */}
      {responses.map((response, index) => (
        <Sequence
          key={response.day}
          from={introDuration + index * dayDuration}
          durationInFrames={dayDuration}
        >
          <DayScene response={response} dayIndex={index} />
        </Sequence>
      ))}

      {/* Outro */}
      <Sequence
        from={introDuration + responses.length * dayDuration}
        durationInFrames={outroDuration}
      >
        <OutroScene totalDays={responses.length} />
      </Sequence>
    </AbsoluteFill>
  );
};

function IntroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps * 1, fps * 4, fps * 5], [0, 1, 1, 0]);
  const scale = interpolate(frame, [0, fps * 1], [0.8, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: 'center',
          padding: 60,
        }}
      >
        <h1
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: '#F2F2EF',
            marginBottom: 20,
            fontFamily: playfairFont,
          }}
        >
          Your Journey
        </h1>
        <p
          style={{
            fontSize: 32,
            color: '#9EADA0',
            fontFamily: interFont,
          }}
        >
          7 Days of Gratitude
        </p>
      </div>
    </AbsoluteFill>
  );
}

function DayScene({ response, dayIndex }: { response: DayResponse; dayIndex: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade the user's answer in first to give it precedence
  const responseOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const titleOpacity = interpolate(frame, [fps * 0.3, fps * 1.2], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [fps * 8, fps * 10], [1, 0], {
    extrapolateLeft: 'clamp',
  });

  // Per-day background + dynamic text colors based on contrast
  const bg = DAY_BACKGROUNDS[dayIndex % DAY_BACKGROUNDS.length];
  const lightBg = isLight(bg);
  const titleColor = lightBg ? BRAND.textPrimaryDark : BRAND.textPrimaryLight;
  const subtitleColor = lightBg ? BRAND.textSecondaryDark : BRAND.textSecondaryLight;
  const textColor = lightBg ? BRAND.textPrimaryDark : BRAND.textMutedLight;
  const dayLabelColor = lightBg ? BRAND.accentDark : BRAND.accentLight;

  // Responsive font sizing based on content length
  const getPromptFontSize = (text: string) => {
    const len = text.length;
    if (len > 150) return 36;
    if (len > 100) return 42;
    if (len > 60) return 48;
    return 56;
  };

  const getResponseFontSize = (text: string) => {
    const len = text.length;
    if (len > 900) return 28;
    if (len > 600) return 30;
    if (len > 400) return 32;
    if (len > 250) return 36;
    if (len > 150) return 40;
    return 44;
  };

  const promptFontSize = getPromptFontSize(response.prompt);
  const responseFontSize = getResponseFontSize(response.response);

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 64,
        opacity: fadeOut,
        backgroundColor: bg,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 920,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          gap: 18,
        }}
      >
        {/* Header: Day at the very top of the centered column */}
        <div
          style={{
            opacity: titleOpacity,
            fontSize: 28,
            color: dayLabelColor,
            fontWeight: 700,
            marginBottom: 8,
            fontFamily: interFont,
            textAlign: 'left',
          }}
        >
          Day {response.day}
        </div>

        {/* Spacer to push the response to the vertical middle */}
        <div style={{ flex: 1 }} />

        {/* User response centered and prioritized with large quote icons */}
        <div
          style={{
            position: 'relative',
            opacity: responseOpacity,
            padding: 8,
          }}
        >
          {/* Opening quote */}
          <div
            style={{
              position: 'absolute',
              top: -16,
              left: -22,
              fontFamily: playfairFont,
              fontSize: Math.round(responseFontSize + 28),
              lineHeight: 1,
              color: titleColor,
              opacity: 0.18,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          >
            “
          </div>

          {/* Response text with inline closing quote */}
          <p
            style={{
              position: 'relative',
              zIndex: 1,
              fontSize: responseFontSize,
              lineHeight: 1.6,
              color: textColor,
              fontFamily: interFont,
              fontWeight: 600,
              textAlign: 'left',
              margin: 0,
            }}
          >
            <span>{response.response}</span>
            <span
              style={{
                fontFamily: playfairFont,
                fontSize: Math.round(responseFontSize + 8),
                marginLeft: 6,
                color: titleColor,
                opacity: 0.25,
                verticalAlign: 'baseline',
                display: 'inline-block',
                lineHeight: 1,
              }}
            >
              ”
            </span>
          </p>
        </div>

        {/* Small gap between response and prompt */}
        <div style={{ height: 12 }} />

        {/* Prompt (secondary, smaller) */}
        <div
          style={{
            opacity: titleOpacity,
            textAlign: 'left',
          }}
        >
          <h2
            style={{
              fontSize: Math.max(22, promptFontSize - 12),
              fontWeight: 800,
              color: titleColor,
              fontFamily: playfairFont,
            }}
          >
            {response.prompt}
          </h2>
        </div>

        {/* Spacer to keep response vertically centered overall */}
        <div style={{ flex: 1 }} />
      </div>
    </AbsoluteFill>
  );
}

function OutroScene({ totalDays }: { totalDays: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps * 1], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: 60,
        }}
      >
        <h1
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#F2F2EF',
            marginBottom: 30,
            fontFamily: playfairFont,
          }}
        >
          {totalDays} Days Complete
        </h1>
        <p
          style={{
            fontSize: 36,
            color: '#9EADA0',
            fontFamily: interFont,
          }}
        >
          Keep noticing the good.
        </p>
      </div>
    </AbsoluteFill>
  );
}
