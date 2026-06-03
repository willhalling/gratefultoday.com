export type MediaType = 'image' | 'audio' | 'video';

export type MediaCategory = 
  | 'Nature'
  | 'Abstract'
  | 'Music'
  | 'Ambient'
  | 'Voiceover'
  | 'Effects'
  | 'Other';

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  name: string;
  category: MediaCategory;
  thumbnail?: string; // For videos
  uploadedAt: Date;
  size: number; // In bytes
  duration?: number; // In seconds for audio/video
  mimeType: string;
}

export interface MediaUploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}
