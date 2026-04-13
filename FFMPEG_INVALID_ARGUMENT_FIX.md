# FFmpeg Error: "Invalid argument" - Troubleshooting Guide

## Problem
```
FFmpeg error: ffmpeg exited with code 1: Tape: Invalid argument
```

## Root Causes

The error indicates FFmpeg received an invalid command-line argument. This can be caused by:

1. **Special characters in metadata** (most likely)
   - Unicode dashes (–) instead of hyphens (-)
   - Quotes or pipes in title/artist names
   - Non-ASCII characters not properly escaped

2. **Video filter syntax issues**
   - Incorrect filter parameters
   - Quote escaping problems
   - Complex nested filter syntax

3. **Output path issues**
   - Path contains special characters
   - Path too long
   - Invalid characters in filename

4. **Encoding issues**
   - Character encoding problems with title/artist
   - Unsupported codecs
   - Invalid preset or quality settings

## Fixes Applied

### 1. ✅ Simplified Metadata
**Before:**
```typescript
`title=${artists} – ${title} | PIROS TAPE VERZIÓ`
```

**After:**
```typescript
`title=${artists} - ${title} (PIROS TAPE)`
```

Changes:
- Replaced en-dash (–) with regular hyphen (-)
- Replaced pipe (|) with parentheses
- Removed accented characters (VERZIÓ → removed)
- Simplified format

### 2. ✅ Improved Filter Syntax
**Before:**
```typescript
.videoFilter(
  "zoompan=z='min(zoom+0.0002,1.04)':x='iw/2-(iw/zoom/2)'" +
    ":y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=24,format=yuv420p"
)
```

**After:**
```typescript
.videoFilter([
  {
    filter: "zoompan",
    options: {
      z: "min(zoom+0.0002,1.04)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)",
      d: 1,
      s: "1920x1080",
      fps: 24
    }
  },
  { filter: "format", options: "yuv420p" }
])
```

Changes:
- Used object-based filter syntax (more robust)
- Proper parameter escaping
- Clearer structure for fluent-ffmpeg

### 3. ✅ Better Error Logging
**Added:**
```typescript
.on("start", (cmd) => {
  console.log(`[FFmpeg] Process started with command:`);
  console.log(`[FFmpeg] ${cmd}`);
})
```

This shows the exact command being executed, making it easy to spot problems.

## Testing the Fix

### Step 1: Check Server Logs
When attempting video assembly, look for:
```
[FFmpeg] Process started with command:
[FFmpeg] ffmpeg -i ... [full command here]
```

Copy the command and check for obvious issues.

### Step 2: Manual FFmpeg Test
Test the filter manually:
```bash
ffmpeg -f lavfi -i color=c=blue:s=1920x1080:d=1 \
  -f lavfi -i sine=f=440:d=1 \
  -vf "zoompan=z='min(zoom+0.0002,1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=24,format=yuv420p" \
  -vcodec libx264 -preset fast -crf 23 \
  -acodec aac -ab 320k \
  -shortest \
  -metadata title="Test - Song" \
  -metadata artist="Piros Tape" \
  test_output.mp4
```

### Step 3: Try Video Assembly Again
1. Start dev server: `npm run dev`
2. Go to Studio
3. Create/use a job
4. Assemble video
5. Watch console for the full FFmpeg command
6. Check if it completes successfully

## If Still Getting Error

### Check 1: Artist/Title Names
Ensure artist and title don't contain:
- Special Unicode characters (–, —, etc.)
- Pipes (|)
- Quotes (", ')
- Non-ASCII characters

**Example:**
```
❌ Artists: "Mödőrn Müsic"
✅ Artists: "Modern Music"

❌ Title: "Song – Remix"
✅ Title: "Song - Remix"
```

### Check 2: FFmpeg Version
The bundled ffmpeg-static should have all needed encoders:
```bash
node_modules/ffmpeg-static/ffmpeg -encoders | grep libx264
node_modules/ffmpeg-static/ffmpeg -filters | grep zoompan
```

Both should return results.

### Check 3: Input Files
Verify thumbnail and audio files exist and are valid:
```bash
# Check thumbnail
file /path/to/thumbnail.jpg

# Check audio
ffprobe /path/to/audio.mp3
```

### Check 4: Simplified Test
Try with simpler settings:
```typescript
// In assembleVideo() parameters:
{
  crf: 28,           // Lower quality (faster)
  preset: "fast",    // Faster encoding
  audioBitrate: "128k"  // Lower bitrate
}
```

## Detailed Command Structure

The FFmpeg command should look like:
```bash
ffmpeg \
  -loop 1 -i thumbnail.jpg \
  -i audio.mp3 \
  -vf "zoompan=z='min(zoom+0.0002,1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=24,format=yuv420p" \
  -vcodec libx264 \
  -preset slow \
  -crf 18 \
  -acodec aac \
  -ab 320k \
  -af aresample=44100 \
  -shortest \
  -metadata title="Artist - Title (PIROS TAPE)" \
  -metadata artist="Piros Tape" \
  output.mp4
```

All arguments should be valid and properly escaped.

## Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Special chars in title | Invalid argument | Use ASCII-only characters |
| Filter syntax | Invalid argument | Check filter documentation |
| Missing codec | Encoder not found | Reinstall ffmpeg-static |
| Path issues | File not found | Use absolute paths |
| Input file corrupted | Cannot read input | Regenerate thumbnail/audio |

## Debug Mode

To get more detailed error information, modify the error handler:

```typescript
.on("error", (err: any) => {
  console.error(`[FFmpeg] Full error:`, err);
  console.error(`[FFmpeg] Stderr:`, err.stderr);
  console.error(`[FFmpeg] Command:`, err.cmd);
  reject(err);
})
```

Then redeploy and try again to see detailed error output.

## Prevention

### Best Practices

1. **Always use ASCII characters** for title/artist in video metadata
2. **Validate input** before passing to FFmpeg
3. **Test with simple values first** before using complex metadata
4. **Use simpler filter syntax** when possible
5. **Log the full command** for debugging

### Example Input Validation

```typescript
function sanitizeMetadata(str: string): string {
  return str
    .replace(/[–—]/g, "-")      // Replace dashes
    .replace(/[|]/g, "-")        // Replace pipes
    .replace(/[^\w\s\-()]/g, "") // Keep only safe chars
    .substring(0, 100);          // Limit length
}
```

## Support

If error persists:

1. Check console output for exact FFmpeg command
2. Copy the command and test manually
3. Check all input file names and paths
4. Verify artist and title contain only ASCII characters
5. Try with `preset: "fast"` and `crf: 28` for quicker testing

The improved error logging now shows the full FFmpeg command, making it much easier to diagnose issues.
