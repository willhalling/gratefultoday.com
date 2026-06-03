import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

import { firestoreAuth } from './firebase-config';

export const uploadBlogImage = async (
  year: number,
  canvasImage64: string,
  fileName: string
) => {
  const storage = getStorage();
  const uid = firestoreAuth.currentUser.uid;
  const reference = `/blog/${uid}/${year}/${fileName}`;
  const imageRef = ref(storage, reference);
  const uploadImage = await uploadString(imageRef, canvasImage64, 'data_url');
  try {
    const url = await getDownloadURL(uploadImage.ref);
    return { url, reference };
  } catch (error) {
    throw error;
  }
};

export const removeBlogImage = async (reference: string) => {
  const storage = getStorage();

  const imageRef = ref(storage, reference);
  
  deleteObject(imageRef).then(() => {
    return 'Image file deleted';
  }).catch((error) => {
    throw error;
  });
};
