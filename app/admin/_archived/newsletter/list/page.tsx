/**
 * Newsletter List & Editor
 * View, edit, and manage all saved newsletters
 * Route: /admin/newsletter/list
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input } from '@heroui/react';
import { Mail, Search, Plus } from 'lucide-react';
import EmailPreview from '@/components/newsletter/EmailPreview';
import type { NewsletterEmail } from '@/types/newsletter';
import AdminGuard from '@/components/AdminGuard';
import Link from 'next/link';

export default function NewsletterListPage() {
  const [newsletters, setNewsletters] = useState<NewsletterEmail[]>([]);
  const [filteredNewsletters, setFilteredNewsletters] = useState<NewsletterEmail[]>([]);
  const [selectedNewsletter, setSelectedNewsletter] = useState<NewsletterEmail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get current day of year
  const getCurrentDayOfYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  // Convert day of year to date string
  const getDayOfYearDate = (dayOfYear: number) => {
    const year = new Date().getFullYear();
    const date = new Date(year, 0, dayOfYear);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const currentDay = getCurrentDayOfYear();

  useEffect(() => {
    fetchNewsletters();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = newsletters.filter(
        (n) =>
          n.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          n.dayOfYear.toString().includes(searchTerm)
      );
      setFilteredNewsletters(filtered);
    } else {
      setFilteredNewsletters(newsletters);
    }
  }, [searchTerm, newsletters]);

  const fetchNewsletters = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/newsletter/list');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch newsletters');
      }

      setNewsletters(data.newsletters || []);
      setFilteredNewsletters(data.newsletters || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedNewsletter) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/newsletter/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedNewsletter,
          dayOfYear: selectedNewsletter.dayOfYear,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save newsletter');
      }

      // Update local state
      setNewsletters((prev) =>
        prev.map((n) =>
          n.dayOfYear === selectedNewsletter.dayOfYear ? selectedNewsletter : n
        )
      );

      alert(`Updated day ${selectedNewsletter.dayOfYear}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailChange = (updatedEmail: NewsletterEmail) => {
    setSelectedNewsletter(updatedEmail);
  };

  const handleSendTest = async () => {
    if (!selectedNewsletter) return;

    const emailToUse = testEmail || prompt('Enter test email address:');
    if (!emailToUse) return;

    setIsSendingTest(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/newsletter/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedNewsletter,
          testEmailAddress: emailToUse,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      setSuccessMessage(`Test email sent to ${emailToUse}!`);
      setTestEmail(emailToUse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleCopy = () => {
    alert('Copied to clipboard!');
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-neutral-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-neutral-900 mb-2">
                Newsletter Manager
              </h1>
              <p className="text-lg text-neutral-600">
                {newsletters.length} newsletters saved · Today is Day {currentDay} ({getDayOfYearDate(currentDay)})
              </p>
            </div>
            <Link href="/admin/newsletter/generate">
              <Button
                color="primary"
                startContent={<Plus className="w-5 h-5" />}
              >
                Generate New
              </Button>
            </Link>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: List */}
            <div className="lg:col-span-1">
              <Card className="border border-neutral-200">
                <CardBody className="p-4">
                  {/* Search */}
                  <div className="mb-4">
                    <Input
                      placeholder="Search by day or subject..."
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                      startContent={<Search className="w-4 h-4 text-neutral-400" />}
                      size="sm"
                    />
                  </div>

                  {/* Newsletter List */}
                  <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {isLoading ? (
                      <p className="text-sm text-neutral-500 text-center py-8">
                        Loading...
                      </p>
                    ) : filteredNewsletters.length === 0 ? (
                      <p className="text-sm text-neutral-500 text-center py-8">
                        No newsletters found
                      </p>
                    ) : (
                      filteredNewsletters.map((newsletter) => (
                        <button
                          key={newsletter.dayOfYear}
                          onClick={() => setSelectedNewsletter(newsletter)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedNewsletter?.dayOfYear === newsletter.dayOfYear
                              ? 'bg-primary/10 border-primary'
                              : 'bg-white border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Mail className="w-4 h-4 text-neutral-400 mt-1 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-primary mb-1">
                                Day {newsletter.dayOfYear} · {getDayOfYearDate(newsletter.dayOfYear)}
                              </div>
                              <div className="text-sm font-medium text-neutral-900 truncate">
                                {newsletter.subject}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Right: Preview/Edit */}
            <div className="lg:col-span-2">
              {error && (
                <Card className="border border-red-200 bg-red-50 mb-4">
                  <CardBody className="p-4">
                    <p className="text-sm text-red-700">{error}</p>
                  </CardBody>
                </Card>
              )}

              {successMessage && (
                <Card className="border border-green-200 bg-green-50 mb-4">
                  <CardBody className="p-4">
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </CardBody>
                </Card>
              )}

              {selectedNewsletter ? (
                <EmailPreview
                  email={selectedNewsletter}
                  onEmailChange={handleEmailChange}
                  onSave={handleSave}
                  onSendTest={handleSendTest}
                  onCopy={handleCopy}
                  isSaving={isSaving}
                  isSendingTest={isSendingTest}
                />
              ) : (
                <Card className="border border-dashed border-neutral-300">
                  <CardBody className="p-12 text-center">
                    <Mail className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-600">
                      Select a newsletter from the list to view and edit
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
