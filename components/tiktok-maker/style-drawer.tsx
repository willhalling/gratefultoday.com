'use client';

import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@heroui/react';
import { Wand2 } from 'lucide-react';
import { GRADE_PRESETS } from '@/lib/renderer/vendor/three/colourGrade';
import type { TypewriterSettings } from '@/lib/tiktok-maker/signature/scene';
import type { IntroFontKey, IntroTransition } from '@/lib/tiktok-maker/signature/types';
import {
  BACKGROUND_EFFECTS,
  CAMERA_MOTIONS,
  type BackgroundSettings,
  type SoundSettings,
} from '@/lib/tiktok-maker/tiktok-video';
import { Advanced, AudioPicker, Field, ghostClass, Group, inputClass, Slider, Toggle, type AudioFile } from './controls';

export interface StyleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'single' | 'bulk';
  typewriter: TypewriterSettings;
  setTypewriter: React.Dispatch<React.SetStateAction<TypewriterSettings>>;
  background: BackgroundSettings;
  setBackground: React.Dispatch<React.SetStateAction<BackgroundSettings>>;
  sound: SoundSettings;
  setSound: React.Dispatch<React.SetStateAction<SoundSettings>>;
  music: (AudioFile & { saveState: 'saving' | 'saved' | 'error' }) | null;
  onPickMusic: (file: File) => void;
  onClearMusic: () => void;
  hasVoiceover: boolean;
  /** "Saved" / "Saving…" for the shared style. */
  saveLabel: string;
}

/** The shared look: text style, background and sound. Basics up top, the rest under Advanced. */
export default function StyleDrawer(props: StyleDrawerProps) {
  const { typewriter, background, sound, mode } = props;
  const tw = <K extends keyof TypewriterSettings>(key: K, value: TypewriterSettings[K]) =>
    props.setTypewriter((prev) => ({ ...prev, [key]: value }));
  const bg = <K extends keyof BackgroundSettings>(key: K, value: BackgroundSettings[K]) =>
    props.setBackground((prev) => ({ ...prev, [key]: value }));
  const snd = <K extends keyof SoundSettings>(key: K, value: SoundSettings[K]) =>
    props.setSound((prev) => ({ ...prev, [key]: value }));
  const gradeBlurb = GRADE_PRESETS.find((p) => p.id === background.gradePreset)?.blurb;
  const voiced = props.hasVoiceover || mode === 'bulk';

  return (
    <Drawer isOpen={props.isOpen} onOpenChange={(open) => !open && props.onClose()} placement="right" size="md" backdrop="transparent">
      <DrawerContent>
        <DrawerHeader className="flex items-baseline justify-between gap-3 border-b border-neutral-200">
          <span>Style</span>
          <span className="pr-6 text-xs font-normal text-neutral-500" data-testid="style-save">
            {mode === 'bulk' ? `Applies to every video · ${props.saveLabel}` : props.saveLabel}
          </span>
        </DrawerHeader>
        <DrawerBody className="space-y-5 py-5" data-testid="style-drawer">
          <Group title="Text">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Multiple lines">
                <select className={inputClass} value={typewriter.mode} onChange={(e) => tw('mode', e.target.value as TypewriterSettings['mode'])}>
                  <option value="retype">Type, delete, retype</option>
                  <option value="stack">Stack</option>
                </select>
              </Field>
              <Field label="Font">
                <select className={inputClass} value={typewriter.font} onChange={(e) => tw('font', e.target.value as IntroFontKey)}>
                  <option value="jetbrains-mono">JetBrains Mono</option>
                  <option value="ibm-plex-mono">IBM Plex Mono</option>
                  <option value="space-mono">Space Mono</option>
                </select>
              </Field>
            </div>
            <Slider label="Font size" value={typewriter.fontPx} min={32} max={120} step={2} onChange={(v) => tw('fontPx', v)} format={(v) => `${v}px`} />
            <Slider label="Vertical position" value={typewriter.centerY} min={0.15} max={0.85} step={0.01} onChange={(v) => tw('centerY', v)} />
            <Slider label="Background dim" value={typewriter.scrim} min={0} max={0.8} step={0.05} onChange={(v) => tw('scrim', v)} />
            <Slider label="Typing speed (chars/s)" value={typewriter.typingCps} min={6} max={30} step={1} onChange={(v) => tw('typingCps', v)} format={(v) => String(v)} />
            <Advanced testId="text-advanced">
              {typewriter.mode === 'retype' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={mode === 'bulk' ? 'Resolve title (every video)' : 'Resolve title'}>
                    <input className={inputClass} value={typewriter.title} maxLength={80} onChange={(e) => tw('title', e.target.value)} />
                  </Field>
                  <Field label="Resolve transition">
                    <select className={inputClass} value={typewriter.transition} onChange={(e) => tw('transition', e.target.value as IntroTransition)}>
                      <option value="terminal">Terminal</option>
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                    </select>
                  </Field>
                </div>
              )}
              <Slider label="Lead-in (ms)" value={typewriter.leadInMs} min={0} max={3000} step={50} onChange={(v) => tw('leadInMs', v)} format={(v) => String(v)} />
              <Slider label="Pause after line (ms)" value={typewriter.pauseMs} min={0} max={2000} step={50} onChange={(v) => tw('pauseMs', v)} format={(v) => String(v)} />
              <div className="grid grid-cols-3 gap-3">
                <Field label="Align">
                  <select className={inputClass} value={typewriter.align} onChange={(e) => tw('align', e.target.value as 'left' | 'center')}>
                    <option value="center">Centre</option>
                    <option value="left">Left</option>
                  </select>
                </Field>
                <Field label="Cursor">
                  <select className={inputClass} value={typewriter.cursorStyle} onChange={(e) => tw('cursorStyle', e.target.value as 'block' | 'bar')}>
                    <option value="bar">Bar</option>
                    <option value="block">Block</option>
                  </select>
                </Field>
                <Field label="Take (seed)">
                  <input
                    type="number"
                    className={inputClass}
                    value={typewriter.seed}
                    min={1}
                    onChange={(e) => tw('seed', Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Toggle label="Prompt (>)" checked={typewriter.showPrompt} onChange={(v) => tw('showPrompt', v)} />
                <Toggle label="Text shadow" checked={typewriter.shadow} onChange={(v) => tw('shadow', v)} />
                {(['text', 'prompt', 'cursor'] as const).map((key) => (
                  <label key={key} className="flex items-center gap-1 text-sm capitalize text-neutral-700">
                    <input
                      type="color"
                      value={typewriter.colors[key]}
                      onChange={(e) => tw('colors', { ...typewriter.colors, [key]: e.target.value })}
                      className="h-7 w-9 cursor-pointer rounded border border-neutral-300"
                    />
                    {key}
                  </label>
                ))}
              </div>
            </Advanced>
          </Group>

          <Group title="Background">
            <button
              type="button"
              className={ghostClass}
              data-testid="gt-look"
              title="Low-contrast bleached grade, film grain, slow push-in"
              onClick={() => {
                props.setBackground((prev) => ({
                  ...prev,
                  effect: 'still',
                  gradePreset: 'bleached',
                  gradeIntensity: 0.7,
                  cameraMotion: 'push-in',
                  cameraIntensity: 0.3,
                  filmGrain: true,
                }));
                tw('scrim', 0.25);
              }}
            >
              <Wand2 className="h-4 w-4" /> Grateful Today look
            </button>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Effect">
                <select className={inputClass} value={background.effect} onChange={(e) => bg('effect', e.target.value as BackgroundSettings['effect'])} data-testid="effect-select">
                  {BACKGROUND_EFFECTS.map((fx) => (
                    <option key={fx.id} value={fx.id}>
                      {fx.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Camera motion">
                <select className={inputClass} value={background.cameraMotion} onChange={(e) => bg('cameraMotion', e.target.value as BackgroundSettings['cameraMotion'])}>
                  {CAMERA_MOTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {background.effect !== 'still' && (
              <Slider label="Effect intensity" value={background.effectIntensity} min={0} max={1} step={0.05} onChange={(v) => bg('effectIntensity', v)} />
            )}
            <Field label="Colour grade">
              <select className={inputClass} value={background.gradePreset} onChange={(e) => bg('gradePreset', e.target.value)}>
                {GRADE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              {gradeBlurb && <span className="mt-1 block text-xs text-neutral-500">{gradeBlurb}</span>}
            </Field>
            <Slider label="Grade intensity" value={background.gradeIntensity} min={0} max={1} step={0.05} onChange={(v) => bg('gradeIntensity', v)} />
            <Advanced>
              <Slider label="Camera intensity" value={background.cameraIntensity} min={0} max={1} step={0.05} onChange={(v) => bg('cameraIntensity', v)} />
              <div className="flex flex-wrap gap-4">
                <Toggle label="Film grain" checked={background.filmGrain} onChange={(v) => bg('filmGrain', v)} />
                {background.effect === 'rgb-glitch' && (
                  <Toggle label="Black & white under glitch" checked={background.glitchGrayscale} onChange={(v) => bg('glitchGrayscale', v)} />
                )}
              </div>
            </Advanced>
          </Group>

          <Group title="Sound">
            <AudioPicker
              label="Background sound (loops / trims to fit)"
              value={props.music}
              testId="music-upload"
              onPick={props.onPickMusic}
              onClear={props.onClearMusic}
              note={props.music ? { saving: 'saving…', saved: 'saved', error: 'not saved' }[props.music.saveState] : undefined}
            />
            {props.music && <Slider label="Background volume" value={sound.musicVolume} min={0} max={1} step={0.05} onChange={(v) => snd('musicVolume', v)} />}
            {voiced ? (
              <Slider label="Hold after voiceover" value={sound.tailSec} min={0} max={5} step={0.25} onChange={(v) => snd('tailSec', v)} format={(v) => `${v}s`} />
            ) : (
              <Slider label="Length (no voiceover)" value={sound.defaultLengthSec} min={3} max={60} step={1} onChange={(v) => snd('defaultLengthSec', v)} format={(v) => `${v}s`} />
            )}
            <Toggle label="Keystroke sounds" checked={typewriter.sound.enabled} onChange={(v) => tw('sound', { ...typewriter.sound, enabled: v })} />
            <Advanced>
              {voiced && (
                <Slider label="Voiceover volume" value={sound.voiceVolume} min={0} max={1.5} step={0.05} onChange={(v) => snd('voiceVolume', v)} />
              )}
              {voiced && props.music && (
                <Toggle label="Duck music under voice" checked={sound.duckMusic} onChange={(v) => snd('duckMusic', v)} />
              )}
              {typewriter.sound.enabled && (
                <>
                  <Slider
                    label="Keystroke volume"
                    value={typewriter.sound.keyVolume}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) => tw('sound', { ...typewriter.sound, keyVolume: v })}
                  />
                  <Field label="Keys">
                    <select
                      className={inputClass}
                      value={typewriter.sound.keyStyle}
                      onChange={(e) => tw('sound', { ...typewriter.sound, keyStyle: e.target.value as 'soft' | 'mechanical' })}
                    >
                      <option value="soft">Soft keys</option>
                      <option value="mechanical">Mechanical keys</option>
                    </select>
                  </Field>
                </>
              )}
            </Advanced>
          </Group>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
