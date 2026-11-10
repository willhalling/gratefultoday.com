'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { firestoreAuth } from '@/firebase/firebase-config';

export default function AdminSignInPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(firestoreAuth, new GoogleAuthProvider());
      router.push('/admin');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-paper p-8 text-center">
        <h1 className="text-2xl font-semibold text-pine">Admin</h1>
        <button
          onClick={signIn}
          disabled={busy}
          className="mt-6 w-full rounded-full bg-pine px-5 py-3 font-semibold text-white transition hover:bg-pine-dark disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {error && <p className="mt-4 text-sm text-ember">{error}</p>}
      </div>
    </main>
  );
}
