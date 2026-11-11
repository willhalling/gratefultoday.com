'use client';

import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';

// Placeholder: becomes the order queue (scripts to review, renders, refunds).
export default function AdminPage() {
  return (
    <AdminGuard>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Link
          href="/admin/advisor"
          className="mb-10 block rounded-2xl border border-line bg-paper p-6 transition-colors hover:border-pine"
        >
          <h2 className="text-2xl font-semibold text-pine">Advisor →</h2>
          <p className="mt-1 text-muted">Your journal, with replies from the library.</p>
        </Link>
        <h1 className="text-3xl font-semibold text-pine">Orders</h1>
        <p className="mt-3 text-muted">No orders yet. The order queue arrives with the order form.</p>
      </main>
    </AdminGuard>
  );
}
