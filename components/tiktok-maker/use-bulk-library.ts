'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchSavedVoiceover,
  generateScripts,
  generateVoiceover,
  loadLibrary,
  parsePastedScripts,
  saveStockPick,
  saveToLibrary,
  saveUploadedImage,
  scriptToLines,
  setImageArchived,
  stripAudioTags,
  updateLibraryScript,
  type LibraryImage,
  type LibraryRender,
  type LibraryScript,
  type LibraryVoiceover,
} from '@/lib/tiktok-maker/bulk';
import { creditLine, trackStockUse, type StockPhoto } from '@/lib/tiktok-maker/stock';
import { decodeAudioFile, type LineMedia } from '@/lib/tiktok-maker/tiktok-video';

/** Edits are saved this long after the last keystroke. */
const SAVE_DELAY_MS = 800;
/** Decoded voiceovers are ~6 MB each — keep only a few in memory. */
const DECODED_CACHE = 6;

export interface PoolImage {
  /** Library image id, or `pending-…` while it uploads. */
  id: string;
  name: string;
  /** What the renderer loads: local object URL, stock CDN URL or signed Storage link. */
  url: string;
  thumb: string;
  credit: string | null;
  stockId: string | null;
  localUrl: string | null;
  saveState: 'saving' | 'saved' | 'error';
}

export interface BulkItem extends LibraryScript {
  takes: LibraryVoiceover[];
  renders: LibraryRender[];
  saveState: 'saved' | 'saving' | 'error';
  voBusy: boolean;
  error: string;
}

export type ItemStatus = 'needs-voice' | 'needs-render' | 'rendered';

function poolImageFrom(img: LibraryImage, localUrl: string | null = null): PoolImage {
  return {
    id: img.id,
    name: img.name,
    url: localUrl ?? img.displayUrl,
    thumb: localUrl ?? img.thumb ?? img.displayUrl,
    credit: img.credit,
    stockId: img.stockId,
    localUrl,
    saveState: 'saved',
  };
}

function toItem(s: LibraryScript, takes: LibraryVoiceover[], renders: LibraryRender[]): BulkItem {
  return {
    ...s,
    imageId: s.imageId ?? null,
    lineImageIds: s.lineImageIds ?? null,
    takes,
    renders,
    saveState: 'saved',
    voBusy: false,
    error: '',
  };
}

/** The take spoken from the script as it is now (a later edit makes older takes stale). */
export function currentTake(item: BulkItem): LibraryVoiceover | null {
  for (let i = item.takes.length - 1; i >= 0; i--) if (item.takes[i].text === item.script) return item.takes[i];
  return null;
}

export function itemStatus(item: BulkItem): ItemStatus {
  const take = currentTake(item);
  if (!take) return 'needs-voice';
  return item.renders.some((r) => r.settings?.script === item.script && r.voiceoverId === take.id) ? 'rendered' : 'needs-render';
}

let pendingId = 0;

export function useBulkLibrary() {
  const [items, setItems] = useState<BulkItem[]>([]);
  const [library, setLibrary] = useState<LibraryScript[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [images, setImages] = useState<PoolImage[]>([]);
  const [removedImages, setRemovedImages] = useState<PoolImage[]>([]);
  const [imageError, setImageError] = useState('');
  const [startDay, setStartDay] = useState(12);
  const [stability, setStability] = useState(0.5);
  const [voicing, setVoicing] = useState<{ done: number; total: number } | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const decoded = useRef(new Map<string, AudioBuffer>());
  const mp3Urls = useRef(new Map<string, string>());
  const voiceCancel = useRef(false);

  const update = useCallback(
    (id: string, patch: Partial<BulkItem> | ((item: BulkItem) => Partial<BulkItem>)) =>
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...(typeof patch === 'function' ? patch(i) : patch) } : i))),
    [],
  );

  // ─── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadLibrary()
      .then(({ scripts, voiceovers, images: savedImages, renders }) => {
        if (cancelled) return;
        const takes = new Map<string, LibraryVoiceover[]>();
        voiceovers.forEach((v) => v.scriptId && takes.set(v.scriptId, [...(takes.get(v.scriptId) ?? []), v]));
        const rendersBy = new Map<string, LibraryRender[]>();
        renders.forEach((r) => rendersBy.set(r.scriptId, [...(rendersBy.get(r.scriptId) ?? []), r]));
        setLibrary(scripts);
        setItems(scripts.filter((s) => !s.archived).map((s) => toItem(s, takes.get(s.id) ?? [], rendersBy.get(s.id) ?? [])));
        setImages(savedImages.filter((i) => !i.archived).map((i) => poolImageFrom(i)));
        setRemovedImages(savedImages.filter((i) => i.archived).map((i) => poolImageFrom(i)));
        setStartDay(Math.max(11, ...scripts.map((s) => s.day)) + 1);
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setState('error');
        setError(err instanceof Error ? err.message : 'Could not load the library.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      saveTimers.current.forEach((t) => clearTimeout(t));
      itemsRef.current.forEach((i) => {
        if (i.saveState === 'saving') void updateLibraryScript(i.id, { day: i.day, title: i.title, script: i.script });
      });
      mp3Urls.current.forEach((u) => URL.revokeObjectURL(u));
      imagesRef.current.forEach((img) => img.localUrl && URL.revokeObjectURL(img.localUrl));
    },
    [],
  );

  // ─── Voiceovers (decoded on demand, small LRU) ───────────────────────────────
  const takeAudio = useCallback(async (takeId: string): Promise<{ buffer: AudioBuffer; url: string }> => {
    let url = mp3Urls.current.get(takeId);
    let buffer = decoded.current.get(takeId);
    if (buffer && url) {
      decoded.current.delete(takeId);
      decoded.current.set(takeId, buffer);
      return { buffer, url };
    }
    const mp3 = url ? await fetch(url).then((r) => r.blob()) : await fetchSavedVoiceover(takeId);
    if (!url) {
      url = URL.createObjectURL(mp3);
      mp3Urls.current.set(takeId, url);
    }
    buffer = await decodeAudioFile(new File([mp3], 'vo.mp3', { type: 'audio/mpeg' }));
    decoded.current.set(takeId, buffer);
    while (decoded.current.size > DECODED_CACHE) decoded.current.delete(decoded.current.keys().next().value as string);
    return { buffer, url };
  }, []);

  const voice = useCallback(
    async (id: string) => {
      const item = itemsRef.current.find((i) => i.id === id);
      if (!item || !item.script.trim()) return;
      update(id, { voBusy: true, error: '' });
      try {
        const { mp3, voiceoverId, saveError } = await generateVoiceover(item.script, stability, item.id);
        const take: LibraryVoiceover = {
          id: voiceoverId ?? `unsaved-${++pendingId}`,
          scriptId: item.id,
          text: item.script,
          stability,
          createdAt: new Date().toISOString(),
        };
        mp3Urls.current.set(take.id, URL.createObjectURL(mp3));
        update(id, (i) => ({
          takes: [...i.takes, take],
          voBusy: false,
          error: saveError ? `${saveError} Play it and save it from the player before leaving.` : '',
        }));
      } catch (err) {
        update(id, { voBusy: false, error: err instanceof Error ? err.message : 'Voiceover failed.' });
      }
    },
    [stability, update],
  );

  /** Voice every script whose current text has no take yet, one at a time. */
  const voiceAll = useCallback(async () => {
    const todo = itemsRef.current.filter((i) => !currentTake(i) && i.script.trim());
    voiceCancel.current = false;
    setVoicing({ done: 0, total: todo.length });
    for (let n = 0; n < todo.length && !voiceCancel.current; n++) {
      await voice(todo[n].id);
      setVoicing({ done: n + 1, total: todo.length });
    }
    setVoicing(null);
  }, [voice]);

  const stopVoicing = useCallback(() => {
    voiceCancel.current = true;
  }, []);

  // ─── Scripts ─────────────────────────────────────────────────────────────────
  const addScripts = useCallback((scripts: LibraryScript[]) => {
    setItems((prev) => [...prev, ...scripts.map((s) => toItem(s, [], []))]);
    setLibrary((prev) => [...prev, ...scripts]);
    setStartDay((d) => Math.max(d - 1, ...scripts.map((s) => s.day)) + 1);
  }, []);

  const generate = useCallback(
    async (count: number, direction: string) => {
      setError('');
      const seen = new Set<string>();
      const previous = [...library, ...itemsRef.current]
        .filter((e) => !seen.has(e.id) && seen.add(e.id))
        .sort((a, b) => a.day - b.day)
        .map((e) => ({ day: e.day, title: e.title, text: stripAudioTags(e.script).replace(/\n+/g, ' ').trim() }));
      try {
        const scripts = await generateScripts({ count, startDay, direction, previous });
        addScripts(scripts);
        return scripts;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Script generation failed.');
        return [];
      }
    },
    [addScripts, library, startDay],
  );

  const paste = useCallback(
    async (text: string) => {
      const parsed = parsePastedScripts(text, startDay);
      if (parsed.length === 0) {
        setError('No scripts found — start each one with a "DAY 12 — TITLE" line.');
        return false;
      }
      setError('');
      try {
        addScripts(await saveToLibrary(parsed));
        return true;
      } catch (err) {
        setError(err instanceof Error ? `Not saved: ${err.message}` : 'Could not save the scripts.');
        return false;
      }
    },
    [addScripts, startDay],
  );

  /** Change day/title/text; saved after a pause (the server keeps the old version). */
  const edit = useCallback(
    (id: string, patch: Partial<Pick<BulkItem, 'day' | 'title' | 'script'>>) => {
      update(id, { ...patch, saveState: 'saving' });
      const timers = saveTimers.current;
      clearTimeout(timers.get(id));
      timers.set(
        id,
        setTimeout(async () => {
          timers.delete(id);
          const item = itemsRef.current.find((i) => i.id === id);
          if (!item) return;
          try {
            await updateLibraryScript(id, { day: item.day, title: item.title, script: item.script });
            setLibrary((prev) => prev.map((s) => (s.id === id ? { ...s, day: item.day, title: item.title, script: item.script } : s)));
            update(id, (i) =>
              i.day === item.day && i.title === item.title && i.script === item.script && !timers.has(id) ? { saveState: 'saved' } : {},
            );
          } catch {
            update(id, { saveState: 'error' });
          }
        }, SAVE_DELAY_MS),
      );
    },
    [update],
  );

  /**
   * Apply an import: new scripts are saved (100 per request), changed ones are
   * updated (the server keeps each previous version). Returns what happened.
   */
  const importScripts = useCallback(
    async (
      creates: { day: number; title: string; script: string }[],
      updates: { id: string; day: number; title: string; script: string }[],
      onProgress?: (done: number, total: number) => void,
    ) => {
      const total = creates.length + updates.length;
      let done = 0;
      let created = 0;
      const failed: string[] = [];
      for (let i = 0; i < creates.length; i += 100) {
        const chunk = creates.slice(i, i + 100);
        try {
          addScripts(await saveToLibrary(chunk));
          created += chunk.length;
        } catch (err) {
          failed.push(`${chunk.length} new scripts: ${err instanceof Error ? err.message : 'save failed'}`);
        }
        done += chunk.length;
        onProgress?.(done, total);
      }
      let updated = 0;
      const queue = [...updates];
      const worker = async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          const u = next;
          try {
            await updateLibraryScript(u.id, { day: u.day, title: u.title, script: u.script });
            setItems((prev) => prev.map((i) => (i.id === u.id ? { ...i, day: u.day, title: u.title, script: u.script, saveState: 'saved' } : i)));
            setLibrary((prev) => prev.map((s) => (s.id === u.id ? { ...s, day: u.day, title: u.title, script: u.script } : s)));
            updated++;
          } catch (err) {
            failed.push(`DAY ${u.day} ${u.title}: ${err instanceof Error ? err.message : 'update failed'}`);
          }
          done++;
          onProgress?.(done, total);
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      return { created, updated, failed };
    },
    [addScripts],
  );

  const archive = useCallback(async (id: string) => {
    try {
      await updateLibraryScript(id, { archived: true });
      setLibrary((prev) => prev.map((s) => (s.id === id ? { ...s, archived: true } : s)));
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive the script.');
    }
  }, []);

  const restore = useCallback(async (script: LibraryScript) => {
    try {
      await updateLibraryScript(script.id, { archived: false });
      const { voiceovers, renders } = await loadLibrary();
      setLibrary((prev) => prev.map((s) => (s.id === script.id ? { ...s, archived: false } : s)));
      setItems((prev) => [
        ...prev,
        toItem(
          { ...script, archived: false },
          voiceovers.filter((v) => v.scriptId === script.id),
          renders.filter((r) => r.scriptId === script.id),
        ),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore the script.');
    }
  }, []);

  // ─── Images ──────────────────────────────────────────────────────────────────
  const chooseImage = useCallback(
    async (id: string, imageId: string | null) => {
      update(id, { imageId });
      try {
        await updateLibraryScript(id, { imageId });
      } catch {
        update(id, { error: 'Image choice not saved — try again.' });
      }
    },
    [update],
  );

  /** Per-line images (null turns it off). Saved to the script. */
  const setLineImages = useCallback(
    async (id: string, lineImageIds: (string | null)[] | null) => {
      update(id, { lineImageIds });
      try {
        await updateLibraryScript(id, { lineImageIds });
      } catch {
        update(id, { error: 'Per-line images not saved — try again.' });
      }
    },
    [update],
  );

  /** The renderer's per-line backgrounds for a script (images still in the pool only). */
  const lineMediaFor = useCallback((item: BulkItem): (LineMedia | null)[] | null => {
    if (!item.lineImageIds) return null;
    const pool = imagesRef.current;
    const media = item.lineImageIds.map((imgId) => {
      const img = imgId ? pool.find((i) => i.id === imgId) : null;
      return img ? { kind: 'image' as const, url: img.url } : null;
    });
    return media.some(Boolean) ? media : null;
  }, []);

  const addUploads = useCallback(async (files: File[]) => {
    setImageError('');
    for (const file of files) {
      const localUrl = URL.createObjectURL(file);
      const tempId = `pending-${++pendingId}`;
      setImages((prev) => [
        ...prev,
        { id: tempId, name: file.name, url: localUrl, thumb: localUrl, credit: null, stockId: null, localUrl, saveState: 'saving' },
      ]);
      try {
        const saved = await saveUploadedImage(file);
        setImages((prev) => prev.map((img) => (img.id === tempId ? poolImageFrom(saved, localUrl) : img)));
      } catch (err) {
        setImages((prev) => prev.map((img) => (img.id === tempId ? { ...img, saveState: 'error' } : img)));
        setImageError(`${file.name} was not saved: ${err instanceof Error ? err.message : 'upload failed'}`);
      }
    }
  }, []);

  const removeImages = useCallback(async (toRemove: PoolImage[]) => {
    setImageError('');
    for (const img of toRemove) {
      try {
        if (img.id.startsWith('pending-')) {
          if (img.localUrl) URL.revokeObjectURL(img.localUrl);
        } else {
          await setImageArchived(img.id, true);
          setRemovedImages((prev) => [...prev, img]);
        }
        setImages((prev) => prev.filter((i) => i.id !== img.id));
      } catch (err) {
        setImageError(err instanceof Error ? err.message : 'Could not update the image library.');
      }
    }
  }, []);

  const toggleStock = useCallback(
    async (photo: StockPhoto) => {
      const existing = imagesRef.current.find((img) => img.stockId === photo.id);
      if (existing) return removeImages([existing]);
      setImageError('');
      try {
        const saved = await saveStockPick({ ...photo, name: creditLine(photo) });
        setImages((prev) => [...prev, poolImageFrom(saved)]);
        setRemovedImages((prev) => prev.filter((i) => i.id !== saved.id));
        void trackStockUse(photo);
      } catch (err) {
        setImageError(err instanceof Error ? err.message : 'Could not save the photo.');
      }
    },
    [removeImages],
  );

  const restoreImage = useCallback(async (img: PoolImage) => {
    setImageError('');
    try {
      await setImageArchived(img.id, false);
      const { images: saved } = await loadLibrary();
      const fresh = saved.find((i) => i.id === img.id);
      setRemovedImages((prev) => prev.filter((i) => i.id !== img.id));
      setImages((prev) => [...prev, fresh ? poolImageFrom(fresh, img.localUrl) : img]);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Could not restore the image.');
    }
  }, []);

  /** The script's chosen image if still in the pool, else the round-robin pick by position. */
  const imageFor = useCallback(
    (item: BulkItem) => {
      const pool = imagesRef.current;
      if (pool.length === 0) return null;
      const chosen = pool.find((img) => img.id === item.imageId);
      if (chosen) return chosen;
      const index = Math.max(0, itemsRef.current.findIndex((i) => i.id === item.id));
      return pool[index % pool.length] ?? null;
    },
    [],
  );

  const addRender = useCallback(
    (scriptId: string, render: LibraryRender) => update(scriptId, (i) => ({ renders: [...i.renders, render] })),
    [update],
  );

  const counts = useMemo(() => {
    const c = { 'needs-voice': 0, 'needs-render': 0, rendered: 0 } as Record<ItemStatus, number>;
    items.forEach((i) => c[itemStatus(i)]++);
    return c;
  }, [items]);

  return {
    items,
    itemsRef,
    library,
    state,
    error,
    setError,
    images,
    removedImages,
    imageError,
    startDay,
    setStartDay,
    stability,
    setStability,
    voicing,
    counts,
    archivedScripts: library.filter((s) => s.archived),
    unsaved: items.some((i) => i.saveState !== 'saved') || images.some((img) => img.saveState === 'saving'),
    takeAudio,
    voice,
    voiceAll,
    stopVoicing,
    generate,
    paste,
    edit,
    importScripts,
    archive,
    restore,
    chooseImage,
    setLineImages,
    lineMediaFor,
    addUploads,
    removeImages,
    toggleStock,
    restoreImage,
    imageFor,
    addRender,
    linesFor: (item: BulkItem) => scriptToLines(item.script),
  };
}

export type BulkLibrary = ReturnType<typeof useBulkLibrary>;
