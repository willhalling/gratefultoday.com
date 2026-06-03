'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { firestoreAuth } from '@/firebase/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { isAdmin } from '@/lib/admin';

interface AdminGuardProps {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

/**
 * Client-side admin route protection
 * Redirects non-admin users to home page
 */
export default function AdminGuard({ children, loadingComponent }: AdminGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firestoreAuth, (user) => {
      if (!user || !isAdmin(user.uid)) {
        router.push('/');
        return;
      }
      
      setIsAuthorized(true);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return loadingComponent || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-neutral-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
