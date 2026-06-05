'use client';

// ─── Redesigned with HeroUI v2 components ───────────────────────────────────
// Mobile-first. Tap any post card to open the edit bottom-sheet.
// Render progress uses a Progress bar; re-render is always available after
// a render completes or errors. Preview renders the first 2s inline.

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Load Remotion Player only client-side (it touches browser APIs).
const RemotionPlayer = dynamic(
  () => import('@remotion/player').then((m) => m.Player),
  { ssr: false },
);

// Load QR code only client-side.
const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((m) => m.QRCodeSVG),
  { ssr: false },
);
import AdminGuard from '@/components/AdminGuard';
import { MediaManagerModal } from '@/components/video-editor/media-manager';
import type { MediaItem, MediaType } from '@/types/media';
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Progress,
  Select,
  SelectItem,
  Textarea,
  useDisclosure,
} from '@heroui/react';
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
import { backgroundKind } from '@/lib/content-os/backgroundKind';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterSort = 'created' | 'updated' | 'score';

interface GeneratedDraft {
  id: string;
  name: string;
  category: string;
  mainTopic: string;
  secondaryTopic: string;
  beats: string[];
  description: string;
  tags: string[];
  headlineWord: string;
}

interface GenerationFormState {
  category: ContentOsCategory;
  mainTopic: ContentOsTopic;
  secondaryTopic: ContentOsTopic;
  count: number;
  extraInstruction: string;
  mixAcrossTaxonomy: boolean;
}

interface RenderState {
  postId: string | null;
  mode: 'server' | 'client' | 'lambda' | null;
  /** idle = not started; rendering = in progress; done = success; error = failed */
  phase: 'idle' | 'rendering' | 'done' | 'error';
  progress: number; // 0–100
  message: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDraftForSharing(draft: GeneratedDraft): string {
  const lines = [draft.name.trim(), '', ...draft.beats.map((beat) => beat.trim())];

  if (draft.description.trim()) {
    lines.push('', draft.description.trim());
  }

  if (draft.tags.length > 0) {
    lines.push('', draft.tags.join(' '));
  }

  return lines.filter((line, index, arr) => !(line === '' && arr[index - 1] === '')).join('\n');
}

function postBeats(post: ContentOsPost): string[] {
  return [post.beat1, post.beat2, post.beat3 || '', post.beat4 || ''].filter(Boolean);
}

function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatBeatsForCopy(post: ContentOsPost): string {
  return postBeats(post).join('\n');
}

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'secondary'> = {
  generated: 'default',
  approved: 'success',
  rendered: 'primary',
  rejected: 'danger',
  archived: 'default',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ContentOsPage() {
  const { isOpen, onOpen, onClose: modalClose } = useDisclosure();

  // --- core data ---
  const [posts, setPosts] = useState<ContentOsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- filters ---
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<FilterSort>('created');

  // --- editing ---
  const [editingPost, setEditingPost] = useState<ContentOsPost | null>(null);
  const [saving, setSaving] = useState(false);

  // --- generation ---
  const [generating, setGenerating] = useState(false);
  const [generationForm, setGenerationForm] = useState<GenerationFormState>({
    category: CONTENT_OS_CATEGORIES[0],
    mainTopic: CONTENT_OS_TOPICS[0],
    secondaryTopic: CONTENT_OS_TOPICS[1],
    count: 3,
    extraInstruction: '',
    mixAcrossTaxonomy: true,
  });
  const [generatedDrafts, setGeneratedDrafts] = useState<GeneratedDraft[]>([]);
  const [copiedBeatsPostId, setCopiedBeatsPostId] = useState<string | null>(null);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);

  // --- render / preview ---
  const [renderState, setRenderState] = useState<RenderState>({
    postId: null, mode: null, phase: 'idle', progress: 0, message: '',
  });
  const [showPlayer, setShowPlayer] = useState(false);

  // --- media picker ---
  const [mediaPicker, setMediaPicker] = useState<{
    open: boolean;
    target: 'background' | 'music' | null;
  }>({ open: false, target: null });

  // ---------------------------------------------------------------------------
  // Modal
  // ---------------------------------------------------------------------------

  function openEdit(post: ContentOsPost) {
    setEditingPost(post);
    if (renderState.postId !== post.id) {
      setRenderState({ postId: null, mode: null, phase: 'idle', progress: 0, message: '' });
    }
    setShowPlayer(true);
    onOpen();
  }

  function closeEdit() {
    modalClose();
    setEditingPost(null);
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  async function loadPosts() {
    try {
      setLoading(true);
      setError('');
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (categoryFilter) qs.set('category', categoryFilter);
      if (statusFilter) qs.set('status', statusFilter);
      qs.set('sort', sort);
      const res = await fetch(`/api/content-os/posts?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to load posts');
      const data = (await res.json()) as { posts: ContentOsPost[] };
      setPosts(data.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
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
    () => filteredPosts.filter((p) => selectedIds.has(p.id)),
    [filteredPosts, selectedIds],
  );

  // ---------------------------------------------------------------------------
  // Selection / bulk
  // ---------------------------------------------------------------------------

  function toggleSelected(postId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected posts?`)) return;
    await Promise.all(
      Array.from(selectedIds).map((id) => fetch(`/api/content-os/posts/${id}`, { method: 'DELETE' })),
    );
    setSelectedIds(new Set());
    await loadPosts();
  }

  function exportSelectedBulk() {
    if (selectedPosts.length === 0) return;
    downloadJson('bulk.json', buildBulkJson(selectedPosts));
  }

  // ---------------------------------------------------------------------------
  // Edit / save
  // ---------------------------------------------------------------------------

  async function saveEdit() {
    if (!editingPost) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/content-os/posts/${editingPost.id}`, {
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
          headlineWord: editingPost.headlineWord || '',
        }),
      });
      if (!res.ok) throw new Error('Failed to save post');
      closeEdit();
      await loadPosts();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setSaving(false);
    }
  }

  function exportSingle(post: ContentOsPost) {
    const safeName = post.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'single';
    downloadJson(`${safeName}.single.json`, buildSingleJson(post));
  }

  async function copyPostBeats(post: ContentOsPost) {
    try {
      await navigator.clipboard.writeText(formatBeatsForCopy(post));
      setCopiedBeatsPostId(post.id);
      window.setTimeout(() => {
        setCopiedBeatsPostId((current) => (current === post.id ? null : current));
      }, 2000);
    } catch {
      setError('Failed to copy beats');
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function buildInputProps(post: ContentOsPost) {
    const beats = postBeats(post);
    const props: {
      beats: string[];
      background?: { url: string; kind: 'image' | 'video' };
      music?: { url: string };
      headlineWord?: string;
    } = { beats };
    if (post.headlineWord?.trim()) props.headlineWord = post.headlineWord.trim();
    if (post.background) props.background = { url: post.background, kind: backgroundKind(post.background) };
    if (post.music) props.music = { url: post.music };
    return props;
  }

  async function renderInBrowser(post: ContentOsPost) {
    setRenderState({ postId: post.id, mode: 'client', phase: 'rendering', progress: 0, message: 'Loading renderer…' });
    try {
      const { renderPostInBrowser } = await import('@/lib/content-os/clientRender');
      const blob = await renderPostInBrowser({
        inputProps: buildInputProps(post),
        onProgress: (p) => {
          const pct = p.totalFrames > 0 ? Math.round((p.renderedFrames / p.totalFrames) * 100) : 0;
          setRenderState({
            postId: post.id, mode: 'client', phase: 'rendering',
            progress: pct, message: `${p.renderedFrames} / ${p.totalFrames} frames`,
          });
        },
      });

      // Trigger browser download immediately.
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = `${post.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'gratitude'}.mp4`;
      a.click();
      URL.revokeObjectURL(localUrl);

      // Upload via server API (Admin SDK bypasses Storage security rules).
      setRenderState({ postId: post.id, mode: 'client', phase: 'rendering', progress: 100, message: 'Uploading…' });
      const form = new FormData();
      form.append('postId', post.id);
      form.append('video', new File([blob], 'render.mp4', { type: 'video/mp4' }));
      const uploadRes = await fetch('/api/content-os/render/upload', { method: 'POST', body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed.');

      setRenderState({ postId: post.id, mode: 'client', phase: 'done', progress: 100, message: uploadData.renderUrl });
      await loadPosts();
    } catch (err) {
      setRenderState({
        postId: post.id, mode: 'client', phase: 'error', progress: 0,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function renderOnServer(post: ContentOsPost) {
    setRenderState({ postId: post.id, mode: 'server', phase: 'rendering', progress: 0, message: 'Rendering on server…' });
    try {
      const res = await fetch('/api/content-os/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Render failed.');
      setRenderState({ postId: post.id, mode: 'server', phase: 'done', progress: 100, message: data.renderUrl ?? 'Done.' });
      await loadPosts();
    } catch (err) {
      setRenderState({
        postId: post.id, mode: 'server', phase: 'error', progress: 0,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function renderOnLambda(post: ContentOsPost) {
    setRenderState({ postId: post.id, mode: 'lambda', phase: 'rendering', progress: 0, message: 'Dispatching to Lambda…' });
    try {
      const res = await fetch('/api/content-os/render/lambda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lambda dispatch failed.');

      const startedAt = Date.now();
      const poll = async (): Promise<void> => {
        if (Date.now() - startedAt > 15 * 60 * 1000) throw new Error('Lambda timed out after 15 min.');
        const pr = await fetch(`/api/content-os/render/lambda/${post.id}`);
        const pd = await pr.json();
        if (!pr.ok) throw new Error(pd.error || 'Progress check failed.');
        if (pd.done) {
          if (pd.error) throw new Error(pd.error);
          setRenderState({ postId: post.id, mode: 'lambda', phase: 'done', progress: 100, message: pd.renderUrl ?? 'Done.' });
          await loadPosts();
          return;
        }
        const pct = Math.round((pd.progress ?? 0) * 100);
        setRenderState({ postId: post.id, mode: 'lambda', phase: 'rendering', progress: pct, message: `Lambda ${pct}%…` });
        await new Promise((r) => setTimeout(r, 3000));
        return poll();
      };
      await poll();
    } catch (err) {
      setRenderState({
        postId: post.id, mode: 'lambda', phase: 'error', progress: 0,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  function resetRenderState() {
    setRenderState({ postId: null, mode: null, phase: 'idle', progress: 0, message: '' });
  }

  // ---------------------------------------------------------------------------
  // Generation
  // ---------------------------------------------------------------------------

  async function runGeneration() {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/content-os/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generationForm),
      });
      const payload = (await res.json()) as {
        posts?: Array<{ name: string; category: string; mainTopic: string; secondaryTopic: string; beats: string[]; description?: string; tags?: string[]; headlineWord?: string }>;
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error || 'Failed to generate posts');
      setGeneratedDrafts(
        (payload.posts || []).map((p, i) => ({
          id: `${Date.now()}-${i}`,
          name: p.name, category: p.category, mainTopic: p.mainTopic, secondaryTopic: p.secondaryTopic,
          beats: p.beats, description: p.description || '', tags: p.tags || [],
          headlineWord: p.headlineWord || '',
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate posts');
    } finally {
      setGenerating(false);
    }
  }

  function updateDraft(id: string, patch: Partial<GeneratedDraft>) {
    setGeneratedDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function rejectDraft(id: string) {
    setGeneratedDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  async function copyDraft(draft: GeneratedDraft) {
    try {
      await navigator.clipboard.writeText(formatDraftForSharing(draft));
      setCopiedDraftId(draft.id);
      window.setTimeout(() => {
        setCopiedDraftId((current) => (current === draft.id ? null : current));
      }, 2000);
    } catch {
      setError('Failed to copy draft');
    }
  }

  async function saveDraft(id: string) {
    const draft = generatedDrafts.find((d) => d.id === id);
    if (!draft) return;
    const beats = draft.beats.filter((b) => b.trim()).slice(0, 4);
    if (beats.length < 2) { setError('Need at least 2 beats'); return; }
    const res = await fetch('/api/content-os/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: draft.name, category: draft.category, mainTopic: draft.mainTopic,
        secondaryTopic: draft.secondaryTopic, beat1: beats[0], beat2: beats[1],
        beat3: beats[2] || '', beat4: beats[3] || '', description: draft.description,
        tags: draft.tags, status: 'generated', score: 50, headlineWord: draft.headlineWord || '',
      }),
    });
    if (!res.ok) { setError((await res.json()).error || 'Failed to save'); return; }
    setGeneratedDrafts((prev) => prev.filter((d) => d.id !== id));
    await loadPosts();
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const isRendering = renderState.phase === 'rendering';

  // Lazily-loaded Remotion composition — only imported when the player is shown.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [playerComp, setPlayerComp] = useState<{ component: any; durationInFrames: number } | null>(null);
  const playerCompPostRef = useRef<string | null>(null);

  useEffect(() => {
    if (!showPlayer || !editingPost) return;
    if (playerCompPostRef.current === editingPost.id && playerComp) return;
    playerCompPostRef.current = editingPost.id;
    // Dynamically import to avoid pulling Remotion into the initial bundle.
    Promise.all([
      import('@/remotion/gratitude/GratitudePost'),
      import('@/remotion/gratitude/constants'),
    ]).then(([{ GratitudePost }, { computeDurationInFrames }]) => {
      const beats = postBeats(editingPost);
      setPlayerComp({ component: GratitudePost, durationInFrames: computeDurationInFrames(beats, editingPost.headlineWord) });
    }).catch(() => setPlayerComp(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPlayer, editingPost?.id]);

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <AdminGuard>
      <div className="min-h-screen bg-default-50 px-3 py-4 md:px-6 md:py-8">
        <div className="mx-auto max-w-4xl space-y-4">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <Card shadow="none" className="border border-divider">
            <CardHeader className="px-5 py-4">
              <div>
                <h1 className="text-2xl font-semibold">Content OS</h1>
                <p className="mt-0.5 text-sm text-default-500">Generate, curate, edit, and render posts.</p>
              </div>
            </CardHeader>
          </Card>

          {/* ── Error banner ───────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              <span>{error}</span>
              <button className="shrink-0 underline" onClick={() => setError('')}>Dismiss</button>
            </div>
          )}

          {/* ── AI Generate ────────────────────────────────────────────────── */}
          <Card shadow="none" className="border border-divider">
            <CardHeader className="px-5 pt-4 pb-0">
              <h2 className="font-semibold">AI Generate</h2>
            </CardHeader>
            <CardBody className="space-y-3 px-5 py-4">
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  size="sm"
                  aria-label="Count"
                  className="w-20"
                  min={1}
                  max={20}
                  value={String(generationForm.count)}
                  onValueChange={(v) =>
                    setGenerationForm((p) => ({ ...p, count: Math.max(1, Math.min(20, Number(v) || 1)) }))
                  }
                />
                <Button color="primary" size="sm" isLoading={generating} onPress={runGeneration}>
                  {generating ? 'Generating…' : 'Generate varied posts'}
                </Button>
              </div>

              <Accordion isCompact variant="light" className="-mx-1">
                <AccordionItem key="adv" aria-label="Advanced options" title={<span className="text-sm text-default-500">Customize lane / topics</span>}>
                  <div className="space-y-3 pb-2">
                    <div className="grid gap-3 md:grid-cols-3">
                      <Select
                        size="sm"
                        label="Category"
                        selectedKeys={new Set([generationForm.category])}
                        onSelectionChange={(keys) => {
                          if (keys === 'all') return;
                          const val = [...keys][0] as ContentOsCategory;
                          if (val) setGenerationForm((p) => ({ ...p, category: val }));
                        }}
                      >
                        {CONTENT_OS_CATEGORIES.map((v) => <SelectItem key={v}>{v}</SelectItem>)}
                      </Select>
                      <Select
                        size="sm"
                        label="Main Topic"
                        selectedKeys={new Set([generationForm.mainTopic])}
                        onSelectionChange={(keys) => {
                          if (keys === 'all') return;
                          const val = [...keys][0] as ContentOsTopic;
                          if (val) setGenerationForm((p) => ({ ...p, mainTopic: val }));
                        }}
                      >
                        {CONTENT_OS_TOPICS.map((v) => <SelectItem key={v}>{v}</SelectItem>)}
                      </Select>
                      <Select
                        size="sm"
                        label="Secondary Topic"
                        selectedKeys={new Set([generationForm.secondaryTopic])}
                        onSelectionChange={(keys) => {
                          if (keys === 'all') return;
                          const val = [...keys][0] as ContentOsTopic;
                          if (val) setGenerationForm((p) => ({ ...p, secondaryTopic: val }));
                        }}
                      >
                        {CONTENT_OS_TOPICS.map((v) => <SelectItem key={v}>{v}</SelectItem>)}
                      </Select>
                    </div>
                    <Checkbox
                      size="sm"
                      isSelected={generationForm.mixAcrossTaxonomy}
                      onValueChange={(v) => setGenerationForm((p) => ({ ...p, mixAcrossTaxonomy: v }))}
                    >
                      Mix lanes and topics for broad ideation
                    </Checkbox>
                  </div>
                </AccordionItem>
              </Accordion>

              <Textarea
                size="sm"
                placeholder="Optional extra instruction (leave blank for default variety)"
                minRows={2}
                value={generationForm.extraInstruction}
                onValueChange={(v) => setGenerationForm((p) => ({ ...p, extraInstruction: v }))}
              />

              {/* Draft review queue */}
              {generatedDrafts.length > 0 && (
                <div className="space-y-3 pt-1">
                  <Divider />
                  <p className="text-sm font-medium">Review queue ({generatedDrafts.length})</p>
                  {generatedDrafts.map((draft) => (
                    <Card key={draft.id} shadow="none" className="border border-divider">
                      <CardBody className="space-y-2 px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-default-500">Shareable draft</p>
                          <Button
                            size="sm"
                            variant="flat"
                            onPress={() => copyDraft(draft)}
                          >
                            {copiedDraftId === draft.id ? 'Copied' : 'Copy'}
                          </Button>
                        </div>
                        <Input size="sm" label="Name" value={draft.name} onValueChange={(v) => updateDraft(draft.id, { name: v })} />
                        <Input size="sm" label="Headline word" value={draft.headlineWord} onValueChange={(v) => updateDraft(draft.id, { headlineWord: v.trim().toLowerCase() })} />
                        <div className="grid gap-2 md:grid-cols-2">
                          {draft.beats.map((beat, i) => (
                            <Textarea
                              key={`${draft.id}-${i}`}
                              size="sm"
                              label={`Beat ${i + 1}`}
                              minRows={2}
                              value={beat}
                              onValueChange={(v) => {
                                const next = [...draft.beats];
                                next[i] = v;
                                updateDraft(draft.id, { beats: next });
                              }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" color="success" variant="flat" onPress={() => saveDraft(draft.id)}>Save to library</Button>
                          <Button size="sm" variant="flat" color="danger" onPress={() => rejectDraft(draft.id)}>Reject</Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* ── Filters ────────────────────────────────────────────────────── */}
          <Card shadow="none" className="border border-divider">
            <CardBody className="px-5 py-4">
              <div className="flex flex-wrap gap-3">
                <Input
                  size="sm"
                  placeholder="Search…"
                  value={search}
                  onValueChange={setSearch}
                  className="w-full"
                  onKeyDown={(e) => { if (e.key === 'Enter') loadPosts(); }}
                />
                <Select
                  size="sm"
                  label="Category"
                  className="min-w-[150px] flex-1"
                  selectedKeys={new Set(categoryFilter ? [categoryFilter] : [])}
                  onSelectionChange={(keys) => {
                    if (keys === 'all') return;
                    setCategoryFilter(([...keys][0] as string) ?? '');
                  }}
                >
                  <>
                    <SelectItem key="">All categories</SelectItem>
                    {CONTENT_OS_CATEGORIES.map((v) => <SelectItem key={v}>{v}</SelectItem>)}
                  </>
                </Select>
                <Select
                  size="sm"
                  label="Status"
                  className="min-w-[140px] flex-1"
                  selectedKeys={new Set(statusFilter ? [statusFilter] : [])}
                  onSelectionChange={(keys) => {
                    if (keys === 'all') return;
                    setStatusFilter(([...keys][0] as string) ?? '');
                  }}
                >
                  <>
                    <SelectItem key="">All statuses</SelectItem>
                    {CONTENT_OS_STATUS.map((v) => <SelectItem key={v}>{v}</SelectItem>)}
                  </>
                </Select>
                <Select
                  size="sm"
                  label="Sort"
                  className="min-w-[130px] flex-1"
                  selectedKeys={new Set([sort])}
                  onSelectionChange={(keys) => {
                    if (keys === 'all') return;
                    const val = ([...keys][0] as FilterSort) ?? 'created';
                    setSort(val);
                  }}
                >
                  <SelectItem key="created">Newest</SelectItem>
                  <SelectItem key="updated">Updated</SelectItem>
                  <SelectItem key="score">Score</SelectItem>
                </Select>
                <Button size="sm" color="primary" variant="flat" onPress={loadPosts} className="h-10 self-end">
                  Apply
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* ── Bulk actions ───────────────────────────────────────────────── */}
          {!loading && filteredPosts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="flat" onPress={() => setSelectedIds(new Set(filteredPosts.map((p) => p.id)))}>
                Select all ({filteredPosts.length})
              </Button>
              <Button size="sm" variant="flat" isDisabled={selectedIds.size === 0} onPress={() => setSelectedIds(new Set())}>
                Clear
              </Button>
              <Button size="sm" variant="flat" color="danger" isDisabled={selectedIds.size === 0} onPress={deleteSelected}>
                Delete ({selectedIds.size})
              </Button>
              <Button size="sm" variant="flat" color="success" isDisabled={selectedPosts.length === 0} onPress={exportSelectedBulk}>
                Export bulk.json ({selectedPosts.length})
              </Button>
            </div>
          )}

          {/* ── Post list ──────────────────────────────────────────────────── */}
          {loading ? (
            <Card shadow="none" className="border border-divider">
              <CardBody className="px-5 py-6">
                <Progress isIndeterminate size="sm" aria-label="Loading posts…" className="max-w-xs" />
              </CardBody>
            </Card>
          ) : filteredPosts.length === 0 ? (
            <p className="py-10 text-center text-sm text-default-400">No posts found.</p>
          ) : (
            <div className="space-y-2">
              {filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  shadow="none"
                  className="border border-divider"
                  isPressable
                  onPress={() => openEdit(post)}
                >
                  <CardBody className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      {/* Checkbox — tap area isolated to avoid opening the modal */}
                      <div
                        onClick={(e) => toggleSelected(post.id, e)}
                        className="-m-1 mt-0.5 shrink-0 p-1"
                      >
                        <Checkbox
                          size="sm"
                          isSelected={selectedIds.has(post.id)}
                          onValueChange={() => {}} // controlled by parent div click
                          aria-label="Select post"
                          tabIndex={-1}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium">{post.name}</p>
                          <Chip size="sm" variant="flat" color={STATUS_COLOR[post.status] ?? 'default'} className="shrink-0 text-xs">
                            {post.status}
                          </Chip>
                        </div>
                        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-default-400">Generated {formatDateLabel(post.createdAt)}</p>
                        <div className="mt-1 space-y-0.5">
                          {postBeats(post).map((beat, index) => (
                            <p key={`${post.id}-${index}`} className="line-clamp-1 text-xs text-default-500">{beat}</p>
                          ))}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-default-400">
                          <span>{post.category}</span>
                          <span>·</span>
                          <span>{post.mainTopic}</span>
                          <span>·</span>
                          <span>score {post.score}</span>
                          {post.renderUrl && <span className="text-success-500">· rendered</span>}
                        </div>
                        <div className="mt-2 flex gap-2 md:hidden" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            onPress={() => openEdit(post)}
                          >
                            Edit
                          </Button>
                          {post.renderUrl && (
                            <Button
                              size="sm"
                              variant="flat"
                              color="success"
                              onPress={() => {
                                window.location.href = `/shared/${post.id}`;
                              }}
                            >
                              Shared
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {/* ── Edit modal (bottom sheet on mobile, centred on desktop) ─────── */}
          <Modal
            isOpen={isOpen}
            onClose={closeEdit}
            size="5xl"
            scrollBehavior="inside"
            placement="bottom"
            classNames={{
              wrapper: 'items-end md:items-center',
              base: 'm-0 max-h-[92vh] rounded-t-2xl rounded-b-none md:mx-4 md:max-h-[90vh] md:rounded-2xl',
            }}
          >
            <ModalContent>
              {editingPost && (
                <>
                  <ModalHeader className="flex-col gap-1 px-5 pb-3 pt-5">
                    {/* Drag handle — mobile only */}
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-default-200 md:hidden" />
                    <p className="text-base font-semibold leading-tight">{editingPost.name || 'Edit post'}</p>
                    <Chip size="sm" variant="flat" color={STATUS_COLOR[editingPost.status] ?? 'default'}>
                      {editingPost.status}
                    </Chip>
                  </ModalHeader>

                  <ModalBody className="p-0">
                  {/* Two-column layout wrapper — flex row on desktop */}
                  <div className="flex flex-col md:flex-row md:overflow-hidden md:h-full">
                  {/* ── Left column: form ────────────────────────────────── */}
                  <div className="min-w-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">

                    {/* ── Render & Preview ─────────────────────────────────── */}
                    <div className="space-y-3 rounded-xl border border-divider bg-default-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-default-400">Render &amp; Preview</p>
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => copyPostBeats(editingPost)}
                        >
                          {copiedBeatsPostId === editingPost.id ? 'Copied' : 'Copy beats'}
                        </Button>
                      </div>

                      {/* Render actions */}
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          isLoading={isRendering && renderState.mode === 'client' && renderState.postId === editingPost.id}
                          isDisabled={isRendering && renderState.postId === editingPost.id}
                          fullWidth
                          onPress={() => renderInBrowser(editingPost)}
                        >
                          Browser
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          isLoading={isRendering && renderState.mode === 'server' && renderState.postId === editingPost.id}
                          isDisabled={isRendering && renderState.postId === editingPost.id}
                          fullWidth
                          onPress={() => renderOnServer(editingPost)}
                        >
                          Server
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          isLoading={isRendering && renderState.mode === 'lambda' && renderState.postId === editingPost.id}
                          isDisabled={isRendering && renderState.postId === editingPost.id}
                          fullWidth
                          onPress={() => renderOnLambda(editingPost)}
                        >
                          Lambda
                        </Button>
                      </div>

                      {/* Progress / result */}
                      {renderState.postId === editingPost.id && renderState.phase !== 'idle' && (
                        <div className="space-y-1.5">
                          {renderState.phase === 'rendering' && (
                            <Progress
                              size="sm"
                              value={renderState.progress}
                              showValueLabel
                              label={`[${renderState.mode}] ${renderState.message}`}
                              classNames={{ label: 'text-xs text-default-500' }}
                            />
                          )}
                          {renderState.phase === 'done' && (
                            <div className="flex flex-wrap items-center gap-2 text-sm text-success-600">
                              <span className="font-medium">✓ Done</span>
                              {renderState.message && renderState.message !== 'Downloaded.' && (
                                <a href={renderState.message} target="_blank" rel="noopener noreferrer" className="underline">
                                  Open video
                                </a>
                              )}
                              {renderState.message === 'Downloaded.' && <span className="text-default-500">File downloaded.</span>}
                              <Button size="sm" variant="light" className="h-6 px-2 text-xs" onPress={resetRenderState}>
                                Re-render
                              </Button>
                            </div>
                          )}
                          {renderState.phase === 'error' && (
                            <div className="flex flex-wrap items-center gap-2 text-sm text-danger-600">
                              <span>✗ {renderState.message}</span>
                              <Button size="sm" variant="light" className="h-6 px-2 text-xs" onPress={resetRenderState}>
                                Dismiss / retry
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Remotion Player — mobile only (desktop uses right column) */}
                      <div className="md:hidden">
                        {playerComp ? (
                          <div className="overflow-hidden rounded-lg border border-divider" style={{ width: '100%', maxWidth: 200, aspectRatio: '9/16' }}>
                            <RemotionPlayer
                              component={playerComp.component}
                              inputProps={buildInputProps(editingPost)}
                              durationInFrames={playerComp.durationInFrames}
                              compositionWidth={1080}
                              compositionHeight={1920}
                              fps={30}
                              style={{ width: '100%', height: '100%' }}
                              controls
                              loop
                              autoPlaybackRate={1}
                            />
                          </div>
                        ) : (
                          <div className="flex h-20 items-center justify-center rounded-lg border border-divider bg-default-50">
                            <Progress isIndeterminate size="sm" aria-label="Loading preview…" className="w-24" />
                          </div>
                        )}
                      </div>

                      {/* Previous server render — mobile only */}
                      {editingPost.renderUrl && (
                        <div className="space-y-1 md:hidden">
                          <p className="text-xs text-default-400">Latest full render</p>
                          <video
                            src={editingPost.renderUrl}
                            controls
                            playsInline
                            className="max-w-[160px] rounded-lg border border-divider"
                          />
                          <a href={editingPost.renderUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                            Open in new tab
                          </a>
                        </div>
                      )}
                    </div>

                    <Divider />

                    {/* ── Post fields ──────────────────────────────────────── */}
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input size="sm" label="Name" value={editingPost.name} onValueChange={(v) => setEditingPost({ ...editingPost, name: v })} className="md:col-span-2" />
                      <Input
                        size="sm"
                        label="Headline word"
                        placeholder="e.g. still."
                        value={editingPost.headlineWord || ''}
                        onValueChange={(v) => setEditingPost({ ...editingPost, headlineWord: v.trim().toLowerCase() })}
                        className="md:col-span-2"
                        description="1 lowercase word shown as hook on the first screen"
                      />

                      <Input
                        type="number"
                        size="sm"
                        label="Score"
                        value={String(editingPost.score)}
                        onValueChange={(v) => setEditingPost({ ...editingPost, score: Number(v || 0) })}
                      />
                      <Select
                        size="sm"
                        label="Status"
                        selectedKeys={new Set([editingPost.status])}
                        onSelectionChange={(keys) => {
                          if (keys === 'all') return;
                          const val = ([...keys][0] as ContentOsStatus) ?? editingPost.status;
                          setEditingPost({ ...editingPost, status: val });
                        }}
                      >
                        {CONTENT_OS_STATUS.map((v) => <SelectItem key={v}>{v}</SelectItem>)}
                      </Select>

                      <Select
                        size="sm"
                        label="Category"
                        selectedKeys={new Set([editingPost.category])}
                        onSelectionChange={(keys) => {
                          if (keys === 'all') return;
                          const val = ([...keys][0] as ContentOsCategory) ?? editingPost.category;
                          setEditingPost({ ...editingPost, category: val });
                        }}
                      >
                        {CONTENT_OS_CATEGORIES.map((v) => <SelectItem key={v}>{v}</SelectItem>)}
                      </Select>
                      <Select
                        size="sm"
                        label="Main Topic"
                        selectedKeys={new Set([editingPost.mainTopic])}
                        onSelectionChange={(keys) => {
                          if (keys === 'all') return;
                          const val = ([...keys][0] as ContentOsTopic) ?? editingPost.mainTopic;
                          setEditingPost({ ...editingPost, mainTopic: val });
                        }}
                      >
                        {CONTENT_OS_TOPICS.map((v) => <SelectItem key={v}>{v}</SelectItem>)}
                      </Select>
                      <Select
                        size="sm"
                        label="Secondary Topic"
                        selectedKeys={new Set([editingPost.secondaryTopic])}
                        onSelectionChange={(keys) => {
                          if (keys === 'all') return;
                          const val = ([...keys][0] as ContentOsTopic) ?? editingPost.secondaryTopic;
                          setEditingPost({ ...editingPost, secondaryTopic: val });
                        }}
                        className="md:col-span-2"
                      >
                        {CONTENT_OS_TOPICS.map((v) => <SelectItem key={v}>{v}</SelectItem>)}
                      </Select>

                      <Textarea size="sm" label="Beat 1 *" minRows={2} value={editingPost.beat1} onValueChange={(v) => setEditingPost({ ...editingPost, beat1: v })} className="md:col-span-2" />
                      <Textarea size="sm" label="Beat 2 *" minRows={2} value={editingPost.beat2} onValueChange={(v) => setEditingPost({ ...editingPost, beat2: v })} className="md:col-span-2" />
                      <Textarea size="sm" label="Beat 3" minRows={2} value={editingPost.beat3 || ''} onValueChange={(v) => setEditingPost({ ...editingPost, beat3: v })} className="md:col-span-2" />
                      <Textarea size="sm" label="Beat 4" minRows={2} value={editingPost.beat4 || ''} onValueChange={(v) => setEditingPost({ ...editingPost, beat4: v })} className="md:col-span-2" />

                      {/* Media */}
                      <div className="flex gap-2 md:col-span-2">
                        <Input size="sm" label="Background URL" value={editingPost.background || ''} onValueChange={(v) => setEditingPost({ ...editingPost, background: v })} className="flex-1" />
                        <Button size="sm" variant="flat" className="shrink-0 self-end" onPress={() => setMediaPicker({ open: true, target: 'background' })}>
                          Choose…
                        </Button>
                      </div>
                      <div className="flex gap-2 md:col-span-2">
                        <Input size="sm" label="Music URL" value={editingPost.music || ''} onValueChange={(v) => setEditingPost({ ...editingPost, music: v })} className="flex-1" />
                        <Button size="sm" variant="flat" className="shrink-0 self-end" onPress={() => setMediaPicker({ open: true, target: 'music' })}>
                          Choose…
                        </Button>
                      </div>

                      <Textarea size="sm" label="Description" minRows={2} value={editingPost.description || ''} onValueChange={(v) => setEditingPost({ ...editingPost, description: v })} className="md:col-span-2" />
                      <Input
                        size="sm"
                        label="Tags (comma separated)"
                        value={(editingPost.tags || []).join(', ')}
                        onValueChange={(v) =>
                          setEditingPost({ ...editingPost, tags: v.split(',').map((t) => t.trim()).filter(Boolean) })
                        }
                        className="md:col-span-2"
                      />
                      <Textarea size="sm" label="Notes" minRows={2} value={editingPost.notes || ''} onValueChange={(v) => setEditingPost({ ...editingPost, notes: v })} className="md:col-span-2" />
                    </div>

                    {/* Live beat preview */}
                    <div className="rounded-xl border border-divider bg-default-50 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-default-400">Live beat preview</p>
                      <div className="space-y-1">
                        {postBeats(editingPost).map((beat, i) => (
                          <p key={i} className="text-sm text-default-700">{beat}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Right column: live preview (desktop only) ─────────── */}
                  <div className="hidden md:flex md:w-[360px] md:shrink-0 md:flex-col md:gap-4 md:overflow-y-auto md:border-l md:border-divider md:px-4 md:py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-default-400">Preview</p>
                    {playerComp ? (
                      <div className="overflow-hidden rounded-lg border border-divider" style={{ width: '100%', aspectRatio: '9/16' }}>
                        <RemotionPlayer
                          component={playerComp.component}
                          inputProps={buildInputProps(editingPost)}
                          durationInFrames={playerComp.durationInFrames}
                          compositionWidth={1080}
                          compositionHeight={1920}
                          fps={30}
                          style={{ width: '100%', height: '100%' }}
                          controls
                          loop
                          autoPlaybackRate={1}
                        />
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-center rounded-lg border border-divider bg-default-50"
                        style={{ aspectRatio: '9/16' }}
                      >
                        <Progress isIndeterminate size="sm" aria-label="Loading preview…" className="w-20" />
                      </div>
                    )}
                    {/* QR code — scan on phone to open download page */}
                    {(() => {
                      const base = typeof window !== 'undefined' ? window.location.origin : '';
                      const url = `${base}/shared/${editingPost.id}`;
                      return (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-default-400">Scan to download on phone</p>
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg border border-divider bg-white p-2">
                              <QRCodeSVG value={url} size={120} />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <p className="break-all text-xs text-default-500">{url}</p>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary underline"
                              >
                                Open page
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {editingPost.renderUrl && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-default-400">Latest render</p>
                        <video
                          src={editingPost.renderUrl}
                          controls
                          playsInline
                          className="w-full rounded-lg border border-divider"
                        />
                        <a href={editingPost.renderUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                          Open in new tab
                        </a>
                      </div>
                    )}
                  </div>
                  {/* end two-column wrapper */}
                  </div>
                  </ModalBody>

                  <ModalFooter className="flex-wrap gap-2 px-5 py-4">
                    <Button size="sm" variant="flat" onPress={() => exportSingle(editingPost)}>
                      Export single.json
                    </Button>
                    <div className="flex-1" />
                    <Button size="sm" variant="flat" color="danger" onPress={closeEdit}>
                      Cancel
                    </Button>
                    <Button size="sm" color="primary" isLoading={saving} onPress={saveEdit}>
                      Save
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          {/* ── Media picker ──────────────────────────────────────────────── */}
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
        </div>
      </div>
    </AdminGuard>
  );
}
