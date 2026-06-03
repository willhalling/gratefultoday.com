'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, Button, Chip } from '@heroui/react';
import { Copy, Video } from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';
import type { YouTubeScript } from '@/types/youtube';

interface SavedScript extends YouTubeScript {
  id: string;
  createdAt: string;
  customPrompt?: string | null;
}

export default function YouTubeScriptsPage() {
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState<SavedScript | null>(null);

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      const response = await fetch('/api/youtube/scripts');
      const data = await response.json();
      setScripts(data.scripts || []);
    } catch (error) {
      console.error('Failed to fetch scripts:', error);
      setScripts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied!`);
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-neutral-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-neutral-900 mb-2">YouTube Scripts</h1>
            <p className="text-lg text-neutral-600">All generated video scripts</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Scripts List */}
            <div className="lg:col-span-1 space-y-4">
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : !scripts || scripts.length === 0 ? (
                <Card className="border border-dashed border-neutral-300">
                  <CardBody className="p-8 text-center">
                    <Video className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-600 text-sm">No scripts yet</p>
                  </CardBody>
                </Card>
              ) : (
                scripts.map((script) => (
                  <Card
                    key={script.id}
                    isPressable
                    onPress={() => setSelectedScript(script)}
                    className={`border ${selectedScript?.id === script.id ? 'border-primary' : 'border-neutral-200'}`}
                  >
                    <CardBody className="p-4">
                      <div className="mb-2">
                        <h3 className="font-semibold text-neutral-900 line-clamp-2">
                          {script.title}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-1">
                          {new Date(script.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Chip size="sm" variant="flat" color="primary">
                        {script.videoType.replace(/-/g, ' ')}
                      </Chip>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>

            {/* Script Detail */}
            <div className="lg:col-span-2">
              {selectedScript ? (
                <div className="space-y-4">
                  <Card className="border border-neutral-200">
                    <CardBody className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-neutral-900">Title</h3>
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={() => copyToClipboard(selectedScript.title, 'Title')}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-neutral-700">{selectedScript.title}</p>
                    </CardBody>
                  </Card>

                  <Card className="border border-neutral-200">
                    <CardBody className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-neutral-900">Description</h3>
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={() => copyToClipboard(selectedScript.description, 'Description')}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-neutral-700 whitespace-pre-wrap text-sm">
                        {selectedScript.description}
                      </p>
                    </CardBody>
                  </Card>

                  {selectedScript.narrationStyle && (
                    <Card className="border border-primary/20 bg-primary/5">
                      <CardBody className="p-4">
                        <div className="text-sm">
                          <span className="font-semibold">Narration Style:</span>
                          <span className="ml-2 px-2 py-1 bg-primary/20 rounded text-xs font-medium">
                            {selectedScript.narrationStyle}
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {selectedScript.openingNarration && (
                    <Card className="border border-neutral-200">
                      <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-neutral-900">Opening Narration</h3>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() =>
                              copyToClipboard(selectedScript.openingNarration!, 'Opening')
                            }
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-neutral-700 whitespace-pre-wrap text-sm">
                          {selectedScript.openingNarration}
                        </p>
                      </CardBody>
                    </Card>
                  )}

                  {selectedScript.fullScript && (
                    <Card className="border border-neutral-200">
                      <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-neutral-900">Full Script (ElevenLabs)</h3>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() => copyToClipboard(selectedScript.fullScript!, 'Script')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-neutral-700 whitespace-pre-wrap text-sm">
                          {selectedScript.fullScript}
                        </p>
                      </CardBody>
                    </Card>
                  )}

                  {/* Legacy script field */}
                  {selectedScript.script && !selectedScript.fullScript && (
                    <Card className="border border-neutral-200">
                      <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-neutral-900">Script (ElevenLabs)</h3>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() => copyToClipboard(selectedScript.script!, 'Script')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-neutral-700 whitespace-pre-wrap text-sm">
                          {selectedScript.script}
                        </p>
                      </CardBody>
                    </Card>
                  )}

                  {selectedScript.textOverlays && selectedScript.textOverlays.length > 0 && (
                    <Card className="border border-neutral-200">
                      <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-neutral-900">Text Overlays</h3>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() =>
                              copyToClipboard(
                                selectedScript
                                  .textOverlays!.map(
                                    (t) => `${t.appearAt}: "${t.text}" (${t.duration})`
                                  )
                                  .join('\n'),
                                'Text Overlays'
                              )
                            }
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {selectedScript.textOverlays.map((overlay, i) => (
                            <div key={i} className="border-l-2 border-primary pl-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-primary">
                                  {overlay.appearAt}
                                </span>
                                <span className="text-xs text-neutral-500">
                                  • {overlay.duration}
                                </span>
                              </div>
                              <p className="text-neutral-700 text-sm">{overlay.text}</p>
                            </div>
                          ))}
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {selectedScript.reflectionPrompt && (
                    <Card className="border border-neutral-200">
                      <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-neutral-900">Reflection Prompt</h3>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() =>
                              copyToClipboard(selectedScript.reflectionPrompt!, 'Prompt')
                            }
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-neutral-700 italic text-sm">
                          {selectedScript.reflectionPrompt}
                        </p>
                      </CardBody>
                    </Card>
                  )}

                  <Card className="border border-neutral-200">
                    <CardBody className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-neutral-900">Midjourney Prompt</h3>
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={() =>
                            copyToClipboard(selectedScript.midjourneyPrompt, 'Midjourney')
                          }
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-neutral-700 text-sm">{selectedScript.midjourneyPrompt}</p>
                    </CardBody>
                  </Card>

                  {selectedScript.musicNotes && (
                    <Card className="border border-neutral-200">
                      <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-neutral-900">Music Notes</h3>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() =>
                              copyToClipboard(selectedScript.musicNotes!, 'Music Notes')
                            }
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-neutral-700 text-sm">{selectedScript.musicNotes}</p>
                      </CardBody>
                    </Card>
                  )}

                  {/* Legacy elevenLabsNotes */}
                  {selectedScript.elevenLabsNotes && !selectedScript.musicNotes && (
                    <Card className="border border-neutral-200">
                      <CardBody className="p-6">
                        <h3 className="font-bold text-neutral-900 mb-2">ElevenLabs Notes</h3>
                        <p className="text-neutral-700 text-sm">{selectedScript.elevenLabsNotes}</p>
                      </CardBody>
                    </Card>
                  )}

                  <Card className="border border-neutral-200">
                    <CardBody className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-neutral-900">Tags</h3>
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={() => copyToClipboard(selectedScript.tags.join(', '), 'Tags')}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedScript.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-neutral-100 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                </div>
              ) : (
                <Card className="border border-dashed border-neutral-300">
                  <CardBody className="p-12 text-center">
                    <Video className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-600">Select a script to view details</p>
                  </CardBody>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
