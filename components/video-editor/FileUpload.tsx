'use client';

import { Card, CardBody, Button } from '@heroui/react';
import { Upload, FolderOpen } from 'lucide-react';
import { firestoreAuth } from '@/firebase/firebase-config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { lazy, Suspense, useState } from 'react';
import type { MediaItem } from '@/types/media';

// Lazy load media manager modal
const MediaManagerModal = lazy(() => 
  import('./media-manager/MediaManagerModal').then(mod => ({ default: mod.MediaManagerModal }))
);

const toast = {
  warning: (msg: string) => console.warn(msg),
  error: (msg: string) => console.error(msg),
  success: (msg: string) => console.log(msg),
};

interface FileUploadProps {
  onAudioUpload: (file: File) => void;
  onVoiceoverUpload: (file: File) => void;
  onImageUpload: (file: File) => void;
  onAudioUrlReady?: (url: string) => void;
  onVoiceoverUrlReady?: (url: string) => void;
  onImageUrlReady?: (url: string) => void;
  audioFile: File | null;
  voiceoverFile: File | null;
  imageFile: File | null;
  existingAudioUrl?: string;
  existingVoiceoverUrl?: string;
  existingImageUrl?: string;
}

export function FileUpload({
  onAudioUpload,
  onVoiceoverUpload,
  onImageUpload,
  onAudioUrlReady,
  onVoiceoverUrlReady,
  onImageUrlReady,
  audioFile,
  voiceoverFile,
  imageFile,
  existingAudioUrl,
  existingVoiceoverUrl,
  existingImageUrl,
}: FileUploadProps) {
  const [showMediaManager, setShowMediaManager] = useState(false);
  const [mediaManagerType, setMediaManagerType] = useState<'audio' | 'voiceover' | 'image'>('audio');
  const uploadToFirebase = async (file: File, type: 'audio' | 'voiceover' | 'image') => {
    try {
      const storage = getStorage();
      const user = firestoreAuth.currentUser;
      
      if (!storage) {
        console.error('❌ Storage service not available');
        toast.error('Storage not available. Please refresh the page.');
        return;
      }
      if (!user) {
        console.warn('⚠️ User not signed in');
        toast.warning('Please sign in to save uploads');
        return;
      }

      const safeName = file.name.replace(/\s+/g, '_');
      const path = `users/${user.uid}/${type}s/${Date.now()}-${safeName}`;
      const objectRef = ref(storage, path);
      
      await uploadBytes(objectRef, file, {
        contentType: file.type,
        cacheControl: 'public, max-age=86400',
      });
      
      const url = await getDownloadURL(objectRef);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded to cloud`);
      
      if (type === 'audio' && onAudioUrlReady) {
        onAudioUrlReady(url);
      } else if (type === 'voiceover' && onVoiceoverUrlReady) {
        onVoiceoverUrlReady(url);
      } else if (type === 'image' && onImageUrlReady) {
        onImageUrlReady(url);
      }
    } catch (err) {
      console.error(`❌ Firebase upload failed for ${type}:`, err);
      toast.error(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onAudioUpload(file);
      uploadToFirebase(file, 'audio');
    }
  };

  const handleVoiceoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onVoiceoverUpload(file);
      uploadToFirebase(file, 'voiceover');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
      uploadToFirebase(file, 'image');
    }
  };

  const truncateFilename = (filename: string, maxLength: number = 30) => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.substring(filename.lastIndexOf('.'));
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3);
    return `${truncatedName}...${extension}`;
  };

  const handleMediaSelect = (mediaItem: MediaItem) => {
    // Convert URL to File object by fetching
    fetch(mediaItem.url)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], mediaItem.name, { type: mediaItem.mimeType });
        
        if (mediaManagerType === 'audio') {
          onAudioUpload(file);
          if (onAudioUrlReady) onAudioUrlReady(mediaItem.url);
        } else if (mediaManagerType === 'voiceover') {
          onVoiceoverUpload(file);
          if (onVoiceoverUrlReady) onVoiceoverUrlReady(mediaItem.url);
        } else if (mediaManagerType === 'image') {
          onImageUpload(file);
          if (onImageUrlReady) onImageUrlReady(mediaItem.url);
        }
        
        toast.success(`${mediaItem.name} loaded from library`);
      })
      .catch(err => {
        console.error('Error loading media from library:', err);
        toast.error('Failed to load media from library');
      });
  };

  const openMediaManager = (type: 'audio' | 'voiceover' | 'image') => {
    setMediaManagerType(type);
    setShowMediaManager(true);
  };

  return (
    <div className="grid gap-4">
      <Card className="border-gray-900 bg-gray-950">
        <CardBody className="p-6">
          <div className="flex flex-col items-center gap-3">
            <label className="flex cursor-pointer flex-col items-center gap-3">
              <Upload className="h-8 w-8 text-purple-500" />
              <div className="text-center">
                <p className="text-sm font-semibold text-white" title={audioFile?.name}>
                  {audioFile ? truncateFilename(audioFile.name) : 'Upload Background Audio'}
                </p>
                <p className="mt-2 text-xs text-gray-500">MP3, WAV, M4A, OGG, FLAC</p>
                {(existingAudioUrl || audioFile) && (
                  <p className="mt-2 text-xs text-green-400">✓ Audio loaded</p>
                )}
              </div>
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioChange}
                className="hidden"
              />
            </label>
            <Button
              size="sm"
              variant="bordered"
              onPress={() => openMediaManager('audio')}
              startContent={<FolderOpen className="h-4 w-4" />}
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              Browse Library
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="border-gray-900 bg-gray-950">
        <CardBody className="p-6">
          <div className="flex flex-col items-center gap-3">
            <label className="flex cursor-pointer flex-col items-center gap-3">
              <Upload className="h-8 w-8 text-purple-500" />
              <div className="text-center">
                <p className="text-sm font-semibold text-white" title={voiceoverFile?.name}>
                  {voiceoverFile
                    ? truncateFilename(voiceoverFile.name)
                    : 'Upload Voiceover (Optional)'}
                </p>
                <p className="mt-2 text-xs text-gray-500">MP3, WAV, M4A, OGG, FLAC</p>
                {(existingVoiceoverUrl || voiceoverFile) && (
                  <p className="mt-2 text-xs text-green-400">✓ Voiceover loaded</p>
                )}
              </div>
              <input
                type="file"
                accept="audio/*"
                onChange={handleVoiceoverChange}
                className="hidden"
              />
            </label>
            <Button
              size="sm"
              variant="bordered"
              onPress={() => openMediaManager('voiceover')}
              startContent={<FolderOpen className="h-4 w-4" />}
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              Browse Library
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="border-gray-900 bg-gray-950">
        <CardBody className="p-6">
          <div className="flex flex-col items-center gap-3">
            <label className="flex cursor-pointer flex-col items-center gap-3">
              {existingImageUrl ? (
                <img src={existingImageUrl} alt="Preview" className="h-16 w-16 rounded object-cover" />
              ) : (
                <Upload className="h-8 w-8 text-purple-500" />
              )}
              <div className="text-center">
                <p className="mt-1 text-sm font-semibold text-white" title={imageFile?.name}>
                  {imageFile ? truncateFilename(imageFile.name) : 'Upload Image (JPG/PNG)'}
                </p>
                <p className="mt-2 text-xs text-gray-500">1920x1080 recommended</p>
                {(existingImageUrl || imageFile) && (
                  <p className="mt-2 text-xs text-green-400">✓ Image loaded</p>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
            <Button
              size="sm"
              variant="bordered"
              onPress={() => openMediaManager('image')}
              startContent={<FolderOpen className="h-4 w-4" />}
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              Browse Library
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Lazy-loaded Media Manager Modal */}
      {showMediaManager && (
        <Suspense fallback={null}>
          <MediaManagerModal
            isOpen={showMediaManager}
            onClose={() => setShowMediaManager(false)}
            onSelectMedia={handleMediaSelect}
            mediaType={mediaManagerType === 'image' ? 'image' : 'audio'}
            title={`Select ${mediaManagerType === 'audio' ? 'Background Audio' : mediaManagerType === 'voiceover' ? 'Voiceover' : 'Background Image'}`}
          />
        </Suspense>
      )}
    </div>
  );
}
