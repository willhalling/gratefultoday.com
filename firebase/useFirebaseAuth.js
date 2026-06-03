
import { useState, useEffect } from 'react';
import { firestoreAuth } from './firebase-config';
import { onAuthStateChanged } from 'firebase/auth';

const formatAuthUser = (user) => ({
  uid: user.uid,
  email: user.email,
  accessToken: user.accessToken,
  displayName: user.displayName,
  videoId: user.displayName
});

export default function useFirebaseAuth() {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const authStateChanged = async (authState) => {
    if (!authState) {
      setAuthUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const formattedUser = formatAuthUser(authState);
    setAuthUser(formattedUser);
    setLoading(false);
  };

  // listen for Firebase state change
  /* 
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firestoreAuth, authStateChanged);
    return () => unsubscribe();
  }, [firestoreAuth]); */

  useEffect(() => {
    if (!firestoreAuth) {
      return;
    }
    const unsubscribe = onAuthStateChanged(firestoreAuth, authStateChanged);
    return () => unsubscribe();
  }, [firestoreAuth]);
  
  return {
    authUser,
    loading,
  };
}
