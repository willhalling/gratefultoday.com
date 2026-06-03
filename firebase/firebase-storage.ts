import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL
} from 'firebase/storage';

import { firestoreAuth } from './firebase-config';

export const uploadJsonToStorage = async (fileName: string, jsonData: any) => {
  const storage = getStorage();
  const uid = firestoreAuth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated');

  const reference = `welcome-signs/${fileName}/welcome-sign.json`;
  const jsonRef = ref(storage, reference);
  const jsonString = JSON.stringify(jsonData);
  const uploadResult = await uploadString(jsonRef, jsonString, 'raw', { contentType: 'application/json' });

  try {
    const url = await getDownloadURL(uploadResult.ref);
    return { url };
  } catch (error) {
    throw new Error('Failed to get download URL: ' + error);
  }
};

export const downloadJsonFromStorage = async (fileName: string) => {
  const storage = getStorage();
  const uid = firestoreAuth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated');

  const reference = `welcome-signs/${fileName}/welcome-sign.json`;
  const jsonRef = ref(storage, reference);

  try {
    const url = await getDownloadURL(jsonRef);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch JSON data');

    const jsonData = await response.json();
    return { jsonData };
  } catch (error) {
    throw new Error('Failed to download JSON from Firebase Storage: ' + error);
  }
};
