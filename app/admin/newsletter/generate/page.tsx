/**
 * Daily Gratitude Reflection Newsletter Generator
 * Generate daily emails for the 365-day Daily Gratitude Reflection series
 * Route: /admin/newsletter/generate
 */

'use client';

import React, { useState } from 'react';
import { Card, CardBody, Button, Input } from '@heroui/react';
import { Sparkles, AlertCircle } from 'lucide-react';
import EmailPreview from '@/components/newsletter/EmailPreview';
import type { NewsletterEmail } from '@/types/newsletter';
import AdminGuard from '@/components/AdminGuard';

export default function NewsletterGeneratorPage() {
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [dayOfYear, setDayOfYear] = useState(1);
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(7);
  const [customPrompt, setCustomPrompt] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [email, setEmail] = useState<NewsletterEmail | null>(null);
  const [emails, setEmails] = useState<NewsletterEmail[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleEmailChange = (updatedEmail: NewsletterEmail) => {
    if (emails.length > 0) {
      const newEmails = [...emails];
      newEmails[currentIndex] = updatedEmail;
      setEmails(newEmails);
    } else {
      setEmail(updatedEmail);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setWarnings([]);

    try {
      const body =
        mode === 'single'
          ? {
              series: 'coffeeAndGratitude',
              dayOfYear,
              customPrompt: customPrompt || undefined,
            }
          : {
              series: 'coffeeAndGratitude',
              dayRange: { start: startDay, end: endDay },
            };

      const response = await fetch('/api/newsletter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate email');
      }

      if (data.email) {
        setEmail(data.email);
        setEmails([]);
      } else if (data.emails && data.emails.length > 0) {
        setEmails(data.emails);
        setEmail(null);
        setCurrentIndex(0);
      }

      // Show warnings if any
      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    const emailToSave = emails.length > 0 ? emails[currentIndex] : email;
    if (!emailToSave) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/newsletter/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToSave,
          dayOfYear: emailToSave.dayOfYear,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save email');
      }

      alert(`Saved to newsletter collection as day-${emailToSave.dayOfYear}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const currentEmail = emails.length > 0 ? emails[currentIndex] : email;

  const handleCopy = () => {
    alert('Email copied to clipboard!');
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-neutral-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-neutral-900 mb-2">
              Daily Gratitude Reflection Generator
            </h1>
            <p className="text-lg text-neutral-600">
              Generate daily emails for the 365-day Daily Gratitude Reflection series
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Controls */}
            <div className="space-y-6">
              <Card className="border border-neutral-200">
                <CardBody className="p-6 space-y-4">
                  <h2 className="text-xl font-bold text-neutral-900">Generation Settings</h2>

                  {/* Mode Selection */}
                  <div className="flex gap-4">
                    <Button
                      color={mode === 'single' ? 'primary' : 'default'}
                      onClick={() => setMode('single')}
                      fullWidth
                    >
                      Single Day
                    </Button>
                    <Button
                      color={mode === 'range' ? 'primary' : 'default'}
                      onClick={() => setMode('range')}
                      fullWidth
                    >
                      Date Range
                    </Button>
                  </div>

                  {/* Single Day Mode */}
                  {mode === 'single' && (
                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-2">
                        Day of Year (1-365)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={dayOfYear.toString()}
                        onValueChange={(val) => setDayOfYear(parseInt(val) || 1)}
                      />
                    </div>
                  )}

                  {/* Range Mode */}
                  {mode === 'range' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-neutral-900 mb-2">
                            Start Day
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max="365"
                            value={startDay.toString()}
                            onValueChange={(val) => setStartDay(parseInt(val) || 1)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-neutral-900 mb-2">
                            End Day
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max="365"
                            value={endDay.toString()}
                            onValueChange={(val) => setEndDay(parseInt(val) || 1)}
                          />
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div>
                        <label className="block text-sm font-semibold text-neutral-900 mb-2">
                          Quick Presets
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() => {
                              setStartDay(1);
                              setEndDay(7);
                            }}
                          >
                            Week 1
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() => {
                              setStartDay(1);
                              setEndDay(30);
                            }}
                          >
                            Month 1
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() => {
                              setStartDay(1);
                              setEndDay(365);
                            }}
                          >
                            Full Year
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() => setDayOfYear(Math.floor(Math.random() * 365) + 1)}
                          >
                            Random
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Custom Prompt */}
                  <div>
                    <label className="block text-sm font-semibold text-neutral-900 mb-2">
                      Custom Direction (Optional)
                    </label>
                    <Input
                      value={customPrompt}
                      onValueChange={setCustomPrompt}
                      placeholder="e.g., focus on coffee ritual, mention 30 days milestone"
                    />
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerate}
                    isLoading={isGenerating}
                    className="w-full bg-primary text-white"
                    size="lg"
                    startContent={!isGenerating ? <Sparkles className="w-5 h-5" /> : null}
                  >
                    {isGenerating ? 'Generating...' : 'Generate Email'}
                  </Button>
                </CardBody>
              </Card>

              {/* Style Guide Reference */}
              <Card className="border border-neutral-200 bg-neutral-50">
                <CardBody className="p-6">
                  <h3 className="text-lg font-bold text-neutral-900 mb-3">
                    Daily Gratitude Reflection Style
                  </h3>
                  <div className="space-y-3 text-sm text-neutral-700">
                    <div>
                      <p className="font-semibold text-neutral-900">✅ Good Tone:</p>
                      <p className="italic">
                        &quot;morning. coffee's hot. here's what i'm grateful for today.&quot;
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">❌ Avoid:</p>
                      <p className="italic">
                        &quot;Good Morning Friends! Today we're going to explore amazing
                        practices!&quot;
                      </p>
                    </div>
                    <div className="pt-3 border-t border-neutral-200">
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>WhatsApp-style casual (lowercase, natural)</li>
                        <li>Three gratitudes (first always sobriety/recovery)</li>
                        <li>200-400 words</li>
                        <li>One gratitude prompt question</li>
                        <li>Honest - permission to struggle</li>
                      </ul>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Right: Preview */}
            <div className="space-y-6">
              {/* Navigation for batch emails */}
              {emails.length > 0 && (
                <Card className="border border-neutral-200">
                  <CardBody className="p-4 flex items-center justify-between">
                    <Button
                      size="sm"
                      onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                      isDisabled={currentIndex === 0}
                    >
                      Previous
                    </Button>
                    <span className="font-medium text-neutral-900">
                      Day {emails[currentIndex].dayOfYear} ({currentIndex + 1} of {emails.length})
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setCurrentIndex(Math.min(emails.length - 1, currentIndex + 1))}
                      isDisabled={currentIndex === emails.length - 1}
                    >
                      Next
                    </Button>
                  </CardBody>
                </Card>
              )}

              {/* Error Display */}
              {error && (
                <Card className="border border-red-200 bg-red-50">
                  <CardBody className="p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">Error</p>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Warnings Display */}
              {warnings.length > 0 && (
                <Card className="border border-yellow-200 bg-yellow-50">
                  <CardBody className="p-4">
                    <p className="font-semibold text-yellow-900 mb-2">Validation Warnings:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {warnings.map((warning, i) => (
                        <li key={i} className="text-sm text-yellow-700">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              )}

              {/* Generated Email Preview */}
              {currentEmail && (
                <EmailPreview
                  email={currentEmail}
                  onRegenerate={handleGenerate}
                  onCopy={handleCopy}
                  onSave={handleSave}
                  onEmailChange={handleEmailChange}
                  isRegenerating={isGenerating}
                  isSaving={isSaving}
                />
              )}

              {/* Placeholder */}
              {!currentEmail && !error && (
                <Card className="border border-dashed border-neutral-300">
                  <CardBody className="p-12 text-center">
                    <Sparkles className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-600">
                      Select a day and click &quot;Generate Email&quot; to create your Daily
                      Gratitude Reflection email
                    </p>
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
