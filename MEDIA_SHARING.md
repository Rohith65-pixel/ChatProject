# Media Sharing Feature Documentation

## Overview
The chat application now supports media sharing (images and documents) using Cloudinary as the storage provider. Users can upload and share images and documents (PDF, Word, Excel, PowerPoint, etc.) directly in conversations with automatic preview and download capabilities.

## Features Implemented

### Backend Features
1. **Message Types Support**
   - Extended `Message` model to support: `text`, `image`, `file`
   - Added `mediaUrl` and `mediaMetadata` fields to store media information
   - Metadata includes: fileName, fileSize, mimeType, width, height (for images)

2. **Cloudinary Integration**
   - Configured Cloudinary SDK for secure media uploads
   - Created utility functions for generating signed upload URLs
   - Implemented media URL optimization and deletion capabilities

3. **Media API Endpoints**
   - `POST /api/media/upload-signature` - Returns signed URL for direct client upload
   - `POST /api/media/verify` - Verifies uploaded media metadata

4. **Socket Support**
   - Updated `send_message` event to handle media fields
   - Messages can now contain `type`, `mediaUrl`, and `mediaMetadata`

5. **Controller Updates**
   - Updated `messageController.createMessage` to support media messages
   - Validation now accepts either content OR mediaUrl

### Frontend Features
1. **MediaUpload Component** (`/components/MediaUpload.jsx`)
   - File picker for images and documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV)
   - Preview for selected images
   - Upload progress indicator
   - Direct upload to Cloudinary using signed URLs
   - Optional caption support

2. **MediaPreview Component** (`/components/MediaPreview.jsx`)
   - Renders images with click-to-expand
   - Document preview with file type icons (PDF, Word, Excel, PowerPoint)
   - Download button for all media types
   - Displays file metadata (name, size)

3. **MessageBubble Updates**
   - Integrated MediaPreview for non-text messages
   - Displays media with optional caption text
   - Maintains edit/delete functionality for media messages

4. **MessageInput Updates**
   - Added attachment button (📎)
   - Shows MediaUpload component when toggled
   - Supports caption text for media messages
   - Handles both text-only and media messages

5. **ChatScreen Updates**
   - Updated `handleSendMessage` to support media message objects
   - Socket emits include media fields

## Setup Instructions

### 1. Cloudinary Account Setup
1. Sign up at [cloudinary.com](https://cloudinary.com/)
2. Go to Dashboard to get your credentials
3. Copy: Cloud Name, API Key, and API Secret

### 2. Backend Configuration
Add to `/Backend/.env`:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Install Dependencies
Backend already has `cloudinary` installed.
Frontend already has `react-icons` installed.

### 4. Restart Servers
```bash
# Backend
cd Backend
npm run dev

# Frontend
cd Frontend/chatApp
npm run dev
```

## How It Works

### Upload Flow
```
1. User clicks attachment button in MessageInput
2. MediaUpload component opens with file type options
3. User selects file (image/video/audio)
4. Preview shown for images
5. User clicks "Send"
6. Frontend requests signed upload URL from backend (/api/media/upload-signature)
7. Frontend uploads directly to Cloudinary using signed URL
8. Cloudinary returns media URL and metadata
9. Frontend emits socket event with media data
10. Backend creates message with media fields
11. Message broadcast to all participants
12. MediaPreview renders the media in MessageBubble
```

### Message Structure (with media)
```javascript
{
  _id: "msg_id",
  conversationId: "conv_id",
  senderId: "user_id",
  content: "Optional caption text",
  type: "image", // or "file", "text"
  mediaUrl: "https://res.cloudinary.com/...",
  mediaMetadata: {
    fileName: "photo.jpg",
    fileSize: 1048576,
    mimeType: "image/jpeg",
    width: 1920,      // For images only
    height: 1080      // For images only
  },
  status: "delivered",
  createdAt: "2026-09-04T15:20:00Z"
}
```

## Security Considerations

1. **Signed Uploads**: All uploads use signed URLs generated server-side
2. **Authentication**: Media endpoints require JWT authentication
3. **Validation**: File types are validated on both client and server
4. **Authorization**: Only conversation participants can upload media

## File Size Limits

Default Cloudinary limits:
- **Free tier**: 10MB per file
- **Paid tiers**: Up to 100MB per file

Configure in `MediaUpload.jsx` if needed.

## Supported Formats

### Images
- JPEG, PNG, GIF, WebP, SVG, BMP

### Documents
- PDF (`.pdf`)
- Microsoft Word (`.doc`, `.docx`)
- Microsoft Excel (`.xls`, `.xlsx`)
- Microsoft PowerPoint (`.ppt`, `.pptx`)
- Text files (`.txt`)
- CSV files (`.csv`)

## API Reference

### POST /api/media/upload-signature
**Request:**
```json
{
  "resourceType": "image" // or "raw" (for documents)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "...",
    "timestamp": 1693843200,
    "cloudName": "your_cloud_name",
    "apiKey": "your_api_key",
    "folder": "chat-media",
    "resourceType": "image",
    "uploadUrl": "https://api.cloudinary.com/..."
  }
}
```

### POST /api/media/verify
**Request:**
```json
{
  "publicId": "chat-media/abc123",
  "resourceType": "image",
  "url": "https://res.cloudinary.com/...",
  "metadata": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "publicId": "chat-media/abc123",
    "url": "https://res.cloudinary.com/...",
    "resourceType": "image",
    "metadata": { ... }
  }
}
```

## Future Enhancements

1. **Image Compression**: Automatic client-side compression before upload
2. **Thumbnails**: Generate and store thumbnail URLs for faster loading
3. **Media Gallery**: View all media shared in a conversation
4. **PDF Preview**: Inline PDF preview in chat using PDF.js
5. **Progress Tracking**: Real-time upload progress for large files
6. **Document Search**: Search within document contents
7. **File Versioning**: Track different versions of uploaded documents
8. **Media Expiration**: Auto-delete old media to save storage

## Troubleshooting

### Upload fails with "Upload signature generation failed"
- Check Cloudinary credentials in `.env`
- Ensure environment variables are loaded (`dotenv` configured)
- Restart backend server after adding credentials

### Media not displaying
- Check browser console for CORS errors
- Verify Cloudinary URL is accessible
- Check message object contains valid `mediaUrl`

### Large file uploads timing out
- Increase Cloudinary timeout in upload request
- Consider implementing chunked uploads for files > 10MB
- Show user progress indicator to prevent confusion

## Database Migration

Since we added new fields to the Message model, existing text messages will work fine with default values:
- `type` defaults to `"text"`
- `mediaUrl` defaults to `null`
- `mediaMetadata` is optional

No migration script needed.
