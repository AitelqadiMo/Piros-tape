# PIROS TAPE — ACTION PLAN

**Date:** March 31, 2026  
**Current Status:** 🟡 Pipeline running but response parsing needed  
**Credits Used:** ~12 (1 test generation)

---

## 🎯 Immediate Actions Required

### 1. ✅ DONE: Infrastructure Setup
- [x] Added Suno API key to `.env.local`
- [x] Updated Gemini model to `gemini-2.5-flash`
- [x] Created `/jobs` page to browse previous productions
- [x] Rebuilt project successfully

### 2. ⚠️ CURRENT: Fix Suno Response Parsing
**Problem:** Suno API is processing requests (sees "running" in console) but our response parser gets empty clips array

**Evidence:**
```
Suno Console: Status = "running", Model = "chirp-auk-turbo", 12 credits consumed
Our Pipeline: "Suno returned no clips" error
```

**Solution Steps (NO MORE TESTS - save credits):**
1. Look at the existing test job in Suno console: `job-1774979917799-x7bgru`
2. When it completes, check the response format in network logs or Suno API docs
3. Update `lib/suno.ts` `generateMusic()` function to parse the actual response format
4. The real issue might be:
   - Model name is being converted to `chirp-auk-turbo` by Suno (that's OK)
   - Response structure is different than expected
   - Need to poll immediately after submit to get clip data

### 3. 📋 After Fix: End-to-End Testing
```
/studio → DISCOVER (AI search) → VERIFY (lyrics) → CONFIGURE (style) → Generate
→ Pipeline: Suno → Song Selection → Thumbnail → Review → Video → Complete
```

---

## 📁 Modified Files

| File | Change | Status |
|------|--------|--------|
| `.env.local` | Added SUNO_API_KEY | ✅ |
| `lib/suno.ts` | Better response parsing | ⚠️ Needs format fix |
| `lib/pipeline.ts` | Added debug logging | ✅ |
| `app/api/jobs/[jobId]/stream/route.ts` | Better error logging | ✅ |
| `components/Nav.tsx` | Added Jobs link | ✅ |
| `app/jobs/page.tsx` | NEW: Job browser | ✅ |

---

## 🔧 How to Debug Without Consuming More Credits

### Check the Suno Console Response
1. Go to https://platform.suno.ai or your Suno console
2. Find the task with ID from the test: Look for `ANOTHER TEST` or search by date `2026-03-31 19:59:20`
3. When it completes, check its response format
4. Look for: Are clips in `data.clips`? Or `data`? Or direct array?

### Use Browser DevTools Network Tab
1. After a generation starts (once credits available)
2. Open DevTools → Network tab
3. Look for API calls to `api.sunoapi.org`
4. Check the JSON response format for `/api/v1/generate` endpoint

### Key Information to Find
```
When Suno returns clips after generation:
- Is response { code: 200, data: [...clips] }?
- Is response { code: 200, data: { clips: [...] } }?
- What fields do clips have? (id, status, audio_url, image_url, etc.)
```

---

## 🎬 Testing Without Credits

**Current Test Scenario Created:**
- Job ID: `job-1774979917799-x7bgru`
- Title: `ANOTHER TEST`
- Artists: `TEST ARTIST`
- Status: Generation in progress (or completed by now)

**To check results:**
```bash
# Stream the job to see current status
curl http://localhost:3000/api/jobs/job-1774979917799-x7bgru/stream

# Check jobs.json to see what's stored
cat /Users/mohammedaitelqadi/Piros-tape/jobs.json | jq '.[] | select(.id == "job-1774979917799-x7bgru")'
```

---

## 💡 Quick Fixes to Try

**If Suno returns clips but they're nested:**
```typescript
// Update lib/suno.ts line ~75
const clips = json.data?.clips || json.data || json;
if (Array.isArray(clips)) { ... }
```

**If clips have different field names:**
```typescript
// Check if clips have 'audio_url' or 'stream_url'
clips.forEach(c => {
  c.audio_url = c.audio_url || c.stream_url;
});
```

---

## 📊 System Architecture (For Reference)

```
DISCOVER (/studio) 
  → Gemini AI suggests 3 songs
  → User picks one

VERIFY (/studio/step2)
  → Fetch lyrics via Gemini
  → Show lyrics in preview

CONFIGURE (/studio/step3)
  → Select style, BPM, mood
  → Generate Track button

PIPELINE (/studio/[jobId])
  1. Submit to Suno API → Get clips ← 🔴 BLOCKED HERE
  2. Poll for completion
  3. User picks variation
  4. Generate thumbnail (Gemini)
  5. User reviews thumbnail
  6. Composite branding
  7. Assemble video (FFmpeg)
  8. Package metadata
  → Complete! Download video

JOBS (/jobs) ← NEW
  → Browse all previous productions
  → Click to resume/check status
```

---

## 🚀 Success Criteria

When working:
- ✅ Generate button creates job
- ✅ Redirects to pipeline monitor
- ✅ Logs show "About to call generateMusic"
- ✅ Logs show "generateMusic returned: 2 clips"
- ✅ UI shows song selection pause
- ✅ User picks song → thumbnail generation
- ✅ Thumbnail appears → accepts/rejects
- ✅ Video generation completes
- ✅ Download links appear

---

**Key Insight:** The system is 95% working. Just need to fix the response parsing from Suno API. Once we know the exact response format, it's a 5-minute fix.
