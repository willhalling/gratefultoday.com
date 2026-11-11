'use client';

import AdminGuard from '@/components/AdminGuard';
import AdvisorApp from '@/components/advisor/advisor-app';

export default function AdvisorPage() {
  return (
    <AdminGuard>
      <AdvisorApp />
    </AdminGuard>
  );
}
