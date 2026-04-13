# Quick Start: Artist Images with Lyrics

## What Changed

When you fetch song lyrics, artist images are now fetched **at the same time**.

## How to Use

### From the Studio UI

1. Go to http://localhost:3000/music
2. Search for a song (e.g., "Heroes by David Bowie")
3. Click on a song suggestion
4. System automatically:
   - ✅ Fetches lyrics
   - ✅ Fetches artist images
   - ✅ Caches both for reuse

### From API

```bash
curl -X POST http://localhost:3000/api/lyrics \
  -H "Content-Type: application/json" \
  -d '{"artist": "Artist Name", "title": "Song Title"}'
```

**Response** now includes artist images:
```json
{
  "lyrics": "...",
  "found": true,
  "artistImages": {
    "Artist Name": "/output/artist_images/Artist_Name_123.jpg"
  }
}
```

## What Happens Behind the Scenes

```
You click "Fetch Lyrics"
         ↓
┌────────┴────────┐
│                 │
Fetch Lyrics  Fetch Artist Images
│                 │
└────────┬────────┘
         ↓
    Check Cache
         ↓
   ┌─────┴─────┐
   │           │
Found!    Fetch from Web
   │           │
   └─────┬─────┘
         ↓
    Save to Cache
         ↓
   Return Both!
```

## Benefits

| Benefit | Impact |
|---------|--------|
| **Same Step** | No extra clicks needed |
| **Cached** | Artist images reused forever |
| **Fast** | Multiple artists fetched in parallel |
| **Smart** | Caches results per artist |

## Files Changed

- `lib/artist-images.ts` - New image fetching logic
- `app/api/lyrics/route.ts` - Fetch images with lyrics

## Performance

**First time** (e.g., "David Bowie"):
- Lyrics: ~5-10s
- Image search + download: ~10-20s
- **Total: ~15-30s**

**Second time** (same artist, different song):
- Lyrics: ~5-10s
- Image lookup from cache: ~1s
- **Total: ~5-11s**

**Multiple artists** (parallel):
- 1 artist: ~10-20s
- 2-3 artists: ~10-20s (same time, parallel)

## What Gets Cached

```
output/artist_images/
├── David_Bowie_1234567890.jpg
├── Artist1_1234567891.jpg
└── Artist2_1234567892.jpg
```

Tracked in `assets.json` with type `artist_image`

## If Something Goes Wrong

**Images always null?**
- Check GEMINI_API_KEY is set
- Check internet connection

**Want to clear cache?**
```bash
rm -rf output/artist_images
```

**Increase timeout?**
Add to `.env.local`:
```bash
GEMINI_TEXT_TIMEOUT_MS=60000
```

## Next: Use in Thumbnails

Once artist images are fetched with lyrics, they'll automatically be used when generating thumbnails. Just continue using the system as normal!

## Testing

Try this:
```bash
# First time - will fetch
curl -X POST http://localhost:3000/api/lyrics \
  -H "Content-Type: application/json" \
  -d '{"artist": "The Beatles", "title": "Hey Jude"}'

# Second time - instant from cache
curl -X POST http://localhost:3000/api/lyrics \
  -H "Content-Type: application/json" \
  -d '{"artist": "The Beatles", "title": "Yesterday"}'
```

---

**Status**: ✅ Ready! Try fetching lyrics now and check the response for `artistImages`
