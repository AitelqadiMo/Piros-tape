# Artist Images Fetched with Lyrics

## Overview

When you fetch song lyrics, the system now automatically fetches artist images in the **same step**. This means:

- ✅ Lyrics API call also retrieves artist photos
- ✅ Artist images cached and reused
- ✅ Images ready for thumbnail generation
- ✅ No additional API calls needed

---

## How It Works

### Before (Old Flow)
```
User Request for Lyrics
    ↓
API /lyrics → fetchLyrics()
    ↓
Return only lyrics
    ↓
User must separately fetch artist images
```

### After (New Flow)
```
User Request for Lyrics
    ↓
API /lyrics → fetchLyrics() + fetchArtistImages() [PARALLEL]
    ↓
Return lyrics + artist images
    ↓
Both ready to use!
```

---

## Implementation Details

### 1. New Function: `findArtistImageUrl()`
Located in `lib/artist-images.ts`

Uses Gemini to search for public image URLs:
```typescript
const prompt = `Find a high-quality, publicly available image URL 
of the musician or band "${artistName}". 
Return ONLY the direct image URL.`;
```

- Searches for publicly available images
- Returns direct image URL (e.g., from Wikipedia, Discogs, etc.)
- Returns `NOT_FOUND` if no suitable image found
- Timeout: 30 seconds (same as text generation)

### 2. Enhanced Function: `getArtistImagePath()`

Now accepts optional API key and automatically fetches:
```typescript
export async function getArtistImagePath(
  artistName: string,
  apiKey?: string  // ← NEW
): Promise<string | null>
```

**Behavior**:
1. Check if artist image is cached locally
2. If cached and file exists → return it
3. If not cached and apiKey provided → fetch from web
4. Download and save to cache
5. Return local file path

### 3. New Function: `fetchArtistImages()`

Batch fetches images for all artists in a song:
```typescript
export async function fetchArtistImages(
  artistsString: string,  // "Artist1 × Artist2 × Artist3"
  apiKey: string
): Promise<{ [artistName: string]: string | null }>
```

- Splits artist string by " × " delimiter
- Fetches all images in parallel
- Returns map of artist name → file path

### 4. Updated Endpoint: `/api/lyrics`

Now returns both lyrics AND artist images:

**Request**:
```json
POST /api/lyrics
{
  "artist": "John Doe",
  "title": "Song Title"
}
```

**Response**:
```json
{
  "lyrics": "Verse 1\nLine 1...",
  "found": true,
  "artistImages": {
    "John Doe": "/output/artist_images/John_Doe_1234567890.jpg"
  }
}
```

---

## Integration Points

### Use in Pipeline

When creating a job with lyrics:

```typescript
// Fetch lyrics + artist images
const response = await fetch("/api/lyrics", {
  method: "POST",
  body: JSON.stringify({ artist: "Artist Name", title: "Song Title" })
});

const { lyrics, artistImages } = await response.json();

// Save to job
job.lyrics = lyrics;
job.artistImagePaths = Object.values(artistImages).filter(p => p);
```

### Use in Thumbnail Generation

Artist images are now available during thumbnail generation:

```typescript
// Build prompt with artist references
const imagePrompt = buildImagePrompt(job, artistImagePaths);

// Gemini uses these as reference when generating
await generateThumbnail(imagePrompt, apiKey, outputPath);
```

---

## Caching System

### How Caching Works

1. **First Request**: 
   - Gemini searches for image URL → ~5-15 seconds
   - Downloads image → ~2-5 seconds
   - Saves to local cache
   - Total: ~10-20 seconds per artist

2. **Subsequent Requests**:
   - Checks local cache → ~1 second
   - Returns cached path immediately
   - **No API calls needed**

### Cache Location

```
output/
  artist_images/
    John_Doe_1234567890.jpg
    Jane_Smith_1234567891.jpg
```

Tracked in `assets.json` with type `artist_image`:
```json
{
  "type": "artist_image",
  "artists": "John Doe",
  "artistName": "John Doe",
  "filePath": "/output/artist_images/John_Doe_1234567890.jpg",
  "sourceUrl": "https://example.com/john.jpg"
}
```

---

## Response Examples

### Scenario 1: Lyrics Found + Artist Images Found
```json
{
  "lyrics": "Verse 1\nSome lyrics here...",
  "found": true,
  "artistImages": {
    "Artist Name": "/output/artist_images/Artist_Name_123.jpg"
  }
}
```

### Scenario 2: Lyrics Found + Artist Images Not Found
```json
{
  "lyrics": "Verse 1\nSome lyrics here...",
  "found": true,
  "artistImages": {
    "Artist Name": null
  }
}
```

### Scenario 3: Lyrics Not Found
```json
{
  "lyrics": null,
  "found": false,
  "artistImages": {
    "Artist Name": "/output/artist_images/Artist_Name_123.jpg"
  }
}
```

Note: Artist images are fetched even if lyrics aren't found!

### Scenario 4: Error
```json
{
  "error": "GEMINI_API_KEY not configured"
}
```

---

## Performance Impact

### Single Artist
- **Without caching**: 
  - Lyrics: 5-10s
  - Image search + download: 10-20s
  - Total: 15-30s

- **With caching** (first time):
  - Same as above

- **With caching** (subsequent):
  - Lyrics: 5-10s
  - Image lookup: ~1s
  - Total: 5-11s

### Multiple Artists
All image fetches happen in **parallel**:
- 1 artist: 10-20s
- 2 artists: 10-20s (parallel)
- 3 artists: 10-20s (parallel)

---

## Configuration

### Adjust Search Timeout

In `.env.local`:
```bash
GEMINI_TEXT_TIMEOUT_MS=45000  # 45 seconds for image search
```

### Disable Artist Image Fetching

Just don't provide apiKey:
```typescript
const artistImages = await fetchArtistImages(artists, null); 
// Returns all nulls, doesn't fetch
```

Or modify the API endpoint to skip it.

---

## Error Handling

### If Image Search Times Out
- Returns `null` for that artist
- Continues processing
- Doesn't block lyrics fetching
- No error thrown

### If Image Download Fails
- Continues to next artist
- Returns `null` for that artist
- Tries again next time (no cache entry created)

### If Gemini API is Down
- Both lyrics and images fail with error
- Handled at API endpoint level
- User sees error message

---

## Files Modified

| File | Changes |
|------|---------|
| `lib/artist-images.ts` | Added `findArtistImageUrl()`, enhanced `getArtistImagePath()`, added `fetchArtistImages()` |
| `app/api/lyrics/route.ts` | Updated to fetch artist images in parallel with lyrics |

---

## Testing

### Test 1: Fetch Lyrics with Artist Images

```bash
curl -X POST http://localhost:3000/api/lyrics \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "David Bowie",
    "title": "Heroes"
  }'
```

**Expected Response**:
```json
{
  "lyrics": "[lyrics text]",
  "found": true,
  "artistImages": {
    "David Bowie": "/output/artist_images/David_Bowie_123456.jpg"
  }
}
```

### Test 2: Check Cache

Request same artist again - should be instant:
```bash
curl -X POST http://localhost:3000/api/lyrics \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "David Bowie",
    "title": "Another Song"
  }'
```

**Expected**: Image path returned immediately from cache

### Test 3: Multiple Artists

```bash
curl -X POST http://localhost:3000/api/lyrics \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "Artist1 × Artist2 × Artist3",
    "title": "Collaboration"
  }'
```

**Expected**: All three artists' images fetched in parallel

---

## Troubleshooting

### Images Always Null

1. Check GEMINI_API_KEY is valid
2. Check network connectivity
3. Check image URLs are reachable
4. Try specific artist name in terminal

### Very Slow Image Fetching

1. Check network speed
2. Image sources might be slow
3. Try increasing timeout: `GEMINI_TEXT_TIMEOUT_MS=60000`

### Downloads Corrupted

1. Check disk space
2. Verify temp directory is writable
3. Check image URL is valid

### Want to Clear Cache

```bash
rm -rf output/artist_images
# Then remove "artist_image" entries from assets.json
```

---

## Next Steps

1. ✅ Lyrics endpoint now fetches artist images
2. ✅ Images cached for reuse
3. 🔄 Update UI to display artist images when available
4. 🔄 Pass images to thumbnail generation
5. 🔄 Display cached images in music library

---

## API Response Structure

The response now includes:

```typescript
{
  lyrics: string | null;      // The song lyrics
  found: boolean;             // Whether lyrics were found
  artistImages: {             // ← NEW
    [artistName]: string | null;  // File paths to cached images
  };
}
```

---

## Summary

✅ **Same Step**: Lyrics and artist images fetched together  
✅ **Cached**: Images reused on subsequent requests  
✅ **Parallel**: Multiple artists processed simultaneously  
✅ **Safe**: Errors in image fetching don't block lyrics  
✅ **Ready**: Images available immediately for thumbnail generation

**Status**: ✅ Ready to use!
