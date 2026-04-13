# FFmpeg Configuration Guide - April 1, 2026

## Current Status
✅ ffmpeg-static is installed and working
✅ Code has been updated with improved FFmpeg resolution and diagnostics
✅ TypeScript compilation passes

## Testing FFmpeg

### 1. Quick Diagnostic Check

Access the diagnostic endpoint (when running dev server):

```bash
# Start dev server
npm run dev

# In another terminal, check FFmpeg status
curl http://localhost:3000/api/test-ffmpeg
```

Expected output:
```json
{
  "ffmpeg": {
    "available": true,
    "path": "/Users/mohammedaitelqadi/Piros-tape/node_modules/ffmpeg-static/ffmpeg"
  },
  "environment": {
    "FFMPEG_PATH": "not set",
    "OUTPUT_DIR": "not set",
    "NODE_ENV": "development"
  }
}
```

### 2. Manual FFmpeg Path Verification

```bash
# Check if ffmpeg-static binary exists
ls -lh /Users/mohammedaitelqadi/Piros-tape/node_modules/ffmpeg-static/ffmpeg

# Test it works
/Users/mohammedaitelqadi/Piros-tape/node_modules/ffmpeg-static/ffmpeg -version | head -2

# Expected:
# ffmpeg version 6.0
# Copyright (c) 2000-2023 the FFmpeg developers
```

### 3. Test Video Assembly

Use the existing `/api/video/assemble` endpoint with test assets:

```bash
# First, create a test song and thumbnail asset via the UI
# Then call the assembly endpoint:

curl -X POST http://localhost:3000/api/video/assemble \
  -H "Content-Type: application/json" \
  -d '{
    "songAssetId": "asset-xxxxx",
    "thumbnailAssetId": "asset-yyyyy",
    "title": "Test Song",
    "artists": "Test Artist",
    "style": "Funk Soul",
    "decade": "1970"
  }'
```

## What Was Fixed

### Enhanced FFmpeg Binary Resolution

The new `resolveFfmpegBinary()` function tries multiple approaches:

1. **Explicit path** - If passed as parameter
2. **Environment variable** - `FFMPEG_PATH` from `.env.local`
3. **Cached result** - From previous successful lookup
4. **Dynamic require** - ffmpeg-static via `require()`
5. **Common paths** - Direct file paths to node_modules
6. **System ffmpeg** - Fallback to system installation

### Improved Error Handling

- Better error messages with attempted paths
- Logging of FFmpeg path resolution
- Diagnostic endpoint for troubleshooting

### Verification

When `assembleVideo()` is called, it now logs:
```
[FFmpeg] Resolved path: /Users/.../ffmpeg-static/ffmpeg
[FFmpeg] Explicit path param: undefined
[FFmpeg] Environment FFMPEG_PATH: undefined
[FFmpeg] Binary verified, setting path...
[FFmpeg] Path set, starting video assembly...
[FFmpeg] Process started: ffmpeg -loop 1 -i ...
[FFmpeg] Progress: 5%
... etc
[FFmpeg] Encoding complete
```

## If Issues Persist

### Step 1: Verify ffmpeg-static is installed

```bash
npm ls ffmpeg-static

# Should show:
# piros-tape@0.1.0 /Users/mohammedaitelqadi/Piros-tape
# └── ffmpeg-static@5.3.0
```

### Step 2: Reinstall if needed

```bash
# Remove and reinstall
rm -rf node_modules/ffmpeg-static
npm install ffmpeg-static

# Or clean install everything
rm -rf node_modules package-lock.json
npm install
```

### Step 3: Set FFMPEG_PATH explicitly

If the automatic resolution isn't working, add to `.env.local`:

```bash
FFMPEG_PATH=/Users/mohammedaitelqadi/Piros-tape/node_modules/ffmpeg-static/ffmpeg
```

### Step 4: Check Node Version

FFmpeg-static requires Node.js 14+. Check your version:

```bash
node --version
# Should be v14.0.0 or higher (you have v25.1.0 ✓)
```

### Step 5: Check Architecture Compatibility

```bash
node -e "console.log(process.platform, process.arch)"
# Should show: darwin arm64 (macOS Apple Silicon)
```

ffmpeg-static supports:
- macOS: x64, arm64 ✓
- Linux: x64, ia32, arm64, arm
- Windows: x64, ia32
- FreeBSD: x64

## FFmpeg Features Required

The video assembly uses these FFmpeg components, all included in ffmpeg-static:

- ✓ libx264 (H.264 video codec)
- ✓ aac (audio codec)
- ✓ zoompan filter (video effects)
- ✓ Metadata support

Verify they're available:

```bash
/Users/mohammedaitelqadi/Piros-tape/node_modules/ffmpeg-static/ffmpeg -encoders | grep libx264
/Users/mohammedaitelqadi/Piros-tape/node_modules/ffmpeg-static/ffmpeg -filters | grep zoompan
```

## Troubleshooting Specific Errors

### Error: "spawn ffmpeg ENOENT"
- FFmpeg binary not found
- Solution: Verify `FFMPEG_PATH` points to valid executable
- Or reinstall ffmpeg-static

### Error: "FFmpeg process hung"
- Video encoding taking too long or stuck
- Solution: Kill process, check thumbnail/audio files are valid
- Try with `preset: "fast"` instead of "slow"

### Error: "codec not found: libx264"
- FFmpeg was built without H.264 support
- Solution: Reinstall ffmpeg-static (it has full codecs built in)
- Or use system ffmpeg: set `FFMPEG_PATH=/usr/local/bin/ffmpeg`

### Error: "Unknown filter 'zoompan'"
- FFmpeg was compiled without filter support
- Solution: Same as above - reinstall ffmpeg-static

## Debugging During Development

The improved code now logs FFmpeg operations. Check your server logs when running:

```bash
npm run dev
```

Look for `[FFmpeg]` prefixed messages in the console output.

## Production Deployment

For production, you have options:

### Option 1: Use ffmpeg-static (Current)
- Bundled with app
- No system dependencies needed
- Works on any macOS/Linux with compatible architecture

### Option 2: System FFmpeg
- Install ffmpeg on your server
- Set `FFMPEG_PATH=/usr/bin/ffmpeg` (or your path)
- Smaller bundle size

### Option 3: Docker
- Build Docker image with ffmpeg pre-installed
- Ensures consistency across environments

For deployment, ensure:
1. Node modules are installed
2. `.env` or environment variables are set correctly
3. OUTPUT_DIR has write permissions

## Next Steps

1. **Test video assembly** - Create a new job and try generating a video
2. **Monitor logs** - Watch for `[FFmpeg]` debug messages
3. **Report any issues** - Include the diagnostic endpoint output

The system should now properly find and use the bundled ffmpeg-static binary automatically.
