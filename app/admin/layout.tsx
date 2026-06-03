'use client';
import { usePathname } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = pathname.startsWith('/admin/video-editor/');
  return (
    <>
      {!hideHeader && <AdminHeader />}
      {children}
    </>
  );
}
