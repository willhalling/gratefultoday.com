'use client';

import React, { useState, useRef } from 'react';
import { Button, Select, SelectItem, Progress, Card, CardBody } from '@heroui/react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import type { MediaCategory, MediaUploadProgress, MediaType } from '../../../types/media';
import { uploadMediaFile } from '../../../lib/media-utils';
import { darkSelectClasses, darkSelectItemClasses } from '../DarkSelect';

interface MediaUploaderProps {
  onUploadComplete: () => void;
  defaultCategory?: MediaCategory;
  allowedTypes?: MediaType[];
}

const CATEGORIES: MediaCategory[] = [
  'Nature',
  'Abstract',
  'Music',
  'Ambient',
  'Voiceover',
  'Effects',
  'Other',
];

export function MediaUploader({
  onUploadComplete,
  defaultCategory = 'Other',
  allowedTypes,
}: MediaUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<MediaCategory>(defaultCategory);
  const [uploads, setUploads] = useState<Map<string, MediaUploadProgress>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptedFileTypes = () => {
    if (!allowedTypes || allowedTypes.length === 0) {
      return 'image/*,audio/*,video/*';
    }
    return allowedTypes.map(type => `${type}/*`).join(',');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Filter by allowed types if specified
    const validFiles = allowedTypes && allowedTypes.length > 0
      ? files.filter(file => {
          const type = file.type.split('/')[0] as MediaType;
          return allowedTypes.includes(type);
        })
      : files;

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    const uploadMap = new Map<string, MediaUploadProgress>();

    try {
      // Upload files sequentially to avoid overwhelming the system
      for (const file of selectedFiles) {
        const fileName = file.name;
        
        uploadMap.set(fileName, {
          fileName,
          progress: 0,
          status: 'uploading',
        });
        setUploads(new Map(uploadMap));

        try {
          await uploadMediaFile(file, category, (progress) => {
            uploadMap.set(fileName, progress);
            setUploads(new Map(uploadMap));
          });
        } catch (error) {
          uploadMap.set(fileName, {
            fileName,
            progress: 0,
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed',
          });
          setUploads(new Map(uploadMap));
        }
      }

      // Clear selected files after successful uploads
      const allSuccess = Array.from(uploadMap.values()).every(
        upload => upload.status === 'complete'
      );
      
      if (allSuccess) {
        setSelectedFiles([]);
        setUploads(new Map());
        onUploadComplete();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: MediaUploadProgress['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <Select
        label="Category"
        selectedKeys={[category]}
        onChange={(e) => setCategory(e.target.value as MediaCategory)}
        classNames={darkSelectClasses}
      >
        {CATEGORIES.map(cat => (
          <SelectItem key={cat} value={cat} classNames={darkSelectItemClasses}>{cat}</SelectItem>
        ))}
      </Select>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={getAcceptedFileTypes()}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Area */}
      <Card
        isPressable
        onPress={() => fileInputRef.current?.click()}
        classNames={{
          base: 'border-2 border-dashed border-zinc-700 hover:border-blue-500 bg-zinc-800/50 cursor-pointer transition-colors',
        }}
      >
        <CardBody className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="w-12 h-12 text-zinc-400 mb-4" />
            <p className="text-white font-medium mb-2">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-zinc-400">
              {allowedTypes && allowedTypes.length > 0
                ? `Supported: ${allowedTypes.join(', ')}`
                : 'Images, Audio, and Video files'}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-white">
            Selected Files ({selectedFiles.length})
          </h3>
          
          <div className="space-y-2">
            {selectedFiles.map((file, index) => {
              const upload = uploads.get(file.name);
              
              return (
                <Card key={index} classNames={{ base: 'bg-zinc-800' }}>
                  <CardBody className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{file.name}</p>
                        <p className="text-xs text-zinc-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      <div className="flex items-center gap-3 ml-4">
                        {upload && getStatusIcon(upload.status)}
                        
                        {!isUploading && (
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {upload && upload.status === 'uploading' && (
                      <Progress
                        value={upload.progress}
                        className="mt-2"
                        classNames={{
                          indicator: 'bg-blue-500',
                        }}
                      />
                    )}

                    {/* Error Message */}
                    {upload && upload.status === 'error' && upload.error && (
                      <p className="text-xs text-red-500 mt-2">{upload.error}</p>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && (
        <Button
          color="primary"
          size="lg"
          onPress={handleUpload}
          isLoading={isUploading}
          isDisabled={isUploading}
          className="w-full"
        >
          {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} file(s)`}
        </Button>
      )}
    </div>
  );
}
