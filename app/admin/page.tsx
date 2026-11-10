'use client';

import AdminGuard from '@/components/AdminGuard';

// Placeholder: becomes the order queue (scripts to review, renders, refunds).
export default function AdminPage() {
  return (
    <AdminGuard>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold text-pine">Orders</h1>
        <p className="mt-3 text-muted">No orders yet. The order queue arrives with the order form.</p>
      </main>
    </AdminGuard>
  );
}
