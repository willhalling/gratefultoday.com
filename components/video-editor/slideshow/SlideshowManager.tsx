/**
 * SlideshowManager Component
 * 
 * Manages slideshow images with drag-and-drop reordering.
 * Shows thumbnails of images and allows users to reorder, delete, and adjust zoom points.
 * 
 * Features:
 * - Drag and drop reordering
 * - Add images from media library
 * - Delete images
 * - Adjust zoom focal points (future enhancement)
 */

'use client';

import React, { useState } from 'react';
import { Button, Card, CardBody } from '@heroui/react';
import { Trash2, GripVertical, Plus } from 'lucide-react';
import type { SlideImage } from '@/types/slideshow';

export interface SlideshowManagerProps {
  /** Array of slide images */
  images: SlideImage[];
  /** Callback when images change (add, delete, reorder) */
  onChange: (images: SlideImage[]) => void;
  /** Callback to open media library for adding images */
  onAddImages: () => void;
}

export const SlideshowManager: React.FC<SlideshowManagerProps> = ({
  images,
  onChange,
  onAddImages,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (dropIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder images
    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    // Update order property
    const reorderedImages = newImages.map((img, idx) => ({
      ...img,
      order: idx,
    }));

    onChange(reorderedImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDelete = (imageId: string) => {
    const newImages = images
      .filter(img => img.id !== imageId)
      .map((img, idx) => ({ ...img, order: idx }));
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {images.length === 0 ? 'No images' : `${images.length} image${images.length > 1 ? 's' : ''}`}
        </p>
        <Button
          size="sm"
          color="primary"
          startContent={<Plus size={16} />}
          onPress={onAddImages}
        >
          Add Images
        </Button>
      </div>

      {/* Images grid with drag and drop */}
      {images.length > 0 ? (
        <div className="space-y-2">
          {images.map((image, index) => (
            <Card
              key={image.id}
              draggable
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver(index)}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`
                cursor-move transition-all
                ${draggedIndex === index ? 'opacity-50' : 'opacity-100'}
                ${dragOverIndex === index && draggedIndex !== index ? 'border-2 border-primary' : 'border border-gray-700'}
              `}
            >
              <CardBody className="p-3">
                <div className="flex items-center gap-3">
                  {/* Drag handle */}
                  <div className="flex-shrink-0 text-gray-500 cursor-grab active:cursor-grabbing">
                    <GripVertical size={20} />
                  </div>

                  {/* Order number */}
                  <div className="flex-shrink-0 w-6 text-center text-sm font-medium text-gray-400">
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-gray-800">
                    <img
                      src={image.url}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Image info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-gray-300">
                      {image.url.split('/').pop()?.split('?')[0] || 'Image'}
                    </p>
                    {image.width && image.height && (
                      <p className="text-xs text-gray-500">
                        {image.width} × {image.height}
                      </p>
                    )}
                  </div>

                  {/* Delete button */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleDelete(image.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleDelete(image.id);
                      }
                    }}
                    className="flex-shrink-0 p-2 rounded hover:bg-red-500/10 text-red-500 cursor-pointer transition-colors"
                  >
                    <Trash2 size={18} />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
          <p className="text-gray-500 mb-4">No images added yet</p>
          <Button
            color="primary"
            variant="flat"
            startContent={<Plus size={16} />}
            onPress={onAddImages}
          >
            Add Images from Library
          </Button>
        </div>
      )}
    </div>
  );
};
