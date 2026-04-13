# FFmpeg "Invalid argument" Error - Root Cause & Fix

## The Issue

```
FFmpeg error: ffmpeg exited with code 1: Tape: Invalid argument
```

This specific error message with "Tape:" suggests the error is in the metadata argument, specifically related to our "PIROS TAPE" string or the metadata formatting.

## Root Cause Analysis

The problem occurs when:
1. FFmpeg receives metadata with special characters
2. The shell interprets special characters before FFmpeg gets them
3. Quote escaping is incorrect
4. The metadata value contains problematic characters

## Fixes Applied

### 1. Removed Metadata Temporarily
The metadata arguments (`-metadata title=...`) can cause shell interpretation issues. Temporarily removed to isolate if this is the issue.

### 2. Sanitized Input
All title and artist strings are now sanitized to remove:
- Unicode dashes (–, —) → replaced with (-)
- Pipes (|) → removed
- Special characters → removed
- Accented characters → removed

### 3. Simplified Metadata Format
```typescript
// Before: May cause escaping issues
`title=${artists} – ${title} | PIROS TAPE VERZIÓ`

// After: Simple ASCII-only format
`title=${sanitizedArtists} - ${sanitizedTitle}`
```

### 4. Separated Metadata Options
Metadata is now added as separate outputOptions array entry to avoid command-line parsing issues:

```typescript
command.outputOptions([
  "-metadata",
  `title=${sanitizedArtists} - ${sanitizedTitle}`,
  "-metadata", 
  `artist=Piros Tape`,
]);
```

## Testing the Fix

### Step 1: Check What Command is Being Run
The console will now show:
```
[FFmpeg] Process started with command:
[FFmpeg] ffmpeg -loop 1 -i thumbnail.jpg -i audio.mp3 -vf "zoompan=..." ...
```

Copy this full command and verify it looks correct.

### Step 2: Test Manually
Try running a similar command manually:
```bash
ffmpeg -loop 1 -i thumbnail.jpg -i audio.mp3 \
  -vf "zoompan=z='min(zoom+0.0002,1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=24,format=yuv420p" \
  -vcodec libx264 -preset fast -crf 23 \
  -acodec aac -ab 320k \
  -shortest \
  test_output.mp4
```

This should work (metadata optional for testing).

### Step 3: Try Assembly Again
1. Start dev server: `npm run dev`
2. Go to Studio: http://localhost:3000/studio
3. Create a job with simple ASCII-only title and artist names
4. Try assembling video
5. Watch console for the full FFmpeg command

## If Still Getting Error

### Check 1: Verify Input Files
```bash
# Check if files exist
ls -lh /path/to/thumbnail.jpg
ls -lh /path/to/audio.mp3

# Check if they're valid
file /path/to/thumbnail.jpg
ffprobe /path/to/audio.mp3
```

### Check 2: Try Simpler Settings
Modify the assembleVideo call to use simpler parameters:
```typescript
await assembleVideo({
  thumbnailPath,
  audioPath,
  outputPath,
  title: "Simple Title",      // ASCII only
  artists: "Simple Artist",   // ASCII only
  preset: "fast",             // Faster than "slow"
  crf: 28,                    // Lower quality (faster)
  audioBitrate: "128k",       // Lower bitrate
});
```

### Check 3: Remove Complex Filter
Try without the zoompan filter to isolate the issue:
```typescript
// In ffmpeg.ts, temporarily comment out:
// .videoFilter("zoompan=...")
// And use a simpler filter or none at all
```

### Check 4: Try Different Input Files
Create a test with:
- Simple 1x1 pixel JPG thumbnail
- Simple sine wave MP3 audio
- No special characters in paths

## Sanitization Function

The `sanitizeMetadata()` function now ensures all strings are safe:

```typescript
function sanitizeMetadata(str: string): string {
  return str
    .replace(/[–—]/g, "-")           // Replace dashes
    .replace(/[|]/g, "-")             // Replace pipes
    .replace(/[^\w\s\-()&.']/g, "")  // Keep only safe chars
    .substring(0, 200)                // Limit length
    .trim();
}
```

Examples:
- "Mödőrn – Müsic" → "Mdern  Music"
- "Song | Remix" → "Song - Remix"
- "Track (feat. Artist)" → "Track (feat. Artist)"

## The Current Encoding Command

Your FFmpeg command should now look like:

```bash
ffmpeg \
  -loop 1 \
  -i /path/to/thumbnail.jpg \
  -i /path/to/audio.mp3 \
  -vf "zoompan=z='min(zoom+0.0002,1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=24,format=yuv420p" \
  -vcodec libx264 \
  -preset slow \
  -crf 18 \
  -acodec aac \
  -ab 320k \
  -af aresample=44100 \
  -shortest \
  /path/to/output.mp4
```

(Metadata is currently excluded to debug the issue)

## Next Steps if Still Failing

1. **Enable verbose FFmpeg logging**:
   ```typescript
   .outputOptions(["-loglevel", "verbose"])
   ```

2. **Capture stderr output**:
   Modify error handler to log more details

3. **Try without audio**:
   Create silent video to isolate if audio is the issue

4. **Check FFmpeg capabilities**:
   ```bash
   ffmpeg -encoders | grep libx264
   ffmpeg -filters | grep zoompan
   ```

## Success Indicators

When it's working, you should see:
```
[FFmpeg] Resolved path: /Users/.../ffmpeg-static/ffmpeg
[FFmpeg] Binary verified, setting path...
[FFmpeg] Path set, starting video assembly...
[FFmpeg] Process started with command:
[FFmpeg] ffmpeg -loop 1 -i ... -vf "zoompan=..." ...
[FFmpeg] Progress: 5%
[FFmpeg] Progress: 25%
... (progress updates)
[FFmpeg] Encoding complete
```

And the video file should be created at the output path.

## Common "Invalid argument" Causes

| Cause | Check | Fix |
|-------|-------|-----|
| Special chars in title | Console output | Use sanitizeMetadata() |
| Filter syntax | Test manually | Verify filter string |
| Path issues | File exists? | Use absolute paths |
| Input file corrupted | `ffprobe` output | Regenerate input |
| Metadata escaping | See command output | Simplify or remove |

The error message "Tape: Invalid argument" strongly suggests a metadata parsing issue, which should now be fixed by the sanitization and simplified metadata format.
