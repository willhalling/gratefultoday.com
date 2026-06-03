# Media Manager

A comprehensive media library system for managing reusable assets (images, audio, and video) across the GratefulToday video editor.

## Features

- **Multi-format Support**: Images, audio files, and video backgrounds
- **Shared Library**: All authenticated users can access and contribute to the media library
- **Category Organization**: Organize media by categories (Nature, Abstract, Music, Ambient, Voiceover, Effects, Other)
- **Search & Filter**: Find media quickly with search and category/type filters
- **Upload Management**: Track upload progress with visual feedback
- **Thumbnail Preview**: Grid view with thumbnails for easy browsing
- **Delete Capability**: Remove media from the library
- **Lazy Loading**: Modal and components are lazy-loaded for optimal performance
- **Responsive Design**: Works seamlessly across different screen sizes

## Architecture

### Components

```
components/video-editor/media-manager/
├── MediaManagerModal.tsx      # Main modal with tabs (Browse/Upload)
├── MediaGrid.tsx              # Grid display of media items
├── MediaUploader.tsx          # Upload interface with progress tracking
└── index.ts                   # Export barrel file
```

### Data Layer

```
types/media.ts                 # TypeScript interfaces
lib/media-utils.ts            # Firestore/Storage operations
```

### Security

```
firestore-media-library.rules  # Firestore security rules
storage-media-library.rules    # Storage security rules
```

## Usage

### In FileUpload Component

The media manager is integrated into the video editor's file upload section:

```tsx
import { MediaManagerModal } from './media-manager';

// User clicks "Browse Library" button
// Modal opens filtered by media type (audio/image/video)
// User selects media from library
// Media is loaded into the video editor
```

### Component API

```tsx
<MediaManagerModal
  isOpen={boolean}
  onClose={() => void}
  onSelectMedia={(mediaItem: MediaItem) => void}
  mediaType?: 'image' | 'audio' | 'video'  // Optional filter
  title?: string                            // Modal title
/>
```

## Data Models

### MediaItem

```typescript
interface MediaItem {
  id: string;
  type: 'image' | 'audio' | 'video';
  url: string;
  name: string;
  category: MediaCategory;
  thumbnail?: string;      // For videos
  uploadedAt: Date;
  size: number;           // In bytes
  duration?: number;      // In seconds for audio/video
  mimeType: string;
}
```

### MediaCategory

```typescript
type MediaCategory = 
  | 'Nature'
  | 'Abstract'
  | 'Music'
  | 'Ambient'
  | 'Voiceover'
  | 'Effects'
  | 'Other';
```

## Firebase Structure

### Firestore Collection

```
mediaLibrary/
  {mediaId}/
    - type: string
    - url: string
    - name: string
    - category: string
    - uploadedAt: Timestamp
    - size: number
    - mimeType: string
    - duration?: number
    - thumbnail?: string
```

### Storage Structure

```
media-library/
  images/
    {timestamp}_{filename}
  audios/
    {timestamp}_{filename}
  videos/
    {timestamp}_{filename}
```

## Security Rules

### Firestore Rules

- **Read**: All authenticated users
- **Create**: All authenticated users (with data validation)
- **Delete**: All authenticated users
- **Update**: Disabled

### Storage Rules

- **Read**: All authenticated users
- **Create**: Authenticated users (with file type and size validation)
  - Images: max 10MB
  - Audio: max 50MB
  - Video: max 100MB
- **Delete**: All authenticated users
- **Update**: Disabled

## Key Functions

### `uploadMediaFile(file, category, onProgress)`

Uploads a file to Firebase Storage and creates Firestore metadata.

**Features:**
- Progress tracking
- Automatic duration extraction for audio/video
- Error handling
- Timestamp-based naming

### `getAllMediaItems()`

Fetches all media items sorted by upload date (newest first).

### `getMediaItemsByType(type)`

Fetches media items filtered by type (image/audio/video).

### `getMediaItemsByCategory(category)`

Fetches media items filtered by category.

### `deleteMediaItem(mediaItem)`

Deletes media from both Storage and Firestore.

**Cleans up:**
- Main file from Storage
- Thumbnail (if exists)
- Firestore document

## UI/UX Features

### Browse Tab

- **Search**: Real-time filtering by filename or category
- **Type Filter**: Filter by image/audio/video
- **Category Filter**: Filter by category
- **Grid View**: Responsive grid with thumbnails
- **Media Cards**: Show preview, type badge, duration, size, category

### Upload Tab

- **Category Selection**: Choose category before upload
- **Drag & Drop**: Visual upload area
- **Multi-file**: Upload multiple files at once
- **Progress Tracking**: Individual progress bars per file
- **Error Handling**: Clear error messages
- **Success Feedback**: Confirmation on completion

## Performance Optimizations

1. **Lazy Loading**: Modal only loads when opened
2. **Suspense Boundaries**: Graceful loading states
3. **Pagination Ready**: Grid structure supports future pagination
4. **Optimized Queries**: Firestore queries with proper indexing
5. **Image Optimization**: Thumbnails for videos (future enhancement)

## Future Enhancements

### Phase 2 (Not Yet Implemented)

- [ ] Edit capabilities (crop, rotate, zoom)
- [ ] Drag-and-drop reordering
- [ ] Folder/subfolder organization
- [ ] Bulk operations (multi-select delete)
- [ ] Advanced search (tags, metadata)
- [ ] Usage analytics (which media is used most)
- [ ] Video thumbnail generation
- [ ] Preview player (audio/video)
- [ ] Favorites/starred items
- [ ] User-specific collections within shared library

## Integration Points

### Current

- **FileUpload.tsx**: "Browse Library" buttons for audio, voiceover, and images
- **Video Editor**: Direct integration via FileUpload component

### Future Integration Opportunities

- **Template System**: Pre-populate videos with library assets
- **Batch Processing**: Create multiple videos using library assets
- **Admin Panel**: Curate and manage shared library
- **Export/Import**: Share media libraries between projects

## Developer Notes

### Adding New Categories

1. Update `MediaCategory` type in `types/media.ts`
2. Add to `CATEGORIES` array in `MediaManagerModal.tsx` and `MediaUploader.tsx`
3. Update Firestore rules validation

### Customizing UI

All components use @heroui/react with consistent styling:
- Dark theme (bg-zinc-900/800)
- Purple accents (bg-purple-600)
- Responsive breakpoints

### Error Handling

All operations include try/catch blocks with:
- Console error logging
- User-friendly error messages
- Fallback states

## Testing Checklist

- [ ] Upload image file
- [ ] Upload audio file
- [ ] Upload video file
- [ ] Search for media
- [ ] Filter by type
- [ ] Filter by category
- [ ] Select media from library
- [ ] Delete media from library
- [ ] Multi-file upload
- [ ] Upload progress tracking
- [ ] Error handling (network failure)
- [ ] Error handling (unsupported file type)
- [ ] Large file handling
- [ ] Mobile responsiveness

## Troubleshooting

### Media not appearing after upload

1. Check Firestore console for document creation
2. Check Storage console for file upload
3. Verify security rules are deployed
4. Check browser console for errors

### Upload fails

1. Verify user is authenticated
2. Check file size limits
3. Check network connection
4. Verify Storage bucket is configured

### Can't delete media

1. Verify user is authenticated
2. Check Firestore/Storage rules
3. Check console for error messages

## Dependencies

- @heroui/react - UI components
- firebase/firestore - Database operations
- firebase/storage - File storage
- lucide-react - Icons
- React 18+ - Framework

## License

Part of GratefulToday Limited monorepo.
