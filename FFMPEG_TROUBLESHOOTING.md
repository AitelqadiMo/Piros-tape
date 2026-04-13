# FFmpeg Troubleshooting Guide

## Quick Fix Summary

The FFmpeg assembly error has been fixed by updating `lib/ffmpeg.ts` to properly resolve the bundled ffmpeg-static binary at runtime instead of using static imports.

## If You Still See Assembly Errors

### Step 1: Verify FFmpeg Installation

Check if FFmpeg is installed and accessible:

```bash
# Check if ffmpeg is in PATH
which ffmpeg

# Or test directly
ffmpeg -version
```

If not installed:

**macOS** (using Homebrew):
```bash
brew install ffmpeg
```

**Linux** (Ubuntu/Debian):
```bash
sudo apt-get install ffmpeg
```

**Windows**:
- Download from https://ffmpeg.org/download.html
- Add to PATH or set `FFMPEG_PATH` environment variable

### Step 2: Verify FFmpeg-Static Package

Ensure the package is properly installed:

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check if ffmpeg-static installed correctly
ls node_modules/ffmpeg-static/
```

### Step 3: Set FFMPEG_PATH Explicitly

If you want to use a specific ffmpeg binary, set it in `.env.local`:

```bash
# macOS example
FFMPEG_PATH=/usr/local/bin/ffmpeg

# Linux example
FFMPEG_PATH=/usr/bin/ffmpeg

# Or if using bundled version, find it:
FFMPEG_PATH=$(npm list ffmpeg-static -p)/ffmpeg
```

### Step 4: Rebuild Next.js

Sometimes Next.js needs a clean rebuild:

```bash
# Clean build
npm run build --clean

# Or use next's built-in clean
rm -rf .next
npm run build
```

### Step 5: Test Video Assembly Directly

Create a test file to verify ffmpeg works:

```bash
# Create a test using Node
node -e "
const path = require('path');
try {
  const ffmpegStatic = require('ffmpeg-static');
  console.log('FFmpeg Binary Path:', ffmpegStatic);
} catch (err) {
  console.error('Failed to load ffmpeg-static:', err.message);
}
"
```

## Debugging Information

### Check FFmpeg Binary Availability

Add this temporary debugging to `lib/ffmpeg.ts` if needed:

```typescript
function resolveFfmpegBinary(explicitPath?: string): string {
  if (explicitPath) {
    console.log("Using explicit FFmpeg path:", explicitPath);
    return explicitPath;
  }
  
  if (process.env.FFMPEG_PATH) {
    console.log("Using FFMPEG_PATH from env:", process.env.FFMPEG_PATH);
    return process.env.FFMPEG_PATH;
  }
  
  try {
    const ffmpegStatic = require("ffmpeg-static");
    if (typeof ffmpegStatic === "string" && ffmpegStatic.length > 0) {
      console.log("Using bundled ffmpeg-static:", ffmpegStatic);
      return ffmpegStatic;
    }
  } catch (err) {
    console.warn("Failed to load ffmpeg-static:", (err as Error).message);
  }

  console.log("Falling back to system ffmpeg command");
  return "ffmpeg";
}
```

### Check Assembly Process

Enable verbose ffmpeg logging by modifying `lib/ffmpeg.ts`:

```typescript
export async function assembleVideo(options: VideoOptions): Promise<void> {
  // ... existing code ...
  
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(thumbnailPath)
      .inputOptions(["-loop", "1"])
      .input(audioPath)
      // ... existing filters ...
      .on("progress", (p) => {
        console.log("FFmpeg Progress:", p.percent, "%");
        if (onProgress && p.percent) {
          onProgress(Math.round(p.percent));
        }
      })
      .on("stderr", (stderrLine) => {
        console.log("FFmpeg STDERR:", stderrLine);
      })
      .on("error", (err) => {
        console.error("FFmpeg Error:", err);
        reject(new Error(`FFmpeg error: ${err.message}`));
      })
      .save(outputPath);
  });
}
```

## Common Issues & Solutions

### Issue: "spawn ffmpeg ENOENT"

**Cause**: FFmpeg binary not found in PATH

**Solution**:
```bash
# Use explicit path
export FFMPEG_PATH=$(which ffmpeg)
# or add to .env.local
echo "FFMPEG_PATH=$(which ffmpeg)" >> .env.local
```

### Issue: "FFmpeg is not available" in Production

**Cause**: ffmpeg-static doesn't support your architecture or OS

**Solution**:
1. Install system ffmpeg on your production server
2. Set `FFMPEG_PATH` to the system binary
3. Consider using a Docker image with ffmpeg pre-installed

### Issue: Video Assembly Hangs or Times Out

**Cause**: FFmpeg process stuck or insufficient resources

**Solution**:
```bash
# Increase timeout or reduce video quality
FFMPEG_TIMEOUT_MS=300000  # 5 minutes
# Or use faster preset (quality vs speed tradeoff)
```

### Issue: Memory Issues During Assembly

**Cause**: Large video files consuming too much memory

**Solution**:
```bash
# Use lower quality preset in code
const options: VideoOptions = {
  // ... other options ...
  preset: "fast",  // Use fast instead of slow
  crf: 28,         // Increase CRF (lower quality, smaller file)
};
```

## Verification Checklist

After applying the fix, verify:

- [ ] `npm run typecheck` passes with no errors
- [ ] FFmpeg binary is found via `which ffmpeg` or `FFMPEG_PATH`
- [ ] `ffmpeg-static` is in `node_modules/`
- [ ] `.env.local` has correct `FFMPEG_PATH` (if needed)
- [ ] Test video assembly with a small audio file
- [ ] Check `output/` directory for generated videos

## Still Having Issues?

Try these advanced steps:

### 1. Check FFmpeg Capabilities
```bash
ffmpeg -encoders | grep libx264  # Should see libx264
ffmpeg -filters | grep zoompan   # Should see zoompan filter
```

### 2. Test FFmpeg Directly
```bash
# Test simple video creation
ffmpeg -f lavfi -i color=c=blue:s=320x240:d=1 -f lavfi -i sine=f=440:d=1 test_video.mp4
```

### 3. Check Node FFmpeg Binding
```bash
node -e "console.log(require('child_process').spawnSync('ffmpeg', ['-version']).stdout.toString())"
```

### 4. Reset and Rebuild
```bash
# Full clean
rm -rf node_modules .next dist build out
npm cache clean --force
npm install
npm run build
```

## Next Steps

If the issue persists after trying these steps:

1. Check Next.js version compatibility with ffmpeg-static
2. Consider using Docker for consistency
3. File an issue with:
   - OS and version
   - Node.js version
   - NPM version
   - Output of `ffmpeg -version`
   - `.env.local` settings (sanitized)
