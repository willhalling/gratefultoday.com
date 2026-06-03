'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { firestoreAuth } from '@/firebase/firebase-config';

interface AuthContextValue {
  authUser: User | null;
  loading: boolean;
}

const AuthUserContext = createContext<AuthContextValue>({
  authUser: null,
  loading: true,
});

export function AuthUserProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firestoreAuth, (user) => {
      setAuthUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthUserContext.Provider value={{ authUser, loading }}>{children}</AuthUserContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthUserContext);
}
