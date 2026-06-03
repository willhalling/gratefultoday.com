import { initializeApp, getApps } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initializeAuth, browserLocalPersistence, updateProfile, browserPopupRedirectResolver, connectAuthEmulator } from "firebase/auth";

import { getFirebaseConfig } from './config';

let firebaseApp:any;
let firestoreDb:any;
let firestoreAuth:any;
let storage:any;
let firestoreFunctions:any;

if (!getApps().length) {
  firebaseApp = initializeApp(getFirebaseConfig());
  firestoreDb = getFirestore(firebaseApp);
  firestoreAuth = initializeAuth(firebaseApp, { persistence: browserLocalPersistence, popupRedirectResolver: typeof window === 'undefined' ? undefined : browserPopupRedirectResolver });
  storage = getStorage(firebaseApp);
  firestoreFunctions = getFunctions(firebaseApp);

  // Connect to emulators only when explicitly enabled
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
    try {
      connectAuthEmulator(firestoreAuth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(firestoreDb, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('🔧 Connected to Firebase Emulators');
    } catch (error) {
      console.log('Emulators already connected');
    }
  }
}

export { firestoreDb, firestoreAuth, firebaseApp, storage, firestoreFunctions, updateProfile };



