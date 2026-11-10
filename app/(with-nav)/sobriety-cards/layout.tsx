import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/sobriety-card-data';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

export default function PageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}
