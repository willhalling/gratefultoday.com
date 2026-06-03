'use client';

import React from 'react';
import { Card, CardBody, Chip } from '@heroui/react';
import { Image as ImageIcon, Music, Video, Trash2 } from 'lucide-react';
import type { MediaItem } from '../../../types/media';
import { formatFileSize, formatDuration } from '../../../lib/media-utils';

interface MediaItemCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}

export function MediaItemCard({ item, onSelect, onDelete }: MediaItemCardProps) {
  const getIcon = () => {
    switch (item.type) {
      case 'image':
        return <ImageIcon className="w-6 h-6 text-blue-400" />;
      case 'audio':
        return <Music className="w-6 h-6 text-green-400" />;
      case 'video':
        return <Video className="w-6 h-6 text-purple-400" />;
    }
  };

  const getPreview = () => {
    if (item.type === 'image') {
      return (
        <img
          src={item.url}
          alt={item.name}
          className="w-full h-40 object-cover"
        />
      );
    }
    if (item.type === 'video') {
      return (
        <video
          src={item.url}
          className="w-full h-40 object-cover"
          muted
        />
      );
    }
    // Audio - show waveform icon
    return (
      <div className="w-full h-40 bg-zinc-800 flex items-center justify-center">
        <Music className="w-16 h-16 text-green-400/30" />
      </div>
    );
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${item.name}"?`)) {
      onDelete(item);
    }
  };

  return (
    <Card
      isPressable
      onPress={() => onSelect(item)}
      classNames={{
        base: 'bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer',
      }}
    >
      <CardBody className="p-0">
        {/* Preview */}
        <div className="relative">
          {getPreview()}
          
          {/* Type Badge */}
          <div className="absolute top-2 left-2">
            <Chip
              size="sm"
              variant="flat"
              classNames={{
                base: 'bg-black/60 backdrop-blur-sm',
                content: 'text-white flex items-center gap-1',
              }}
            >
              {getIcon()}
              <span className="capitalize">{item.type}</span>
            </Chip>
          </div>

          {/* Delete Button */}
          <div
            onClick={handleDelete}
            className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
            title="Delete"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleDelete(e as any);
              }
            }}
          >
            <Trash2 className="w-4 h-4 text-white" />
          </div>

          {/* Duration (for audio/video) */}
          {item.duration && (
            <div className="absolute bottom-2 right-2">
              <Chip
                size="sm"
                variant="flat"
                classNames={{
                  base: 'bg-black/60 backdrop-blur-sm',
                  content: 'text-white text-xs',
                }}
              >
                {formatDuration(item.duration)}
              </Chip>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          <p className="text-sm font-medium text-white truncate" title={item.name}>
            {item.name}
          </p>
          
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <Chip size="sm" variant="flat" className="bg-zinc-700">
              {item.category}
            </Chip>
            <span>{formatFileSize(item.size)}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

interface MediaGridProps {
  items: MediaItem[];
  onSelectMedia: (item: MediaItem) => void;
  onDeleteMedia: () => void;
}

export function MediaGrid({ items, onSelectMedia, onDeleteMedia }: MediaGridProps) {
  const handleDelete = async (item: MediaItem) => {
    try {
      const { deleteMediaItem } = await import('../../../lib/media-utils');
      await deleteMediaItem(item);
      onDeleteMedia();
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Failed to delete media item');
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-zinc-400">
        <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg">No media found</p>
        <p className="text-sm">Upload some files to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
      {items.map((item) => (
        <MediaItemCard
          key={item.id}
          item={item}
          onSelect={onSelectMedia}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
