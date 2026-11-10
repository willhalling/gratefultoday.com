import type { PhotoDesign } from '@/lib/sobriety-card-design';
import { photoCardFonts } from '@/lib/sobriety-card-font';
import {
  cardPhotoUrl,
  getCardPhoto,
  layoutPhotoText,
  photoInk,
  photoScrimCss,
  TYPE_STYLES,
} from '@/lib/sobriety-card-photo-art';
import styles from './photo-card.module.css';

/** Design space for the DOM layout (5:7); positions become % / cqw. */
const W = 1000;
const H = 1400;

interface PhotoCardFaceProps {
  design: PhotoDesign;
  /** 'always' = slow drift (detail/shared page); 'hover' = thumbnails. */
  motion?: 'always' | 'hover' | 'none';
  /** Rendered width hint for the image request (CSS px). */
  displayWidth?: number;
  /** Load eagerly (above the fold). */
  priority?: boolean;
  /** Heading level for the headline lines. */
  headlineAs?: 'p' | 'h2';
}

/**
 * Photographic card front. The text is real DOM text, positioned from the
 * same layout the canvas export and OG images use.
 */
export default function PhotoCardFace({
  design,
  motion = 'none',
  displayWidth = 480,
  priority = false,
  headlineAs: HeadlineTag = 'p',
}: PhotoCardFaceProps) {
  const photo = getCardPhoto(design.photoId);
  const style = TYPE_STYLES[design.typeStyle];
  const layout = layoutPhotoText(design, style, W, H, photo.textPlacement);
  const ink = photoInk(style, photo);
  const w1 = Math.min(1200, Math.round(displayWidth * 1.25));
  const w2 = Math.min(1600, w1 * 2);

  const headlineLines = layout.lines.filter((line) => line.role === 'headline');
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const cqw = (px: number) => `${px / 10}cqw`;
  const lineStyle = (line: (typeof layout.lines)[number]): React.CSSProperties => ({
    position: 'absolute',
    left: 0,
    right: 0,
    top: pct(line.top, H),
    height: cqw(line.lineBox),
    lineHeight: cqw(line.lineBox),
    fontSize: cqw(line.fontSize),
    letterSpacing: cqw(line.tracking),
    // CSS adds tracking after the last glyph too; balance it so lines centre
    // exactly like the canvas/OG renders.
    paddingLeft: line.tracking > 0 ? cqw(line.tracking) : undefined,
    fontFamily: photoCardFonts[line.font].style.fontFamily,
    fontWeight: photoCardFonts[line.font].style.fontWeight,
    color: ink.text,
    textShadow: ink.shadow === 'transparent' ? undefined : `0 0 ${cqw(18)} ${ink.shadow}`,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    margin: 0,
  });

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ containerType: 'inline-size' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardPhotoUrl(photo, w1, (w1 * 7) / 5)}
        srcSet={`${cardPhotoUrl(photo, w1, (w1 * 7) / 5)} ${w1}w, ${cardPhotoUrl(photo, w2, (w2 * 7) / 5)} ${w2}w`}
        sizes={`${displayWidth}px`}
        alt={`Photo: ${photo.alt}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`absolute inset-0 h-full w-full object-cover ${styles.photo} ${
          motion === 'always' ? styles.drift : motion === 'hover' ? styles.hoverDrift : ''
        }`}
      />
      {style.box !== 'paper' && (
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ backgroundImage: photoScrimCss(photo, layout.focusY) }}
        />
      )}
      {style.box !== 'none' && (
        <div
          aria-hidden="true"
          className="absolute"
          style={{
            left: pct(layout.block.x, W),
            top: pct(layout.block.y, H),
            width: pct(layout.block.width, W),
            height: pct(layout.block.height, H),
            backgroundColor: style.box === 'paper' ? 'rgba(255,253,248,0.94)' : undefined,
            border: style.box === 'frame' ? `${cqw(5)} solid ${ink.text}` : undefined,
            borderRadius: style.box === 'paper' ? cqw(10) : 0,
            boxShadow: style.box === 'paper' ? `0 ${cqw(8)} ${cqw(30)} rgba(0,0,0,0.18)` : undefined,
          }}
        />
      )}
      {layout.lines
        .filter((line) => line.role === 'kicker')
        .map((line, i) => (
          <p key={`k${i}`} style={lineStyle(line)}>
            {line.text}
          </p>
        ))}
      <HeadlineTag className="m-0">
        {headlineLines.map((line, i) => (
          <span key={`h${i}`} className="block" style={lineStyle(line)}>
            {line.text}
          </span>
        ))}
      </HeadlineTag>
      {layout.lines
        .filter((line) => line.role === 'footer')
        .map((line, i) => (
          <p key={`f${i}`} style={lineStyle(line)}>
            {line.text}
          </p>
        ))}
    </div>
  );
}
