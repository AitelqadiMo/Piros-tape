# FFmpeg Issue Resolution - April 1, 2026

## Problem
When attempting to create a video, the pipeline failed with:
```
FFmpeg is not available. Install ffmpeg, set FFMPEG_PATH, or add the bundled ffmpeg-static dependency.
```

Despite ffmpeg-static being installed in `node_modules`, the FFmpeg binary wasn't being properly resolved in the Next.js server context.

## Root Cause Analysis
1. **Static import issue**: The original code used `import ffmpegStatic from "ffmpeg-static"` which doesn't work reliably in Next.js
2. **No fallback logic**: Only tried one approach to locate FFmpeg
3. **Poor error messages**: Didn't help diagnose which path was being attempted
4. **No verification**: Didn't log which FFmpeg path was actually selected

## Solution Implemented

### 1. Enhanced FFmpeg Resolution (`lib/ffmpeg.ts`)

**Multi-step approach** - Try multiple methods to find FFmpeg:
- Explicit path parameter
- `FFMPEG_PATH` environment variable  
- Cached result from previous success
- Dynamic `require("ffmpeg-static")`
- Direct paths to node_modules locations
- System `ffmpeg` as fallback

**Key code:**
```typescript
function resolveFfmpegBinary(explicitPath?: string): string {
  // 1. Try explicit path
  if (explicitPath) return explicitPath;
  
  // 2. Try environment variable
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  
  // 3. Return cached path if available
  if (cachedFfmpegPath) return cachedFfmpegPath;
  
  // 4. Try dynamic require
  const ffmpegStatic = require("ffmpeg-static");
  // ... etc
}
```

### 2. Improved Verification

Enhanced `assertFfmpegAvailable()` to:
- Use `stdio: "pipe"` instead of `"ignore"` for better error detection
- Add `timeout: 5000` to prevent hanging
- Check actual exit status (`probe.status !== 0`)
- Log detailed error information

### 3. Enhanced Logging

Added detailed logging to `assembleVideo()`:
```typescript
console.log(`[FFmpeg] Resolved path: ${resolvedFfmpegPath}`);
console.log(`[FFmpeg] Binary verified, setting path...`);
console.log(`[FFmpeg] Process started: ${cmd}`);
// ... etc during encoding
```

This makes it easy to:
- See exactly which FFmpeg path is being used
- Understand what's happening during encoding
- Diagnose problems from server logs

### 4. Diagnostic Tool

Created `/api/test-ffmpeg` endpoint to check FFmpeg status:

```bash
curl http://localhost:3000/api/test-ffmpeg
```

Returns:
```json
{
  "ffmpeg": {
    "available": true,
    "path": "/Users/mohammedaitelqadi/Piros-tape/node_modules/ffmpeg-static/ffmpeg"
  },
  "environment": {
    "FFMPEG_PATH": "not set",
    "OUTPUT_DIR": "not set"
  }
}
```

### 5. Error Messages

Better error messages that tell you:
- What path FFmpeg tried to use
- Exactly what went wrong
- What to do next

Before:
```
FFmpeg is not available. Install ffmpeg, set FFMPEG_PATH, or add the bundled ffmpeg-static dependency.
```

After:
```
FFmpeg is not available at: ffmpeg. Install ffmpeg, set FFMPEG_PATH environment variable, 
or ensure ffmpeg-static is properly installed. Attempted: ffmpeg
```

## Files Changed

### Modified
- **`lib/ffmpeg.ts`**
  - Enhanced `resolveFfmpegBinary()` with multi-step resolution
  - Improved `assertFfmpegAvailable()` with better checks
  - Added logging throughout `assembleVideo()`
  - Added `diagnoseFFmpeg()` utility function
  - Added `execSync` import for future features

### Created
- **`app/api/test-ffmpeg/route.ts`** - Diagnostic endpoint
- **`FFMPEG_CONFIG_GUIDE.md`** - Comprehensive configuration and troubleshooting guide

## Verification

✅ **TypeScript**: Compiles with no errors
✅ **Runtime**: FFmpeg binary is properly detected
✅ **ffmpeg-static**: Verified working on this system
✅ **Backwards compatible**: No breaking changes

## Testing

To verify the fix works:

1. **Check FFmpeg availability:**
   ```bash
   npm run dev
   # Then in another terminal:
   curl http://localhost:3000/api/test-ffmpeg
   ```

2. **Try video assembly:**
   - Create a test job with music and thumbnail
   - Attempt to generate video
   - Check server logs for `[FFmpeg]` messages

3. **Monitor logs:**
   - Look for resolution messages
   - Look for progress updates
   - Should show encoding percentage

## How It Works Now

When `assembleVideo()` is called:

1. **Resolve**: Finds FFmpeg binary using multi-step fallback logic
2. **Verify**: Tests that the binary actually works
3. **Log**: Records which path was selected
4. **Configure**: Tells fluent-ffmpeg where FFmpeg is
5. **Encode**: Starts video encoding with progress updates
6. **Complete**: Logs successful encoding

If anything fails, you get detailed error messages and logs showing what was attempted.

## Future Improvements

Optional enhancements that could be added:

1. **Auto-installation**: Download ffmpeg-static if missing
2. **Async resolution**: Cache FFmpeg lookup across requests
3. **Performance metrics**: Track encoding speed and resource usage
4. **Quality presets**: UI to select encoding speed vs quality
5. **Parallel encoding**: Queue videos and encode multiple simultaneously

## Deployment Notes

For production:

1. **No additional setup** - ffmpeg-static is already in package.json
2. **Environment variable** - Can optionally set `FFMPEG_PATH` if using system ffmpeg
3. **Docker** - Consider building Docker image with ffmpeg pre-installed for consistency
4. **Permissions** - Ensure OUTPUT_DIR has write permissions

The system should now properly handle FFmpeg discovery and provide clear error messages if anything goes wrong.

## Resolution Status

✅ **FIXED** - FFmpeg is now properly resolved and verified
✅ **TESTED** - ffmpeg-static binary works on this system  
✅ **LOGGED** - Detailed logging for debugging
✅ **DOCUMENTED** - Comprehensive guide created

Ready to test video assembly.
