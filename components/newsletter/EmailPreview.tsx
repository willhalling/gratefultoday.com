/**
 * Email Preview Component
 * Displays generated newsletter emails in a realistic email client preview
 */

'use client';

import { Card, CardBody, Button, Textarea } from '@heroui/react';
import { Copy, Mail, RefreshCw, Edit, Check, X } from 'lucide-react';
import React, { useState } from 'react';
import type { NewsletterEmail } from '@/types/newsletter';

interface EmailPreviewProps {
  email: NewsletterEmail;
  wordCount?: number;
  onRegenerate?: () => void;
  onCopy?: () => void;
  onSave?: () => void;
  onSend?: () => void;
  onSendTest?: () => void;
  onEmailChange?: (email: NewsletterEmail) => void;
  isRegenerating?: boolean;
  isSaving?: boolean;
  isSendingTest?: boolean;
}

export default function EmailPreview({
  email,
  wordCount,
  onRegenerate,
  onCopy,
  onSave,
  onSend,
  onSendTest,
  onEmailChange,
  isRegenerating = false,
  isSaving = false,
  isSendingTest = false,
}: EmailPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmail, setEditedEmail] = useState(email);

  const handleStartEdit = () => {
    setEditedEmail(email);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (onEmailChange) {
      onEmailChange(editedEmail);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedEmail(email);
    setIsEditing(false);
  };
  const handleCopyToClipboard = () => {
    const fullEmail = `${email.subject}

${email.greeting}

${email.body}

${email.signoff}${email.ps ? `\n\n${email.ps}` : ''}`;

    navigator.clipboard.writeText(fullEmail);
    if (onCopy) onCopy();
  };

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-neutral-600" />
          <span className="text-sm text-neutral-600">{wordCount && `${wordCount} words`}</span>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                size="sm"
                color="success"
                onClick={handleSaveEdit}
                startContent={<Check className="w-4 h-4" />}
              >
                Apply Changes
              </Button>
              <Button
                size="sm"
                variant="light"
                onClick={handleCancelEdit}
                startContent={<X className="w-4 h-4" />}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {onRegenerate && (
                <Button
                  size="sm"
                  variant="light"
                  onClick={onRegenerate}
                  isLoading={isRegenerating}
                  startContent={!isRegenerating ? <RefreshCw className="w-4 h-4" /> : null}
                >
                  Regenerate
                </Button>
              )}

              <Button
                size="sm"
                variant="flat"
                onClick={handleStartEdit}
                startContent={<Edit className="w-4 h-4" />}
              >
                Edit
              </Button>

              <Button
                size="sm"
                variant="light"
                onClick={handleCopyToClipboard}
                startContent={<Copy className="w-4 h-4" />}
              >
                Copy
              </Button>
            </>
          )}

          {onSave && (
            <Button size="sm" color="success" onClick={onSave} isLoading={isSaving}>
              Save to Firebase
            </Button>
          )}

          {onSendTest && (
            <Button size="sm" color="primary" variant="flat" onClick={onSendTest} isLoading={isSendingTest}>
              Send Test Email
            </Button>
          )}

          {onSend && (
            <Button size="sm" className="bg-primary text-white" onClick={onSend}>
              Send to Subscribers
            </Button>
          )}
        </div>
      </div>

      {/* Email Preview Card */}
      <Card className="border border-neutral-200">
        <CardBody className="p-8">
          {/* Email Client Chrome */}
          <div className="mb-6 pb-6 border-b border-neutral-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                GT
              </div>
              <div>
                <div className="font-semibold text-neutral-900">GratefulToday</div>
                <div className="text-sm text-neutral-600">newsletter@gratefultoday.com</div>
              </div>
            </div>

            {/* Subject Line */}
            {isEditing ? (
              <Textarea
                value={editedEmail.subject}
                onValueChange={(val) => setEditedEmail({ ...editedEmail, subject: val })}
                minRows={1}
                className="mt-4 font-semibold"
                classNames={{
                  input: "text-xl font-semibold text-neutral-900"
                }}
              />
            ) : (
              <div className="text-xl font-semibold text-neutral-900 mt-4">{email.subject}</div>
            )}
          </div>

          {/* Email Body */}
          <div className="prose prose-neutral max-w-none">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-600 mb-1 block">Greeting</label>
                  <Textarea
                    value={editedEmail.greeting}
                    onValueChange={(val) => setEditedEmail({ ...editedEmail, greeting: val })}
                    minRows={1}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-600 mb-1 block">Body</label>
                  <Textarea
                    value={editedEmail.body}
                    onValueChange={(val) => setEditedEmail({ ...editedEmail, body: val })}
                    minRows={10}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-600 mb-1 block">Sign-off</label>
                  <Textarea
                    value={editedEmail.signoff}
                    onValueChange={(val) => setEditedEmail({ ...editedEmail, signoff: val })}
                    minRows={2}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-600 mb-1 block">P.S. (optional)</label>
                  <Textarea
                    value={editedEmail.ps || ''}
                    onValueChange={(val) => setEditedEmail({ ...editedEmail, ps: val || undefined })}
                    minRows={2}
                    placeholder="Add a P.S. if needed..."
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Greeting */}
                <p className="text-neutral-900 mb-4">{email.greeting}</p>

                {/* Body - preserve line breaks */}
                <div className="text-neutral-800 leading-relaxed whitespace-pre-wrap">{email.body}</div>

                {/* Sign-off */}
                <p className="text-neutral-700 mt-6 mb-2">{email.signoff}</p>

                {/* P.S. */}
                {email.ps && (
                  <p className="text-neutral-600 italic text-sm mt-4 border-t border-neutral-200 pt-4">
                    {email.ps}
                  </p>
                )}
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Plain Text Preview (for email clients) */}
      <details className="text-sm">
        <summary className="cursor-pointer text-neutral-600 hover:text-neutral-900">
          View plain text version
        </summary>
        <Card className="mt-2 bg-neutral-50">
          <CardBody className="p-4">
            <pre className="text-xs text-neutral-700 whitespace-pre-wrap font-mono">
              {`Subject: ${email.subject}

${email.greeting}

${email.body}

${email.signoff}${email.ps ? `\n\n${email.ps}` : ''}`}
            </pre>
          </CardBody>
        </Card>
      </details>
    </div>
  );
}
