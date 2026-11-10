'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import BulkView from './bulk-view';
import SingleView from './single-view';
import StyleDrawer from './style-drawer';
import { fetchMusic, loadSavedStyle, saveMusic, saveStyle } from '@/lib/tiktok-maker/bulk';
import { DEFAULT_TYPEWRITER, type TypewriterSettings } from '@/lib/tiktok-maker/signature/scene';
import {
  decodeAudioFile,
  DEFAULT_BACKGROUND,
  DEFAULT_SOUND,
  type BackgroundSettings,
  type SoundSettings,
  type TikTokSpec,
} from '@/lib/tiktok-maker/tiktok-video';
import { ghostClass } from './controls';

interface Music {
  name: string;
  buffer: AudioBuffer;
  /** Library id once saved. */
  id: string | null;
  saveState: 'saving' | 'saved' | 'error';
}

type StyleState = 'loading' | 'saved' | 'saving' | 'error' | 'offline';

/** Delay between the last style change and saving it to the library. */
const STYLE_SAVE_DELAY_MS = 1200;

export default function TikTokMakerStudio() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [typewriter, setTypewriter] = useState<TypewriterSettings>({
    ...DEFAULT_TYPEWRITER,
    lines: [
      'Every day, I cross the same field.',
      'The M25 is on the other side.',
      'And every day, I make the same decision.',
      'Not today.',
    ],
  });
  const [background, setBackground] = useState<BackgroundSettings>(DEFAULT_BACKGROUND);
  const [sound, setSound] = useState<SoundSettings>(DEFAULT_SOUND);
  const [music, setMusic] = useState<Music | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [singleHasVoiceover, setSingleHasVoiceover] = useState(false);
  const [styleState, setStyleState] = useState<StyleState>('loading');
  const loaded = useRef(false);
  /** The style as last loaded or saved — an identical style isn't saved again. */
  const savedKey = useRef<string | null>(null);

  // The saved shared style (and its music) is the starting point.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { settings, music: savedMusic } = await loadSavedStyle();
        if (cancelled) return;
        if (settings) {
          const savedType = settings.typewriter as Partial<TypewriterSettings>;
          const { lines: _ignored, ...mergedType } = {
            ...DEFAULT_TYPEWRITER,
            ...savedType,
            colors: { ...DEFAULT_TYPEWRITER.colors, ...savedType.colors },
            sound: { ...DEFAULT_TYPEWRITER.sound, ...savedType.sound },
          };
          const mergedBg = { ...DEFAULT_BACKGROUND, ...(settings.background as Partial<BackgroundSettings>) };
          const mergedSound = { ...DEFAULT_SOUND, ...(settings.sound as Partial<SoundSettings>) };
          setTypewriter((prev) => ({ ...mergedType, lines: prev.lines }));
          setBackground(mergedBg);
          setSound(mergedSound);
          savedKey.current = JSON.stringify([mergedType, mergedBg, mergedSound, settings.musicId ?? null]);
        }
        if (savedMusic) {
          const blob = await fetchMusic(savedMusic.id);
          const buffer = await decodeAudioFile(new File([blob], savedMusic.name, { type: savedMusic.contentType }));
          if (!cancelled) setMusic({ name: savedMusic.name, buffer, id: savedMusic.id, saveState: 'saved' });
        }
        if (!cancelled) setStyleState('saved');
      } catch {
        if (!cancelled) setStyleState('offline');
      } finally {
        loaded.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave the shared style (lines are per-video content, not style).
  const { lines: _lines, ...typewriterStyle } = typewriter;
  const styleKey = JSON.stringify([typewriterStyle, background, sound, music?.id ?? null]);
  useEffect(() => {
    if (!loaded.current || styleState === 'offline' || styleKey === savedKey.current) return;
    setStyleState('saving');
    const timer = setTimeout(async () => {
      try {
        const [tw, bg, snd, musicId] = JSON.parse(styleKey) as [Record<string, unknown>, Record<string, unknown>, Record<string, unknown>, string | null];
        await saveStyle({ typewriter: tw, background: bg, sound: snd, musicId });
        savedKey.current = styleKey;
        setStyleState('saved');
      } catch {
        setStyleState('error');
      }
    }, STYLE_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleKey]);

  const pickMusic = async (file: File) => {
    let buffer: AudioBuffer;
    try {
      buffer = await decodeAudioFile(file);
    } catch {
      setMusic(null);
      return;
    }
    setMusic({ name: file.name, buffer, id: null, saveState: 'saving' });
    try {
      const saved = await saveMusic(file);
      setMusic((prev) => (prev && prev.buffer === buffer ? { ...prev, id: saved.id, saveState: 'saved' } : prev));
    } catch {
      setMusic((prev) => (prev && prev.buffer === buffer ? { ...prev, saveState: 'error' } : prev));
    }
  };

  /** Shared style + music; each view adds its own image, voiceover and lines. */
  const baseSpec: TikTokSpec = useMemo(
    () => ({ imageUrl: null, voiceover: null, music: music?.buffer ?? null, typewriter, background, sound }),
    [music, typewriter, background, sound],
  );

  const saveLabel = {
    loading: 'Loading saved style…',
    saved: 'Saved',
    saving: 'Saving…',
    error: 'Not saved — will retry on the next change',
    offline: 'Library unavailable — not saved',
  }[styleState];
  const drawerOpen = styleOpen || viewDrawerOpen;
  // One drawer at a time: a view drawer opening closes Style (views close theirs when Style opens).
  const onViewDrawerChange = useCallback((open: boolean) => {
    setViewDrawerOpen(open);
    if (open) setStyleOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className={`px-4 py-6 transition-[padding] duration-300 ${drawerOpen ? 'md:pr-[29rem]' : ''}`}>
        <div className="mx-auto max-w-7xl">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-2xl font-bold text-neutral-900">TikTok maker</h1>
              <div className="inline-flex rounded-lg border border-neutral-300 bg-white p-1" role="tablist">
                {(['single', 'bulk'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => setMode(m)}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium ${mode === m ? 'bg-neutral-900 text-white' : 'text-neutral-700'}`}
                  >
                    {m === 'single' ? 'Single' : 'Bulk'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-neutral-500 sm:inline">Style: {saveLabel}</span>
              <button type="button" className={ghostClass} onClick={() => setStyleOpen(true)} data-testid="open-style">
                <SlidersHorizontal className="h-4 w-4" /> Style
              </button>
            </div>
          </header>

          {mode === 'single' ? (
            <SingleView
              baseSpec={baseSpec}
              setTypewriter={setTypewriter}
              onDrawerChange={onViewDrawerChange}
              onHasVoiceover={setSingleHasVoiceover}
              styleOpen={styleOpen}
            />
          ) : (
            <BulkView baseSpec={baseSpec} onDrawerChange={onViewDrawerChange} styleOpen={styleOpen} />
          )}
        </div>
      </div>

      <StyleDrawer
        isOpen={styleOpen}
        onClose={() => setStyleOpen(false)}
        mode={mode}
        typewriter={typewriter}
        setTypewriter={setTypewriter}
        background={background}
        setBackground={setBackground}
        sound={sound}
        setSound={setSound}
        music={music}
        onPickMusic={(file) => void pickMusic(file)}
        onClearMusic={() => setMusic(null)}
        hasVoiceover={mode === 'bulk' || singleHasVoiceover}
        saveLabel={saveLabel}
      />
    </div>
  );
}
