'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cancelQueuedRenderJobs,
  enqueueRenderJobs,
  listRenderJobs,
  saveRender,
  updateRenderJob,
  type LibraryRender,
  type RenderJob,
} from '@/lib/tiktok-maker/bulk';
import type { TikTokSpec } from '@/lib/tiktok-maker/tiktok-video';

export interface PreparedJob {
  spec: TikTokSpec;
  fileName: string;
  voiceoverId: string | null;
  imageId: string | null;
  settings: Record<string, unknown>;
}

interface Options {
  /** Build everything a job needs (loads the voiceover); throw to fail the job. */
  prepare: (scriptId: string) => Promise<PreparedJob>;
  onRendered: (scriptId: string, render: LibraryRender) => void;
}

/**
 * The bulk render worker: jobs live in Firestore (so a reload resumes where it
 * stopped), and this tab renders them one at a time with a single renderer,
 * uploading each MP4 to the library as it finishes.
 */
export function useRenderQueue({ prepare, onRendered }: Options) {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<{ jobId: string; scriptId: string; progress: number } | null>(null);
  const [error, setError] = useState('');
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const runningRef = useRef(false);
  const pauseRef = useRef(false);
  const prepareRef = useRef(prepare);
  prepareRef.current = prepare;
  const onRenderedRef = useRef(onRendered);
  onRenderedRef.current = onRendered;

  const patchLocal = (id: string, patch: Partial<RenderJob>) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: new Date().toISOString() } : j)));

  // A job left "rendering" by a closed tab goes back in the queue.
  useEffect(() => {
    listRenderJobs()
      .then(async (list) => {
        const interrupted = list.filter((j) => j.status === 'rendering');
        await Promise.all(interrupted.map((j) => updateRenderJob(j.id, { status: 'queued' }).catch(() => undefined)));
        setJobs(list.map((j) => (j.status === 'rendering' ? { ...j, status: 'queued' } : j)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the render queue.'))
      .finally(() => setLoaded(true));
  }, []);

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    pauseRef.current = false;
    setRunning(true);
    try {
      for (;;) {
        if (pauseRef.current) break;
        const job = jobsRef.current.find((j) => j.status === 'queued');
        if (!job) break;
        patchLocal(job.id, { status: 'rendering', error: null, attempts: job.attempts + 1 });
        setCurrent({ jobId: job.id, scriptId: job.scriptId, progress: 0 });
        try {
          await updateRenderJob(job.id, { status: 'rendering', error: null, attempt: true });
          const prepared = await prepareRef.current(job.scriptId);
          const { renderTikTokMp4, clipLengthSec } = await import('@/lib/tiktok-maker/tiktok-video');
          const blob = await renderTikTokMp4(prepared.spec, {
            onProgress: (progress) => setCurrent((c) => (c && c.jobId === job.id ? { ...c, progress } : c)),
          });
          const render = await saveRender(blob, {
            scriptId: job.scriptId,
            voiceoverId: prepared.voiceoverId,
            imageId: prepared.imageId,
            fileName: prepared.fileName,
            durationSec: clipLengthSec(prepared.spec),
            settings: prepared.settings,
          });
          await updateRenderJob(job.id, { status: 'done', renderId: render.id, error: null });
          patchLocal(job.id, { status: 'done', renderId: render.id });
          onRenderedRef.current(job.scriptId, render);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Render failed.';
          patchLocal(job.id, { status: 'failed', error: message });
          await updateRenderJob(job.id, { status: 'failed', error: message }).catch(() => undefined);
        }
        // Let the page breathe (and GC the last renderer) between videos.
        await new Promise((r) => setTimeout(r, 50));
      }
    } finally {
      runningRef.current = false;
      setRunning(false);
      setCurrent(null);
    }
  }, []);

  const enqueue = useCallback(
    async (scriptIds: string[], { start = true } = {}) => {
      if (scriptIds.length === 0) return;
      setError('');
      try {
        const created = await enqueueRenderJobs(scriptIds);
        setJobs((prev) => [...prev, ...created]);
        jobsRef.current = [...jobsRef.current, ...created];
        if (start) void run();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not queue the renders.');
      }
    },
    [run],
  );

  /** Stop after the video that's rendering now. */
  const pause = useCallback(() => {
    pauseRef.current = true;
  }, []);

  const cancelQueued = useCallback(async () => {
    pauseRef.current = true;
    try {
      await cancelQueuedRenderJobs();
      setJobs((prev) => prev.map((j) => (j.status === 'queued' ? { ...j, status: 'cancelled' } : j)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the queue.');
    }
  }, []);

  const retryFailed = useCallback(async () => {
    const failed = [...new Set(jobsRef.current.filter((j) => j.status === 'failed').map((j) => j.scriptId))];
    await enqueue(failed);
  }, [enqueue]);

  /** Latest job status per script (one pass, not one scan per tile). */
  const statusByScript = useMemo(() => {
    const latest = new Map<string, RenderJob>();
    for (const j of jobs) {
      const prev = latest.get(j.scriptId);
      if (!prev || j.createdAt > prev.createdAt) latest.set(j.scriptId, j);
    }
    return latest;
  }, [jobs]);
  const statusFor = useCallback((scriptId: string) => statusByScript.get(scriptId)?.status ?? null, [statusByScript]);

  const queued = jobs.filter((j) => j.status === 'queued').length;
  const failed = jobs.filter((j) => j.status === 'failed').length;
  const done = jobs.filter((j) => j.status === 'done').length;

  return { jobs, loaded, running, current, error, queued, failed, done, enqueue, run, pause, cancelQueued, retryFailed, statusFor };
}

export type RenderQueue = ReturnType<typeof useRenderQueue>;
