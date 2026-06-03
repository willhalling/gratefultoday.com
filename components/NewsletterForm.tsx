'use client';

import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import React, { useState } from 'react';
import NewsletterSuccessMessage from './NewsletterSuccessMessage';

interface NewsletterFormProps {
  onSuccess?: () => void;
  downloadUrl?: string;
  variant?: 'default' | 'compact';
}

export default function NewsletterForm({
  onSuccess,
  downloadUrl,
  variant = 'default',
}: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name: variant === 'default' ? name : undefined,
          downloadUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSubmitted(true);
      setIsModalOpen(true);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {variant === 'default' && (
          <Input
            type="text"
            label="First Name"
            labelPlacement="inside"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            size="lg"
            classNames={{
              input: 'text-base pt-4',
              inputWrapper: 'h-12',
              label: 'text-sm',
            }}
          />
        )}

        <Input
          type="email"
          label="Email Address"
          labelPlacement="outside"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          size="lg"
          classNames={{
            input: 'text-base pt-4',
            inputWrapper: 'h-12',
            label: 'text-sm',
          }}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <Button
          type="submit"
          color="primary"
          size="lg"
          className="w-full bg-accent hover:bg-accent-600 text-neutral-900 font-semibold"
          isLoading={loading}
        >
          {downloadUrl ? 'Get Free PDF' : 'Subscribe'}
        </Button>

        <p className="text-xs text-neutral-600 text-center">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </form>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">Success!</ModalHeader>
          <ModalBody className="pb-6">
            <NewsletterSuccessMessage downloadUrl={downloadUrl} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
