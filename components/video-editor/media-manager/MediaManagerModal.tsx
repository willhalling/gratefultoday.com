'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Tabs,
  Tab,
  Input,
  Select,
  SelectItem,
  Spinner,
} from '@heroui/react';
import { Search, Upload } from 'lucide-react';
import type { MediaItem, MediaType, MediaCategory } from '../../../types/media';
import { getAllMediaItems, getMediaItemsByType } from '../../../lib/media-utils';
import { MediaGrid } from './MediaGrid';
import { MediaUploader } from './MediaUploader';
import { darkSelectClasses, darkSelectItemClasses } from '../DarkSelect';

interface MediaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (mediaItem: MediaItem) => void;
  mediaType?: MediaType; // Filter to specific type
  title?: string;
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

export function MediaManagerModal({
  isOpen,
  onClose,
  onSelectMedia,
  mediaType,
  title = 'Media Library',
}: MediaManagerModalProps) {
  const [activeTab, setActiveTab] = useState<string>('browse');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory | 'all'>('all');
  const [selectedType, setSelectedType] = useState<MediaType | 'all'>(mediaType || 'all');

  // Load media items
  useEffect(() => {
    if (isOpen) {
      loadMediaItems();
    }
  }, [isOpen, mediaType]);

  // Filter items based on search, category, and type
  useEffect(() => {
    let items = [...mediaItems];

    // Filter by type
    if (selectedType !== 'all') {
      items = items.filter(item => item.type === selectedType);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }

    setFilteredItems(items);
  }, [mediaItems, selectedType, selectedCategory, searchQuery]);

  const loadMediaItems = async () => {
    setLoading(true);
    try {
      const items = mediaType 
        ? await getMediaItemsByType(mediaType)
        : await getAllMediaItems();
      setMediaItems(items);
    } catch (error) {
      console.error('Error loading media items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    loadMediaItems();
    setActiveTab('browse');
  };

  const handleSelectMedia = (item: MediaItem) => {
    onSelectMedia(item);
    onClose();
  };

  const handleDeleteMedia = () => {
    loadMediaItems();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
      classNames={{
        base: 'bg-zinc-900',
        header: 'border-b border-zinc-800',
        body: 'py-6',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </ModalHeader>
        <ModalBody>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            classNames={{
              tabList: 'bg-zinc-800/50',
              cursor: 'bg-blue-600',
              tab: 'text-zinc-400',
              tabContent: 'group-data-[selected=true]:text-white',
            }}
          >
            <Tab
              key="browse"
              title={
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  <span>Browse</span>
                </div>
              }
            >
              <div className="space-y-4 mt-4">
                {/* Search and Filters */}
                <div className="flex gap-3">
                  <Input
                    placeholder="Search media..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    startContent={<Search className="w-4 h-4 text-zinc-400" />}
                    classNames={{
                      input: 'bg-zinc-800 text-white',
                      inputWrapper: 'bg-zinc-800 border-zinc-700',
                    }}
                    className="flex-1"
                  />
                  
                  {!mediaType && (
                    <Select
                      label="Type"
                      selectedKeys={selectedType !== 'all' ? [selectedType] : []}
                      onChange={(e) => setSelectedType((e.target.value as MediaType) || 'all')}
                      className="w-40"
                      classNames={darkSelectClasses}
                    >
                      <SelectItem key="all" value="all" classNames={darkSelectItemClasses}>All Types</SelectItem>
                      <SelectItem key="image" value="image" classNames={darkSelectItemClasses}>Images</SelectItem>
                      <SelectItem key="audio" value="audio" classNames={darkSelectItemClasses}>Audio</SelectItem>
                      <SelectItem key="video" value="video" classNames={darkSelectItemClasses}>Videos</SelectItem>
                    </Select>
                  )}

                  <Select
                    label="Category"
                    selectedKeys={selectedCategory !== 'all' ? [selectedCategory] : []}
                    onChange={(e) => setSelectedCategory((e.target.value as MediaCategory) || 'all')}
                    className="w-44"
                    classNames={darkSelectClasses}
                  >
                    <SelectItem key="all" value="all" classNames={darkSelectItemClasses}>All Categories</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat} classNames={darkSelectItemClasses}>{cat}</SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Media Grid */}
                {loading ? (
                  <div className="flex justify-center items-center h-96">
                    <Spinner size="lg" color="primary" />
                  </div>
                ) : (
                  <MediaGrid
                    items={filteredItems}
                    onSelectMedia={handleSelectMedia}
                    onDeleteMedia={handleDeleteMedia}
                  />
                )}
              </div>
            </Tab>

            <Tab
              key="upload"
              title={
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </div>
              }
            >
              <div className="mt-4">
                <MediaUploader
                  onUploadComplete={handleUploadComplete}
                  defaultCategory={selectedCategory !== 'all' ? selectedCategory : 'Other'}
                  allowedTypes={mediaType ? [mediaType] : undefined}
                />
              </div>
            </Tab>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
