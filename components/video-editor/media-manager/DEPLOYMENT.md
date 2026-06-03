# Media Manager Deployment Guide

## Step 1: Update Firestore Security Rules

Add the media library rules to your `firestore.rules` file:

```
// Media Library Collection - Shared across all authenticated users
match /mediaLibrary/{mediaId} {
  // Anyone authenticated can read
  allow read: if request.auth != null;
  
  // Anyone authenticated can create (upload)
  allow create: if request.auth != null
    && request.resource.data.keys().hasAll(['type', 'url', 'name', 'category', 'uploadedAt', 'size', 'mimeType'])
    && request.resource.data.type in ['image', 'audio', 'video']
    && request.resource.data.category in ['Nature', 'Abstract', 'Music', 'Ambient', 'Voiceover', 'Effects', 'Other'];
  
  // Anyone authenticated can delete (remove from library)
  allow delete: if request.auth != null;
  
  // No updates needed for now
  allow update: if false;
}
```

Deploy with:
```bash
firebase deploy --only firestore:rules
```

## Step 2: Update Storage Security Rules

Add the media library storage rules to your `storage.rules` file:

```
// Media Library Storage - Shared across all users
match /media-library/{allPaths=**} {
  // Anyone authenticated can read
  allow read: if request.auth != null;
  
  // Anyone authenticated can create (upload)
  // Validate file types and sizes
  allow create: if request.auth != null
    && (
      // Images: max 10MB
      (request.resource.contentType.matches('image/.*') && request.resource.size < 10 * 1024 * 1024)
      ||
      // Audio: max 50MB
      (request.resource.contentType.matches('audio/.*') && request.resource.size < 50 * 1024 * 1024)
      ||
      // Video: max 100MB
      (request.resource.contentType.matches('video/.*') && request.resource.size < 100 * 1024 * 1024)
    );
  
  // Anyone authenticated can delete
  allow delete: if request.auth != null;
  
  // No updates
  allow update: if false;
}
```

Deploy with:
```bash
firebase deploy --only storage
```

## Step 3: Create Firestore Indexes (Optional but Recommended)

Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "mediaLibrary",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "uploadedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "mediaLibrary",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "uploadedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy with:
```bash
firebase deploy --only firestore:indexes
```

## Step 4: Test the Implementation

1. **Start the development server:**
   ```bash
   yarn dev:grateful
   ```

2. **Navigate to the video editor**

3. **Test upload functionality:**
   - Click "Browse Library" on any upload section
   - Switch to "Upload" tab
   - Select a category
   - Upload an image, audio, or video file
   - Verify progress tracking works
   - Confirm file appears in Firebase Storage and Firestore

4. **Test browse functionality:**
   - Switch to "Browse" tab
   - Verify uploaded files appear
   - Test search functionality
   - Test type and category filters
   - Click on a media item to select it
   - Verify it loads into the video editor

5. **Test delete functionality:**
   - Click the trash icon on a media item
   - Confirm deletion dialog
   - Verify file is removed from both Storage and Firestore

## Troubleshooting

### Files not appearing after upload

**Check:**
- Firestore console - verify document was created in `mediaLibrary` collection
- Storage console - verify file was uploaded to `media-library/` path
- Browser console for errors
- Ensure user is authenticated

**Solution:**
```bash
# Redeploy security rules
firebase deploy --only firestore:rules,storage
```

### Upload fails with permission error

**Check:**
- User authentication status
- Security rules are deployed correctly
- File size is within limits (10MB images, 50MB audio, 100MB video)

**Solution:**
```bash
# Check current rules
firebase firestore:rules:list
firebase storage:rules:list

# Redeploy if needed
firebase deploy --only firestore:rules,storage
```

### Can't delete media items

**Check:**
- Firestore rules allow delete for authenticated users
- Storage rules allow delete for authenticated users
- User is authenticated

**Solution:**
Verify rules match the template above and redeploy.

### TypeScript errors

The media manager uses strict TypeScript. Most errors shown are pre-existing in the codebase related to lucide-react and HeroUI type definitions.

**Critical errors fixed:**
- ✅ Firebase imports (using `firestoreDb` alias)
- ✅ Import ordering
- ✅ Type definitions

**Known non-critical warnings:**
- lucide-react JSX component types (pre-existing)
- HeroUI Select value prop (pre-existing)
- Browser APIs (File, URL, HTMLElement) not defined in strict mode (pre-existing)

These warnings don't affect functionality and exist throughout the GratefulToday codebase.

## Monitoring

### Check Firestore Usage
- Go to Firebase Console > Firestore > Usage tab
- Monitor document reads/writes
- Check storage growth

### Check Storage Usage
- Go to Firebase Console > Storage > Usage tab
- Monitor file count and total size
- Set up usage alerts if needed

### User Feedback
- Monitor for upload errors
- Check file loading performance
- Verify media selection workflow is smooth

## Future Enhancements

Once the basic system is working well, consider:

1. **Add video thumbnails:** Automatically generate thumbnails for video files
2. **Implement lazy loading/pagination:** For large media libraries
3. **Add usage analytics:** Track which media items are most popular
4. **User favorites:** Allow users to star frequently-used items
5. **Bulk operations:** Multi-select for batch delete
6. **Advanced organization:** Subfolder support within categories
7. **Media preview:** Built-in player for audio/video preview

## Deployment Checklist

- [ ] Firestore rules deployed
- [ ] Storage rules deployed
- [ ] Indexes deployed (optional)
- [ ] Test upload functionality
- [ ] Test browse/search functionality
- [ ] Test delete functionality
- [ ] Test media selection into video editor
- [ ] Monitor Firebase usage after deployment
- [ ] Verify performance with multiple users
- [ ] Check error logging and handling

## Complete Deployment Command

```bash
# Deploy everything at once
firebase deploy --only firestore:rules,firestore:indexes,storage

# Or individually
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

## Rollback Plan

If issues occur:

1. **Disable media manager UI:**
   Comment out the "Browse Library" buttons in `FileUpload.tsx`

2. **Revert security rules:**
   ```bash
   git checkout HEAD~1 firestore.rules storage.rules
   firebase deploy --only firestore:rules,storage
   ```

3. **Clean up data (if needed):**
   - Manually delete `mediaLibrary` collection from Firestore
   - Manually delete `media-library/` folder from Storage

## Success Metrics

After deployment, verify:
- [ ] Users can upload media successfully
- [ ] Media appears in the library immediately
- [ ] Search and filters work correctly
- [ ] Media can be selected and used in videos
- [ ] Delete functionality works properly
- [ ] No significant performance degradation
- [ ] Firebase costs remain within budget
