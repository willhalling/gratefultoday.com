'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { MediaManagerModal } from '@/components/video-editor/media-manager';
import type { MediaItem, MediaType } from '@/types/media';
import {
  CONTENT_OS_CATEGORIES,
  CONTENT_OS_STATUS,
  CONTENT_OS_TOPICS,
  type ContentOsCategory,
  type ContentOsPost,
  type ContentOsStatus,
  type ContentOsTopic,
} from '@/types/content-os';
import { buildBulkJson, buildSingleJson } from '@/lib/content-os/exporters';

type FilterSort = 'updated' | 'score';

const EMPTY_EDIT: ContentOsPost | null = null;

interface GeneratedDraft {
  id: string;
  name: string;
  category: string;
  mainTopic: string;
  secondaryTopic: string;
  beats: string[];
  description: string;
  tags: string[];
}

interface GenerationFormState {
  category: ContentOsCategory;
  mainTopic: ContentOsTopic;
  secondaryTopic: ContentOsTopic;
  count: number;
  extraInstruction: string;
  mixAcrossTaxonomy: boolean;
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function postBeats(post: ContentOsPost): string[] {
  return [post.beat1, post.beat2, post.beat3 || '', post.beat4 || ''].filter(Boolean);
}

export default function ContentOsPage() {
  const [posts, setPosts] = useState<ContentOsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<FilterSort>('updated');

  const [editingPost, setEditingPost] = useState<ContentOsPost | null>(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationForm, setGenerationForm] = useState<GenerationFormState>({
    category: CONTENT_OS_CATEGORIES[0],
    mainTopic: CONTENT_OS_TOPICS[0],
    secondaryTopic: CONTENT_OS_TOPICS[1],
    count: 1,
    extraInstruction: '',
    mixAcrossTaxonomy: true,
  });
  const [showGenerationAdvanced, setShowGenerationAdvanced] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState<GeneratedDraft[]>([]);
  const [renderState, setRenderState] = useState<{
    postId: string | null;
    mode: 'server' | 'client' | 'lambda' | null;
    progress: string;
  }>({ postId: null, mode: null, progress: '' });
  const [mediaPicker, setMediaPicker] = useState<{
    open: boolean;
    target: 'background' | 'music' | null;
  }>({ open: false, target: null });

  async function loadPosts() {
    try {
      setLoading(true);
      setError('');
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (categoryFilter) qs.set('category', categoryFilter);
      if (topicFilter) qs.set('topic', topicFilter);
      if (statusFilter) qs.set('status', statusFilter);
      qs.set('sort', sort);

      const response = await fetch(`/api/content-os/posts?${qs.toString()}`);
      if (!response.ok) throw new Error('Failed to load posts');
      const data = (await response.json()) as { posts: ContentOsPost[] };
      setPosts(data.posts || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load posts';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const filteredPosts = useMemo(() => posts, [posts]);

  const selectedPosts = useMemo(
    () => filteredPosts.filter((post) => selectedIds.has(post.id)),
    [filteredPosts, selectedIds]
  );

  function toggleSelected(postId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  function setAllSelected() {
    const all = filteredPosts.map((post) => post.id);
    setSelectedIds(new Set(all));
  }

  function clearSelected() {
    setSelectedIds(new Set());
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    const ok = window.confirm(`Delete ${selectedIds.size} selected posts?`);
    if (!ok) return;

    await Promise.all(
      Array.from(selectedIds).map(async (id) => {
        await fetch(`/api/content-os/posts/${id}`, { method: 'DELETE' });
      })
    );

    clearSelected();
    await loadPosts();
  }

  function exportSelectedBulk() {
    if (selectedPosts.length === 0) return;
    const payload = buildBulkJson(selectedPosts);
    downloadJson('bulk.json', payload);
  }


  async function renderOnServer(post: ContentOsPost) {
    setRenderState({ postId: post.id, mode: 'server', progress: 'Rendering on server...' });
    try {
      const response = await fetch('/api/content-os/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Render failed.');
      setRenderState({ postId: post.id, mode: 'server', progress: `Done: ${data.renderUrl}` });
      await loadPosts();
    } catch (err) {
      setRenderState({
        postId: post.id,
        mode: 'server',
        progress: `Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async function renderOnLambda(post: ContentOsPost) {
    setRenderState({ postId: post.id, mode: 'lambda', progress: 'Dispatching to Lambda...' });
    try {
      const response = await fetch('/api/content-os/render/lambda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lambda dispatch failed.');

      setRenderState({ postId: post.id, mode: 'lambda', progress: 'Rendering on Lambda 0%...' });

      // Poll progress every 3s.
      const startedAt = Date.now();
      const poll = async (): Promise<void> => {
        if (Date.now() - startedAt > 15 * 60 * 1000) {
          throw new Error('Lambda render timed out after 15 minutes.');
        }
        const progressResp = await fetch(`/api/content-os/render/lambda/${post.id}`);
        const progressData = await progressResp.json();
        if (!progressResp.ok) throw new Error(progressData.error || 'Progress check failed.');

        if (progressData.done) {
          if (progressData.error) throw new Error(progressData.error);
          setRenderState({
            postId: post.id,
            mode: 'lambda',
            progress: `Done: ${progressData.renderUrl}`,
          });
          await loadPosts();
          return;
        }

        const pct = Math.round((progressData.progress ?? 0) * 100);
        setRenderState({
          postId: post.id,
          mode: 'lambda',
          progress: `Rendering on Lambda ${pct}%...`,
        });
        await new Promise((r) => setTimeout(r, 3000));
        return poll();
      };

      await poll();
    } catch (err) {
      setRenderState({
        postId: post.id,
        mode: 'lambda',
        progress: `Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async function renderInBrowser(post: ContentOsPost) {
    setRenderState({ postId: post.id, mode: 'client', progress: 'Loading renderer...' });
    try {
      const { renderPostInBrowser } = await import('@/lib/content-os/clientRender');
      const beats = postBeats(post);
      const inputProps: { beats: string[]; background?: { url: string; kind: 'image' | 'video' }; music?: { url: string } } = { beats };
      if (post.background) {
        const isVideo = /\.(mp4|mov|m4v|webm|mkv)$/i.test(post.background);
        inputProps.background = { url: post.background, kind: isVideo ? 'video' : 'image' };
      }
      if (post.music) inputProps.music = { url: post.music };

      const blob = await renderPostInBrowser({
        inputProps,
        onProgress: (p) => {
          setRenderState({
            postId: post.id,
            mode: 'client',
            progress: `Rendered ${p.renderedFrames}/${p.totalFrames} frames`,
          });
        },
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = post.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'gratitude';
      a.download = `${safeName}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      setRenderState({ postId: post.id, mode: 'client', progress: 'Downloaded.' });
    } catch (err) {
      setRenderState({
        postId: post.id,
        mode: 'client',
        progress: `Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
  function exportSingle(post: ContentOsPost) {
    const payload = buildSingleJson(post);
    const safeName = post.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'single';
    downloadJson(`${safeName}.single.json`, payload);
  }

  async function saveEdit() {
    if (!editingPost) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/content-os/posts/${editingPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingPost.name,
          category: editingPost.category,
          mainTopic: editingPost.mainTopic,
          secondaryTopic: editingPost.secondaryTopic,
          beat1: editingPost.beat1,
          beat2: editingPost.beat2,
          beat3: editingPost.beat3,
          beat4: editingPost.beat4,
          description: editingPost.description,
          tags: editingPost.tags,
          status: editingPost.status,
          score: Number(editingPost.score || 0),
          notes: editingPost.notes,
          background: editingPost.background,
          music: editingPost.music,
        }),
      });
      if (!response.ok) throw new Error('Failed to save post');
      setEditingPost(null);
      await loadPosts();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(postId: string, status: ContentOsStatus) {
    await fetch(`/api/content-os/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadPosts();
  }

  async function runGeneration() {
    setGenerating(true);
    setError('');
    try {
      const requestPayload = showGenerationAdvanced
        ? generationForm
        : {
            ...generationForm,
            mixAcrossTaxonomy: true,
          };

      const response = await fetch('/api/content-os/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });
      const payload = (await response.json()) as {
        posts?: Array<{
          name: string;
          category: string;
          mainTopic: string;
          secondaryTopic: string;
          beats: string[];
          description?: string;
          tags?: string[];
        }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate posts');
      }

      const drafts = (payload.posts || []).map((post, index) => ({
        id: `${Date.now()}-${index + 1}`,
        name: post.name,
        category: post.category,
        mainTopic: post.mainTopic,
        secondaryTopic: post.secondaryTopic,
        beats: post.beats,
        description: post.description || '',
        tags: post.tags || [],
      }));
      setGeneratedDrafts(drafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate posts');
    } finally {
      setGenerating(false);
    }
  }

  function updateDraft(id: string, patch: Partial<GeneratedDraft>) {
    setGeneratedDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  function rejectDraft(id: string) {
    setGeneratedDrafts((prev) => prev.filter((draft) => draft.id !== id));
  }

  async function saveDraft(id: string) {
    const draft = generatedDrafts.find((item) => item.id === id);
    if (!draft) return;

    const beats = draft.beats.filter((beat) => beat.trim()).slice(0, 4);
    if (beats.length < 2) {
      setError('A generated post needs at least 2 beats before saving');
      return;
    }

    const response = await fetch('/api/content-os/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: draft.name,
        category: draft.category,
        mainTopic: draft.mainTopic,
        secondaryTopic: draft.secondaryTopic,
        beat1: beats[0],
        beat2: beats[1],
        beat3: beats[2] || '',
        beat4: beats[3] || '',
        description: draft.description,
        tags: draft.tags,
        status: 'generated',
        score: 50,
      }),
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error || 'Failed to save generated post');
      return;
    }

    setGeneratedDrafts((prev) => prev.filter((item) => item.id !== id));
    await loadPosts();
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-neutral-50 px-4 py-6 md:px-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-6">
            <h1 className="text-2xl font-semibold text-neutral-900 md:text-3xl">Content OS</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Mobile-first post library for generate, curate, edit, and export workflows.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
            <h2 className="text-base font-semibold text-neutral-900">AI Generate</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Default mode auto-mixes lanes and topics so you can quickly generate very different options.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input
                type="number"
                min={1}
                max={20}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                value={generationForm.count}
                onChange={(e) =>
                  setGenerationForm((prev) => ({
                    ...prev,
                    count: Math.max(1, Math.min(20, Number(e.target.value || 1))),
                  }))
                }
              />
              <button
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
                onClick={runGeneration}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate varied posts'}
              </button>
              <button
                type="button"
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm"
                onClick={() => setShowGenerationAdvanced((prev) => !prev)}
              >
                {showGenerationAdvanced ? 'Hide advanced controls' : 'Customize lane/topics'}
              </button>
            </div>

            {showGenerationAdvanced && (
              <div className="mt-3 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={generationForm.category}
                    onChange={(e) =>
                      setGenerationForm((prev) => ({
                        ...prev,
                        category: e.target.value as ContentOsCategory,
                      }))
                    }
                  >
                    {CONTENT_OS_CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={generationForm.mainTopic}
                    onChange={(e) =>
                      setGenerationForm((prev) => ({
                        ...prev,
                        mainTopic: e.target.value as ContentOsTopic,
                      }))
                    }
                  >
                    {CONTENT_OS_TOPICS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={generationForm.secondaryTopic}
                    onChange={(e) =>
                      setGenerationForm((prev) => ({
                        ...prev,
                        secondaryTopic: e.target.value as ContentOsTopic,
                      }))
                    }
                  >
                    {CONTENT_OS_TOPICS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={generationForm.mixAcrossTaxonomy}
                    onChange={(e) =>
                      setGenerationForm((prev) => ({
                        ...prev,
                        mixAcrossTaxonomy: e.target.checked,
                      }))
                    }
                  />
                  Mix lanes and topics for broad ideation when generating multiple posts
                </label>
              </div>
            )}
            <textarea
              className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Optional extra instruction"
              value={generationForm.extraInstruction}
              onChange={(e) =>
                setGenerationForm((prev) => ({ ...prev, extraInstruction: e.target.value }))
              }
              rows={2}
            />

            {generatedDrafts.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-neutral-700">
                  Generated review queue ({generatedDrafts.length})
                </p>
                {generatedDrafts.map((draft) => (
                  <div key={draft.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <input
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      value={draft.name}
                      onChange={(e) => updateDraft(draft.id, { name: e.target.value })}
                    />
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {draft.beats.map((beat, index) => (
                        <textarea
                          key={`${draft.id}-beat-${index}`}
                          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                          value={beat}
                          onChange={(e) => {
                            const next = [...draft.beats];
                            next[index] = e.target.value;
                            updateDraft(draft.id, { beats: next });
                          }}
                          rows={2}
                        />
                      ))}
                    </div>
                    <input
                      className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      value={draft.description}
                      onChange={(e) => updateDraft(draft.id, { description: e.target.value })}
                      placeholder="Description"
                    />
                    <input
                      className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      value={draft.tags.join(', ')}
                      onChange={(e) =>
                        updateDraft(draft.id, {
                          tags: e.target.value
                            .split(',')
                            .map((item) => item.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Tags (comma separated)"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700"
                        onClick={() => saveDraft(draft.id)}
                      >
                        Save
                      </button>
                      <button
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
                        onClick={() => rejectDraft(draft.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-6 md:p-5">
            <input
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm lg:col-span-2"
              placeholder="Search beats or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {CONTENT_OS_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
            >
              <option value="">All topics</option>
              {CONTENT_OS_TOPICS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {CONTENT_OS_STATUS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value as FilterSort)}
              >
                <option value="updated">Sort: Updated</option>
                <option value="score">Sort: Score</option>
              </select>
              <button
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
                onClick={loadPosts}
              >
                Apply
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
              onClick={setAllSelected}
            >
              Select all
            </button>
            <button
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
              onClick={clearSelected}
            >
              Clear selection
            </button>
            <button
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
              onClick={deleteSelected}
              disabled={selectedIds.size === 0}
            >
              Delete selected ({selectedIds.size})
            </button>
            <button
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              onClick={exportSelectedBulk}
              disabled={selectedPosts.length === 0}
            >
              Export selected to bulk.json ({selectedPosts.length})
            </button>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {loading ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
              Loading posts...
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredPosts.map((post) => (
                  <div key={post.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(post.id)}
                          onChange={() => toggleSelected(post.id)}
                        />
                        <span className="font-semibold text-neutral-900">{post.name}</span>
                      </label>
                      <span className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                        {post.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-neutral-600">{post.beat1}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">
                      <span>{post.category}</span>
                      <span>·</span>
                      <span>{post.mainTopic}</span>
                      <span>·</span>
                      <span>score {post.score}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
                        onClick={() => setEditingPost(post)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
                        onClick={() => exportSingle(post)}
                      >
                        Export single.json
                      </button>
                      <button
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
                        onClick={() => quickStatus(post.id, 'approved')}
                      >
                        Mark approved
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-100 text-neutral-700">
                    <tr>
                      <th className="px-3 py-2"></th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Main Topic</th>
                      <th className="px-3 py-2">Secondary Topic</th>
                      <th className="px-3 py-2">Beat 1</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Score</th>
                      <th className="px-3 py-2">Updated</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.map((post) => (
                      <tr key={post.id} className="border-t border-neutral-200 align-top">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(post.id)}
                            onChange={() => toggleSelected(post.id)}
                          />
                        </td>
                        <td className="px-3 py-2 font-medium text-neutral-900">{post.name}</td>
                        <td className="px-3 py-2">{post.category}</td>
                        <td className="px-3 py-2">{post.mainTopic}</td>
                        <td className="px-3 py-2">{post.secondaryTopic}</td>
                        <td className="max-w-[260px] px-3 py-2 text-neutral-600">{post.beat1}</td>
                        <td className="px-3 py-2">{post.status}</td>
                        <td className="px-3 py-2">{post.score}</td>
                        <td className="px-3 py-2 text-neutral-500">
                          {new Date(post.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded border border-neutral-300 px-2 py-1 text-xs"
                              onClick={() => setEditingPost(post)}
                            >
                              Edit
                            </button>
                            <button
                              className="rounded border border-neutral-300 px-2 py-1 text-xs"
                              onClick={() => exportSingle(post)}
                            >
                              single.json
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {editingPost && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6">
              <div className="max-h-[90vh] w-full overflow-auto rounded-t-2xl bg-white p-4 md:max-w-3xl md:rounded-2xl md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">Edit post</h2>
                  <button
                    className="rounded border border-neutral-300 px-3 py-1 text-sm"
                    onClick={() => setEditingPost(null)}
                  >
                    Close
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={editingPost.name}
                    onChange={(e) => setEditingPost({ ...editingPost, name: e.target.value })}
                    placeholder="Name"
                  />
                  <input
                    type="number"
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={editingPost.score}
                    onChange={(e) => setEditingPost({ ...editingPost, score: Number(e.target.value || 0) })}
                    placeholder="Score"
                  />
                  <select
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={editingPost.category}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, category: e.target.value as ContentOsPost['category'] })
                    }
                  >
                    {CONTENT_OS_CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={editingPost.status}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, status: e.target.value as ContentOsPost['status'] })
                    }
                  >
                    {CONTENT_OS_STATUS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={editingPost.mainTopic}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, mainTopic: e.target.value as ContentOsPost['mainTopic'] })
                    }
                  >
                    {CONTENT_OS_TOPICS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={editingPost.secondaryTopic}
                    onChange={(e) =>
                      setEditingPost({
                        ...editingPost,
                        secondaryTopic: e.target.value as ContentOsPost['secondaryTopic'],
                      })
                    }
                  >
                    {CONTENT_OS_TOPICS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm md:col-span-2"
                    value={editingPost.beat1}
                    onChange={(e) => setEditingPost({ ...editingPost, beat1: e.target.value })}
                    placeholder="Beat 1"
                  />
                  <textarea
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm md:col-span-2"
                    value={editingPost.beat2}
                    onChange={(e) => setEditingPost({ ...editingPost, beat2: e.target.value })}
                    placeholder="Beat 2"
                  />
                  <textarea
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm md:col-span-2"
                    value={editingPost.beat3 || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, beat3: e.target.value })}
                    placeholder="Beat 3 (optional)"
                  />
                  <textarea
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm md:col-span-2"
                    value={editingPost.beat4 || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, beat4: e.target.value })}
                    placeholder="Beat 4 (optional)"
                  />
                  <div className="flex gap-2 md:col-span-1">
                    <input
                      className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      value={editingPost.background || ''}
                      onChange={(e) =>
                        setEditingPost({ ...editingPost, background: e.target.value })
                      }
                      placeholder="Background (optional)"
                    />
                    <button
                      type="button"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      onClick={() => setMediaPicker({ open: true, target: 'background' })}
                    >
                      Choose…
                    </button>
                  </div>
                  <div className="flex gap-2 md:col-span-1">
                    <input
                      className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      value={editingPost.music || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, music: e.target.value })}
                      placeholder="Music (optional)"
                    />
                    <button
                      type="button"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      onClick={() => setMediaPicker({ open: true, target: 'music' })}
                    >
                      Choose…
                    </button>
                  </div>
                  <textarea
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm md:col-span-2"
                    value={editingPost.description || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, description: e.target.value })}
                    placeholder="Description"
                  />
                  <input
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm md:col-span-2"
                    value={(editingPost.tags || []).join(', ')}
                    onChange={(e) =>
                      setEditingPost({
                        ...editingPost,
                        tags: e.target.value
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Tags (comma separated)"
                  />
                  <textarea
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm md:col-span-2"
                    value={editingPost.notes || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, notes: e.target.value })}
                    placeholder="Notes"
                  />
                </div>

                <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Live beat preview
                  </p>
                  <div className="space-y-1 text-sm text-neutral-800">
                    {postBeats(editingPost).map((beat, index) => (
                      <p key={`${editingPost.id}-preview-${index}`}>{beat}</p>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
                    onClick={saveEdit}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
                    onClick={() => exportSingle(editingPost)}
                  >
                    Export single.json
                  </button>
                  <button
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
                    onClick={() => renderInBrowser(editingPost)}
                    disabled={renderState.postId === editingPost.id}
                  >
                    Render in browser
                  </button>
                  <button
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
                    onClick={() => renderOnServer(editingPost)}
                    disabled={renderState.postId === editingPost.id}
                  >
                    Render on server
                  </button>
                  <button
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
                    onClick={() => renderOnLambda(editingPost)}
                    disabled={renderState.postId === editingPost.id}
                  >
                    Render on Lambda
                  </button>
                </div>
                {renderState.postId === editingPost.id && renderState.progress && (
                  <p className="mt-2 text-xs text-neutral-600">
                    [{renderState.mode}] {renderState.progress}
                  </p>
                )}
                {editingPost.renderUrl && (
                  <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Latest render
                    </p>
                    <video
                      src={editingPost.renderUrl}
                      controls
                      className="w-full max-w-xs rounded"
                    />
                    <a
                      href={editingPost.renderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-blue-600 underline"
                    >
                      Open in new tab
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <MediaManagerModal
        isOpen={mediaPicker.open}
        onClose={() => setMediaPicker({ open: false, target: null })}
        title={mediaPicker.target === 'music' ? 'Choose music' : 'Choose background'}
        mediaType={
          mediaPicker.target === 'music'
            ? ('audio' as MediaType)
            : mediaPicker.target === 'background'
              ? undefined
              : undefined
        }
        onSelectMedia={(item: MediaItem) => {
          if (!editingPost || !mediaPicker.target) return;
          if (mediaPicker.target === 'background') {
            setEditingPost({ ...editingPost, background: item.url });
          } else {
            setEditingPost({ ...editingPost, music: item.url });
          }
          setMediaPicker({ open: false, target: null });
        }}
      />
    </AdminGuard>
  );
}