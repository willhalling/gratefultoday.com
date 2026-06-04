'use client';

import { Card, CardBody } from '@heroui/react';
import { ArrowRight, Columns3 } from 'lucide-react';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';

export default function AdminPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-neutral-50 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-bold text-neutral-900">Admin</h1>
            <p className="text-lg text-neutral-600">Open the content system.</p>
          </div>

          <Link href="/admin/content-os" className="block transition-transform hover:scale-[1.01]">
            <Card className="border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md">
              <CardBody className="flex flex-row items-center justify-between gap-4 p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-indigo-50 p-3">
                    <Columns3 className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900">Content OS</h2>
                    <p className="text-sm text-neutral-600">
                      Generate, edit, render, and export short-form posts.
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-neutral-400" />
              </CardBody>
            </Card>
          </Link>
        </div>
      </div>
    </AdminGuard>
  );
}
