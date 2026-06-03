import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestoreAuth, firestoreDb } from '@/firebase/firebase-config';

// Helper to remove any undefined values (including nested) before saving to Firestore,
// since Firestore does not allow undefined field values.
function removeUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedDeep(item)) as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === undefined) continue;
      result[key] = removeUndefinedDeep(val as unknown as T);
    }
    return result as unknown as T;
  }

  return value;
}

/**
 * Hook to persist settings in Firestore per user or per video.
 */
export function useFirestoreSettings<T>(
  settingKey: string,
  initialValue: T,
  videoId?: string
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from Firestore when user is available
  useEffect(() => {
    let isMounted = true;
    const user = firestoreAuth.currentUser;

    if (!user?.uid) {
      if (isMounted && !isLoaded) {
        setIsLoaded(true);
      }
      return;
    }

    if (!firestoreDb) {
      if (isMounted && !isLoaded) {
        setIsLoaded(true);
      }
      return;
    }

    const loadSettings = async () => {
      try {
        const docRef = videoId
          ? doc(firestoreDb!, 'videoData', videoId)
          : doc(firestoreDb!, 'users', user.uid, 'settings', settingKey);

        const docSnap = await getDoc(docRef);

        if (isMounted) {
          if (docSnap.exists()) {
            const data = videoId ? docSnap.data()?.[settingKey] : docSnap.data()?.value;
            if (data !== undefined) {
              setStoredValue(data as T);
            }
          }
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Error loading settings from Firestore:', error);
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [settingKey, videoId, isLoaded]);

  // Save to Firestore when value changes
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((currentValue) => {
        const rawValue = value instanceof Function ? value(currentValue) : value;
        const valueToStore = removeUndefinedDeep(rawValue);
        const user = firestoreAuth.currentUser;

        if (user?.uid && firestoreDb) {
          const docRef = videoId
            ? doc(firestoreDb, 'videoData', videoId)
            : doc(firestoreDb, 'users', user.uid, 'settings', settingKey);

          const dataToSave = videoId
            ? { [settingKey]: valueToStore, updatedAt: Date.now() }
            : { value: valueToStore };

          setDoc(docRef, dataToSave, { merge: true }).catch((error) => {
            console.error('Error saving settings to Firestore:', error);
          });
        }

        return valueToStore;
      });
    },
    [settingKey, videoId]
  );

  return [storedValue, setValue];
}
