# ✅ FFmpeg Testing Checklist

## Pre-Test Verification

- [ ] TypeScript compilation passes: `npm run typecheck`
- [ ] ffmpeg-static is installed: `ls node_modules/ffmpeg-static/ffmpeg`
- [ ] Binary is executable: `node_modules/ffmpeg-static/ffmpeg -version`
- [ ] Development server starts: `npm run dev`

## Diagnostic Testing

- [ ] Diagnostic endpoint responds: `curl http://localhost:3000/api/test-ffmpeg`
- [ ] Status shows `"available": true`
- [ ] Path points to correct location
- [ ] Environment variables display correctly

## Functional Testing

### Video Assembly Test

1. **Prepare Assets**
   - [ ] Start development server: `npm run dev`
   - [ ] Go to Studio: http://localhost:3000/studio
   - [ ] Create a new job (or use existing)
   - [ ] Generate music (or skip if already have song)
   - [ ] Generate thumbnail (or skip if already have thumbnail)

2. **Run Assembly**
   - [ ] Click "Assemble Video"
   - [ ] Watch for `[FFmpeg]` logs in console
   - [ ] Check that encoding starts
   - [ ] Monitor progress percentage updates
   - [ ] Wait for completion

3. **Verify Output**
   - [ ] Video file created in `output/standalone/`
   - [ ] File size > 0 MB
   - [ ] File has `.mp4` extension
   - [ ] Video plays in video player

### Log Verification

Expect to see in console:
```
[FFmpeg] Resolved path: /Users/.../ffmpeg-static/ffmpeg
[FFmpeg] Explicit path param: undefined
[FFmpeg] Environment FFMPEG_PATH: undefined
[FFmpeg] Binary verified, setting path...
[FFmpeg] Path set, starting video assembly...
[FFmpeg] Process started: ffmpeg -loop 1 -i ...
[FFmpeg] Progress: 5%
[FFmpeg] Progress: 10%
... (continues updating)
[FFmpeg] Encoding complete
```

## Issue Resolution Tests

### If FFmpeg Not Found

1. [ ] Check diagnostic endpoint
   ```bash
   curl http://localhost:3000/api/test-ffmpeg
   ```

2. [ ] Verify ffmpeg-static is installed
   ```bash
   npm ls ffmpeg-static
   ```

3. [ ] Verify binary exists and works
   ```bash
   /Users/mohammedaitelqadi/Piros-tape/node_modules/ffmpeg-static/ffmpeg -version
   ```

4. [ ] Try reinstalling
   ```bash
   rm -rf node_modules
   npm install
   ```

### If Encoding Hangs

1. [ ] Check that thumbnail image file exists
2. [ ] Check that audio file exists
3. [ ] Kill the process: `Ctrl+C`
4. [ ] Check server logs for errors
5. [ ] Try with `preset: "fast"` instead of `"slow"`

### If Output Video Invalid

1. [ ] Check file size: should be several MB
2. [ ] Check metadata: `ffprobe output.mp4`
3. [ ] Try playing with different player
4. [ ] Check encoding settings in code

## Edge Cases to Test

- [ ] Video with very short audio (< 1 second)
- [ ] Video with very long audio (> 10 minutes)
- [ ] Video with corrupted thumbnail (should fail gracefully)
- [ ] Video with corrupted audio (should fail gracefully)
- [ ] Multiple videos encoding in sequence
- [ ] Video assembly with custom CRF settings
- [ ] Video assembly with custom bitrate settings

## Performance Tests

- [ ] Encoding speed (should show progress updates)
- [ ] Memory usage (shouldn't spike dramatically)
- [ ] CPU usage (should be reasonable for quality)
- [ ] Final file size (should be reasonable)

## Final Sign-Off

- [ ] All diagnostics pass
- [ ] At least one video successfully created
- [ ] Logs show FFmpeg progress updates
- [ ] Output video is playable
- [ ] No errors in console

---

## Troubleshooting Commands

If issues arise, run these diagnostic commands:

```bash
# Check Node version
node --version

# Check if ffmpeg-static is installed
npm ls ffmpeg-static

# Check if ffmpeg binary exists
ls -lh node_modules/ffmpeg-static/ffmpeg

# Test ffmpeg directly
node_modules/ffmpeg-static/ffmpeg -version
node_modules/ffmpeg-static/ffmpeg -encoders | grep libx264
node_modules/ffmpeg-static/ffmpeg -filters | grep zoompan

# Check diagnostic endpoint
curl http://localhost:3000/api/test-ffmpeg

# View server logs (when running npm run dev)
# Look for [FFmpeg] prefix
```

## Success Criteria

✅ **Pass**: 
- Diagnostic endpoint returns `"available": true`
- At least one video generated successfully
- Console shows FFmpeg progress updates
- Output video is playable

❌ **Fail**:
- Diagnostic endpoint shows `"available": false`
- Video assembly throws error
- No progress updates in logs
- Output video is invalid or missing

---

**Test Date**: _______________

**Tester**: _______________

**Result**: ✅ PASS / ❌ FAIL

**Notes**: 
_____________________________
_____________________________
_____________________________
