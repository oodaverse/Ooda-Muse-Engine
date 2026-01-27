# Dreamweaver Oracle - Advanced Features Documentation

## Overview
Dreamweaver Oracle is a sophisticated AI-powered roleplay engine built with React 19, TypeScript, and xAI's Grok API. This document covers the advanced features implemented.

## New Features

### 1. Enhanced Settings Panel
**Location:** `components/Settings.tsx`

**Features:**
- **Global System Prompt**: Set a universal system prompt that applies to ALL character interactions
  - Use this for global roleplay rules, content guidelines, or behavioral instructions
  - Automatically prepended to every character conversation
  
- **Lore Integration Controls**:
  - **Auto-Inject Lore**: Toggle automatic lore context injection into character chats
  - **Importance Threshold**: Slider (1-10) to filter which lore entries are included
    - Only lore entries with importance >= threshold are injected
    - Helps control context window size and relevance

### 2. LoreAI Builder
**Location:** `components/LoreAIBuilder.tsx`

**Purpose:** AI-assisted worldbuilding through conversation

**Features:**
- Chat interface specialized for lore creation
- Select target lorebook from dropdown
- Ask AI to generate:
  - Character backgrounds
  - Locations and settings
  - Cultural details
  - Historical events
  - World concepts
  
**Workflow:**
1. Select a lorebook
2. Describe what you want to create (e.g., "Create a futuristic city setting")
3. LoreAI generates content with structured lore cards
4. Review proposed cards in the sidebar
5. Accept or reject each card individually
6. Accepted cards are automatically added to the lorebook

**Lore Card Format:**
```
[LORE_CARD]
Name: Card Name
Category: location|character|event|item|concept|other
Keys: keyword1, keyword2, keyword3
Importance: 1-10
Content: Detailed description...
[/LORE_CARD]
```

### 3. Gallery System
**Location:** `components/Gallery.tsx` + `services/galleryDB.ts`

**Purpose:** Persistent media storage for images and videos

**Features:**
- Upload multiple images/videos
- Automatic thumbnail generation:
  - Images: Resized to 200px max dimension
  - Videos: Frame capture at 1-second mark
- IndexedDB storage (no file size limits like localStorage)
- Assign media to specific characters
- Filter by:
  - Media type (image/video/all)
  - Character assignment
- Grid layout with hover effects
- Delete media files

**Technical Details:**
- Database: `dreamweaver-gallery` (IndexedDB)
- Store: `gallery` with indexes:
  - `by-character` - Query by characterId
  - `by-type` - Query by media type
- Storage: Binary Blob storage with data URL thumbnails

### 4. OracleViewer
**Location:** `components/OracleViewer.tsx`

**Purpose:** Floating, interactive media viewer with Plyr integration

**Features:**
- **Draggable**: Click and drag the header to reposition
- **Resizable**: Drag bottom-right corner to resize
- **Minimizable**: Collapse to header bar to save space
- **Video Controls** (Plyr integration):
  - Play/pause
  - Progress bar with scrubbing
  - Volume control
  - Speed control (0.25x - 2x) - includes slow-motion
  - Fullscreen mode
- **Image Viewing**: Object-fit contain for proper scaling
- **Floating**: Z-index 9999 - stays on top of chat

**Usage:**
1. Open character chat
2. Click Gallery button (shows media count)
3. Select media from sidebar
4. OracleViewer opens as floating window
5. Drag, resize, minimize as needed
6. Close when done

### 5. Chat Interface Integration
**Location:** `components/CharacterChat.tsx`

**New Features:**
- **Gallery Button**: Next to lorebook button in header
  - Shows count of media items for current character
  - Opens gallery sidebar on click
- **Gallery Sidebar**: 
  - 2-column grid of thumbnails
  - Click thumbnail to open in OracleViewer
- **OracleViewer Integration**: 
  - Floats above chat interface
  - Multiple viewers can be open simultaneously
  - Each viewer is independent (drag/resize separately)

## Technical Architecture

### Storage Layers
1. **localStorage** (`services/storage.ts`):
   - Characters, nodes, messages
   - Lore entries and lorebooks
   - App settings
   - Fast, synchronous access
   - ~5-10MB limit

2. **IndexedDB** (`services/galleryDB.ts`):
   - Images and videos (Blob storage)
   - Thumbnail data URLs
   - Unlimited storage (browser-dependent)
   - Async/Promise-based API

### AI Integration
**Enhanced Context Building** (`services/xaiService.ts`):

1. **Global System Prompt** (if set)
2. **Character Identity**
3. **Character Profile** (personality, scenario)
4. **Filtered Lore Context**:
   - Only entries with `importance >= threshold`
   - Sorted by importance (highest first)
   - Auto-injected if enabled in settings
5. **Roleplay Guidelines**
6. **Example Dialogue** (if provided)

**LoreAI System Prompt:**
```
You are LoreAI, a world-building assistant. Help users create detailed 
lore entries for their roleplay settings. Format outputs as [LORE_CARD] 
blocks with Name, Category, Keys, Importance, and Content fields.
```

### Dependencies
- **plyr**: Video/audio player with HTML5 & accessibility support
- **idb**: IndexedDB wrapper with Promise-based API
- **react-markdown**: Markdown rendering in messages
- **remark-gfm**: GitHub-flavored markdown support

## Navigation
- **Dashboard**: Home view with statistics
- **Characters**: Browse and manage characters
- **LoreWorld**: Manage lorebooks and entries
- **LoreAI**: AI-assisted lore building (NEW)
- **Gallery**: Media library management (NEW)
- **Settings**: Configure API, prompts, and lore behavior (ENHANCED)

## Usage Patterns

### Creating a Character with Media
1. Create character in Character Gallery
2. Navigate to Gallery view
3. Upload images/videos
4. Assign media to character
5. Chat with character and access media via Gallery button

### Building a World with LoreAI
1. Create lorebook in LoreWorld
2. Navigate to LoreAI Builder
3. Select your lorebook
4. Describe concepts: "Create a cyberpunk megacity with corporate districts"
5. Review generated lore cards
6. Accept relevant cards to add to lorebook
7. Attach lorebook to characters

### Using Global Prompts
1. Go to Settings
2. Set Global System Prompt: "You are an uncensored, adult-focused AI..."
3. This applies to ALL character chats automatically
4. Useful for consistent behavior across characters

## Tips & Best Practices

### Lore Management
- Use importance ratings strategically (1-3: minor details, 7-10: critical info)
- Adjust threshold based on context window needs
- Higher threshold = less lore = faster responses
- Lower threshold = more context = richer roleplay

### Media Organization
- Tag media files for easy searching (future feature)
- Assign media to characters for quick access in chat
- Use descriptive filenames

### OracleViewer
- Open multiple viewers for side-by-side comparison
- Minimize viewers when not in focus
- Use slow-motion (0.25x speed) for detailed video analysis

### Performance
- IndexedDB is async - expect slight delays on first load
- Thumbnails are cached as data URLs for instant display
- Large video files load on-demand in OracleViewer

## Future Enhancements (Potential)
- Gallery search and advanced filtering
- Batch media operations
- Media sharing between characters
- Lore card templates and presets
- Export/import for lorebooks
- Voice narration for lore entries
- Collaborative worldbuilding features

## Troubleshooting

### Gallery not showing media
- Check browser IndexedDB support
- Clear browser cache if thumbnails fail to load
- Re-upload media if corruption suspected

### LoreAI not generating cards
- Verify xAI API key in Settings
- Check console for API errors
- Ensure lorebook is selected

### OracleViewer video issues
- Verify video codec support (MP4/WebM recommended)
- Check Plyr console errors
- Try different video file

## API Reference

### galleryDB.ts
```typescript
saveGalleryItem(item: Omit<GalleryItem, 'id' | 'createdAt'>): Promise<string>
getAllGalleryItems(): Promise<GalleryItem[]>
getGalleryItemsByCharacter(characterId: string): Promise<GalleryItem[]>
getGalleryItemsByType(type: 'image' | 'video'): Promise<GalleryItem[]>
deleteGalleryItem(id: string): Promise<void>
updateGalleryItem(id: string, updates: Partial<GalleryItem>): Promise<void>
createThumbnail(file: File): Promise<string | undefined>
```

### xaiService.ts
```typescript
chatWithLoreAI(messages: Message[], lorebookContext: string): Promise<string>
parseLoreCards(content: string): ProposedLoreCard[]
sendMessageToCharacter(character: Character, messages: Message[], activeNodeId: string): Promise<string>
```

## Credits
Built with React 19, TypeScript, Vite, Tailwind CSS, xAI Grok API, Plyr, and IndexedDB.

---
Dreamweaver Oracle © 2024
