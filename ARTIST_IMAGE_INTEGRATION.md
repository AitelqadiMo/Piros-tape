# Artist Image Integration Guide

## Overview
The artist image system is now in place and ready to integrate with external data sources. This guide shows how to implement automatic artist image fetching from various sources.

## Current Implementation Status

### ✅ Completed
- Asset type for storing artist images
- Image caching system
- Thumbnail generation with artist reference support
- TypeScript types and interfaces

### ⏳ Ready to Implement
- Automatic artist image fetching
- Multiple data source integrations
- Fallback logic

## Integration Options

### Option 1: Wikipedia Images (Recommended)

```typescript
// Add to lib/artist-images.ts
import { JSDOM } from "jsdom";

async function fetchWikipediaImage(artistName: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(artistName)}&prop=pageimages&pithumbsize=400&format=json`
    );
    const data = await response.json();
    const pages = data.query.pages;
    const firstPage = Object.values(pages)[0] as any;
    return firstPage?.thumbnail?.source || null;
  } catch (err) {
    console.error(`Failed to fetch Wikipedia image for ${artistName}:`, err);
    return null;
  }
}
```

### Option 2: Spotify Artist Images

```typescript
// Requires spotify-web-api-js or axios
async function fetchSpotifyImage(artistName: string): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) return null;

  try {
    // Get access token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const { access_token } = await tokenResponse.json();

    // Search for artist
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
      {
        headers: { "Authorization": `Bearer ${access_token}` },
      }
    );

    const data = await searchResponse.json();
    const images = data.artists?.items?.[0]?.images;
    return images?.[0]?.url || null;
  } catch (err) {
    console.error(`Failed to fetch Spotify image for ${artistName}:`, err);
    return null;
  }
}
```

### Option 3: DuckDuckGo Images

```typescript
async function fetchDuckDuckGoImage(artistName: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://duckduckgo.com/i.js?q=${encodeURIComponent(artistName)} musician&l=en-us`
    );
    const data = await response.json();
    return data.results?.[0]?.image || null;
  } catch (err) {
    console.error(`Failed to fetch DuckDuckGo image for ${artistName}:`, err);
    return null;
  }
}
```

## Implementation Steps

### 1. Add Environment Variables (`.env.local`)
```bash
# Choose which services to use:
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret
# or
WIKIPEDIA_ENABLED=true
# or
DUCKDUCKGO_ENABLED=true
```

### 2. Update `lib/artist-images.ts`

Replace the `getArtistImagePath()` placeholder with:

```typescript
export async function getArtistImagePath(artistName: string): Promise<string | null> {
  // First, check cache
  const cachedAssets = await getAssetsByType("artist_image");
  const cached = cachedAssets.find(
    (a: Asset) => a.artistName?.toLowerCase() === artistName.toLowerCase()
  );
  
  if (cached) {
    try {
      await fs.access(cached.filePath);
      return cached.filePath;
    } catch {
      // Cached file doesn't exist, we'll fetch a new one
    }
  }

  // Try fetching from external sources
  let imageUrl: string | null = null;

  if (process.env.SPOTIFY_CLIENT_ID) {
    imageUrl = await fetchSpotifyImage(artistName);
  }
  
  if (!imageUrl && process.env.WIKIPEDIA_ENABLED) {
    imageUrl = await fetchWikipediaImage(artistName);
  }
  
  if (!imageUrl) {
    imageUrl = await fetchDuckDuckGoImage(artistName);
  }

  if (imageUrl) {
    try {
      return await cacheArtistImage(artistName, imageUrl);
    } catch (err) {
      console.error(`Failed to cache artist image: ${err}`);
    }
  }

  return null;
}
```

### 3. Handle Rate Limiting

Add exponential backoff for external APIs:

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429 || response.status === 503) {
        const delay = Math.pow(2, i) * 1000; // exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}
```

## Testing the Integration

### Manual Test
```bash
# Test artist image fetching
curl -X POST http://localhost:3000/api/thumbnails/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Song",
    "artists": "Artist Name",
    "style": "Funk Soul",
    "decade": "1970"
  }'
```

### Check Cached Images
```bash
# View all cached artist images
curl http://localhost:3000/api/assets?type=artist_image
```

## Performance Considerations

1. **Image Size Optimization**:
   - Resize images to 400px width max
   - Convert to JPEG for web delivery
   - Store in efficient format

2. **Caching Strategy**:
   - Cache for 30 days by default
   - Implement cache invalidation
   - Monitor storage usage

3. **Timeout Handling**:
   - Set 5-second timeout for image fetches
   - Fallback gracefully if external service is down
   - Log failures for monitoring

## Troubleshooting

### Images not caching
- Check `OUTPUT_DIR` environment variable
- Verify write permissions to output directory
- Check disk space

### Fetch failures
- Verify external service is available
- Check rate limits
- Review API credentials

### Low quality images
- Some sources have better quality than others
- Consider prioritizing Spotify (usually highest quality)
- Fall back through sources in order of quality

## Future Enhancements

1. **Image Processing Pipeline**:
   - Use Sharp library for image optimization
   - Auto-crop to face
   - Adjust saturation for vintage aesthetic

2. **Multi-format Support**:
   - Cache multiple sizes
   - WebP format for modern browsers
   - JPEG fallback

3. **User Uploads**:
   - Allow manual override of fetched images
   - Admin dashboard for artist management
   - Batch upload functionality
