/**
 * SlideshowManagerModal Component
 * 
 * Modal for managing slideshow images with drag-and-drop reordering.
 * Integrates with Media Manager for image selection.
 * 
 * Features:
 * - Add images from media library
 * - Drag and drop to reorder
 * - Delete images
 * - Lazy-loaded for performance
 */

'use client';

import React, { useState, lazy, Suspense } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@heroui/react';
import { SlideshowManager } from './SlideshowManager';
import type { SlideImage } from '@/types/slideshow';
import type { MediaItem } from '@/types/media';

// Lazy load media manager
const MediaManagerModal = lazy(() =>
  import('../media-manager/MediaManagerModal').then((mod) => ({ default: mod.MediaManagerModal }))
);

export interface SlideshowManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: SlideImage[];
  onChange: (images: SlideImage[]) => void;
}

export const SlideshowManagerModal: React.FC<SlideshowManagerModalProps> = ({
  isOpen,
  onClose,
  images,
  onChange,
}) => {
  const [showMediaManager, setShowMediaManager] = useState(false);

  const handleAddImages = () => {
    setShowMediaManager(true);
  };

  const handleMediaSelect = async (mediaItem: MediaItem) => {
    // Create a new SlideImage from the media item
    const newImage: SlideImage = {
      id: mediaItem.id,
      url: mediaItem.url,
      order: images.length, // Add to end
      width: mediaItem.width,
      height: mediaItem.height,
      zoomX: 0.5, // Default center
      zoomY: 0.5, // Default center
    };

    // Add to images array
    onChange([...images, newImage]);
    setShowMediaManager(false);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
        <ModalContent className="bg-gray-950 border border-gray-800">
          <ModalHeader className="border-b border-gray-800 text-white">
            Manage Slideshow Images
          </ModalHeader>
          <ModalBody className="py-6">
            <SlideshowManager
              images={images}
              onChange={onChange}
              onAddImages={handleAddImages}
            />
          </ModalBody>
          <ModalFooter className="border-t border-gray-800">
            <Button
              onPress={onClose}
              className="bg-purple-600 font-semibold text-white hover:bg-purple-700"
            >
              Done
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Lazy-loaded Media Manager Modal */}
      {showMediaManager && (
        <Suspense fallback={null}>
          <MediaManagerModal
            isOpen={showMediaManager}
            onClose={() => setShowMediaManager(false)}
            onSelectMedia={handleMediaSelect}
            mediaType="image"
            title="Select Images for Slideshow"
          />
        </Suspense>
      )}
    </>
  );
};
