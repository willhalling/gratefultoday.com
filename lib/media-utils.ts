import type { MediaItem, MediaType, MediaCategory, MediaUploadProgress } from '../types/media';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { firestoreDb as db, storage } from '@/firebase/firebase-config';

const MEDIA_COLLECTION = 'mediaLibrary';
const STORAGE_PATH = 'media-library';

/**
 * Upload a media file to Firebase Storage and add metadata to Firestore
 */
export async function uploadMediaFile(
  file: File,
  category: MediaCategory,
  onProgress?: (progress: MediaUploadProgress) => void
): Promise<MediaItem> {
  const type: MediaType = file.type.startsWith('image/') 
    ? 'image' 
    : file.type.startsWith('audio/') 
    ? 'audio' 
    : 'video';

  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `${STORAGE_PATH}/${type}s/${fileName}`);
  
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          fileName: file.name,
          progress,
          status: 'uploading',
        });
      },
      (error) => {
        onProgress?.({
          fileName: file.name,
          progress: 0,
          status: 'error',
          error: error.message,
        });
        reject(error);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Get duration for audio/video files
          let duration: number | undefined;
          if (type === 'audio' || type === 'video') {
            duration = await getMediaDuration(file, type);
          }

          // Create Firestore document
          const mediaData = {
            type,
            url,
            name: file.name,
            category,
            uploadedAt: Timestamp.now(),
            size: file.size,
            mimeType: file.type,
            ...(duration && { duration }),
          };

          const docRef = await addDoc(collection(db, MEDIA_COLLECTION), mediaData);

          const mediaItem: MediaItem = {
            id: docRef.id,
            ...mediaData,
            uploadedAt: new Date(),
          };

          onProgress?.({
            fileName: file.name,
            progress: 100,
            status: 'complete',
          });

          resolve(mediaItem);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Get duration of audio or video file
 */
function getMediaDuration(file: File, type: 'audio' | 'video'): Promise<number> {
  return new Promise((resolve) => {
    const element = type === 'audio' 
      ? document.createElement('audio') 
      : document.createElement('video');
    
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      window.URL.revokeObjectURL(element.src);
      resolve(Math.round(element.duration));
    };
    element.onerror = () => {
      window.URL.revokeObjectURL(element.src);
      resolve(0);
    };
    element.src = URL.createObjectURL(file);
  });
}

/**
 * Fetch all media items from Firestore
 */
export async function getAllMediaItems(): Promise<MediaItem[]> {
  const q = query(
    collection(db, MEDIA_COLLECTION),
    orderBy('uploadedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    uploadedAt: doc.data().uploadedAt?.toDate() || new Date(),
  })) as MediaItem[];
}

/**
 * Fetch media items by type
 */
export async function getMediaItemsByType(type: MediaType): Promise<MediaItem[]> {
  const q = query(
    collection(db, MEDIA_COLLECTION),
    where('type', '==', type),
    orderBy('uploadedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    uploadedAt: doc.data().uploadedAt?.toDate() || new Date(),
  })) as MediaItem[];
}

/**
 * Fetch media items by category
 */
export async function getMediaItemsByCategory(category: MediaCategory): Promise<MediaItem[]> {
  const q = query(
    collection(db, MEDIA_COLLECTION),
    where('category', '==', category),
    orderBy('uploadedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    uploadedAt: doc.data().uploadedAt?.toDate() || new Date(),
  })) as MediaItem[];
}

/**
 * Delete a media item from both Storage and Firestore
 */
export async function deleteMediaItem(mediaItem: MediaItem): Promise<void> {
  try {
    // Delete from Storage
    const storageRef = ref(storage, mediaItem.url);
    await deleteObject(storageRef);

    // Delete thumbnail if exists
    if (mediaItem.thumbnail) {
      const thumbnailRef = ref(storage, mediaItem.thumbnail);
      await deleteObject(thumbnailRef);
    }

    // Delete from Firestore
    await deleteDoc(doc(db, MEDIA_COLLECTION, mediaItem.id));
  } catch (error) {
    console.error('Error deleting media item:', error);
    throw error;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration for display (seconds to MM:SS)
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
