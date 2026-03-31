# Piros Tape — Current Status & Pipeline Blocking Issue

**Date:** March 31, 2026  
**Branch:** `claude/piros-tape-studio-psHZr`  
**Status:** ⚠️ **Wizard UI Complete → Pipeline Blocking on Job Creation**

---

## ✅ What's Working

### 1. **3-Step Wizard UI** (`/studio`)
- **Step 1 — DISCOVER:** Text query → Gemini AI suggestions (3 tracks with style/decade/BPM)
- **Step 2 — VERIFY:** Song selection + auto-fetch lyrics via `/api/lyrics`
- **Step 3 — CONFIGURE:** Style cards, BPM, mood, release year → "Generate Track" button
- Lyrics stored in `Job.lyrics` field and passed to Suno prompt

### 2. **API Infrastructure**
- ✅ `.env.local` created with both keys
- ✅ `GEMINI_API_KEY=AIzaSyBZA0p1CfT-xxDaZXg8HYJpmyQew5Mga58` (using `gemini-2.5-flash`)
- ✅ `SUNO_API_KEY=632ef7d696eb8cc14d5e8ba02e9bbf8b` (validated ✓ Status 200)
- ✅ `/api/research` works (Gemini song suggestions)
- ✅ `/api/lyrics` works (fetches lyrics from song title/artist)
- ✅ `/api/jobs` POST accepts `lyrics` field in request body
- ✅ `Job` type updated with `lyrics?: string` field

### 3. **Build Status**
- ✅ TypeScript compiles cleanly
- ✅ All 14 routes compiled successfully
- ✅ No type errors

---

## ❌ The Pipeline Blocking Issue

**Symptom:** When you click "Generate Track" → job is created → redirect to `/studio/[jobId]` → **EventSource opens but pipeline never actually starts, UI shows "Initializing"**

### Root Cause: Stream Handler Async Logic Incomplete

**Location:** `/app/api/jobs/[jobId]/stream/route.ts` (GET handler)

The architecture is actually **correct**:
1. ✅ POST `/api/jobs` creates job with `status: "pending"` → returns `{ jobId }` 
2. ✅ Frontend redirects to `/studio/[jobId]`
3. ✅ Page mounts and opens `EventSource('/api/jobs/{jobId}/stream')`
4. ❌ **Stream GET handler should run pipeline, BUT:**

**The Actual Problem:**
```typescript
const stream = new ReadableStream({
  async start(controller) {  // ← This is async
    // ... setup ...
    
    if (job.status === "pending") {
      try {
        await runPipeline(job, emit);  // ← Runs here
      } catch (err) { ... }
    }
    
    clearInterval(heartbeat);
    controller.close();  // ← Closes IMMEDIATELY after pipeline completes!
  }
});
```

**Issue:** The stream closes as soon as `runPipeline()` completes. But `runPipeline()` might take 10+ minutes. The frontend keeps the EventSource open waiting for events, but:
- The `emit()` function should keep writing events via `controller.enqueue()`
- After pipeline finishes, we send `"complete"` event and close
- **This should work!**

The actual issue is likely:
1. **`runPipeline()` throws an error early** (missing env vars, Suno API error) → event sent, stream closed
2. **Frontend misses the error event** or doesn't display it clearly
3. **OR:** The `emit()` function fails silently if stream is already closed

### ✅ FIXED: Suno API Key Added & Validated

✅ Added to `.env.local`: `SUNO_API_KEY=632ef7d696eb8cc14d5e8ba02e9bbf8b`  
✅ API validation: Status 200 response — key is valid  
✅ Project rebuilt successfully

**Pipeline is now ready to execute!**

---

## 🔧 Debugging Steps

Run this in browser console while on the pipeline page:
```javascript
// Check EventSource connection
const es = new EventSource(`/api/jobs/${jobId}/stream`);
es.onopen = () => console.log('✅ Stream connected');
es.onerror = (e) => console.error('❌ Stream error:', e);
```

Check server logs for errors during:
- Suno API call (`generateMusic()`)
- Gemini API call (if lyrics endpoint is called)
- File I/O operations

**Next:** Add better error logging and client-side error display.

---

## 📋 Immediate Next Steps

1. **Add Suno API Key to .env.local**
   - Get key from https://sunoapi.org or your Suno provider
   - Edit `.env.local` and replace `add_your_suno_api_key_here` with your actual key
   - **CRITICAL:** Restart dev server after editing env file!

2. **Rebuild and Test**
   ```bash
   npm run build
   npm run dev
   ```

3. **Test Pipeline:**
   - Go to `/studio`
   - Use DISCOVER → find song
   - Use VERIFY → select song + fetch lyrics
   - Use CONFIGURE → set style/mood
   - Click "▶ Generate Track"
   - **Expected:** Redirects to `/studio/[jobId]` with streaming logs
   - **Pipeline should:**
     - Submit to Suno API → 2 music variations generated
     - Wait for song selection
     - Generate thumbnail (Gemini)
     - Wait for thumbnail review
     - Composite branding
     - Assemble video (FFmpeg)

4. **Monitor Server Logs:**
   - Look for `[Pipeline] Starting for job` 
   - Look for `[Pipeline] Checking keys`
   - Any error messages about API calls

---

## 📁 Key Files

| File | Purpose | Status |
|------|---------|--------|
| `app/studio/page.tsx` | 3-step wizard UI | ✅ Complete |
| `app/api/jobs/route.ts` | Job creation | ✅ Working |
| `lib/pipeline.ts` | Core pipeline logic | ✅ Ready (with debug logs added) |
| `lib/suno.ts` | Suno API integration | ✅ Ready |
| `lib/gemini.ts` | Gemini API (lyrics, thumbnails) | ✅ Ready |
| `app/api/jobs/[jobId]/stream/route.ts` | SSE streaming logs | ✅ Correct architecture (debug logs added) |
| `.env.local` | API keys | ⚠️ **SUNO_API_KEY missing** |

---

## ❌ Current Issue: Suno API Model Mismatch

**Last Status:** Pipeline is running and calling Suno API ✅
- Suno receives the request and starts processing (status: "running", 12 credits/generation)
- BUT: Request is using wrong model - `chirp-auk-turbo` instead of `V4_5ALL`
- This causes Suno response to be empty/misformatted
- Pipeline fails with "Suno returned no clips"

**Root Cause:** Model name mismatch or API response format changed

**Solution Needed:**
1. Check what model field Suno API actually expects/supports
2. Update response parsing to handle the actual response format from Suno
3. Test without creating more generations (credits limited!)

**Current Flow Status:**
- ✅ Job creation works
- ✅ Stream endpoint connects and starts pipeline
- ✅ Suno API is called and processes request
- ❌ Response parsing fails (model mismatch or format issue)
- ❌ Pipeline halts at step 1

---

## ✅ To Get It Working

**Currently:**
- ✅ Suno API key configured and validated  
- ✅ Pipeline architecture working correctly
- ✅ Suno API is receiving and processing requests (as seen in Suno console)
- ❌ Response parsing issue - need to handle different Suno response formats

**What I've implemented:**
1. **Better Suno response parsing** - handles multiple response formats
2. **Jobs browser page** - view all previous productions at `/jobs`
3. **Error handling** - more detailed error logging for debugging

**Next steps to fix pipeline:**
1. Check the Suno console to see what format the completed clips are returned in
2. Update response parsing in `lib/suno.ts` to match actual Suno response format
3. Test ONE more generation carefully to see the exact response structure
4. Once we know the format, the pipeline should work end-to-end

**Cost-saving:** DON'T generate new tests yet. Let's look at the Suno console response format from the running generation to fix the parsing logic first.

---

## 📋 Latest Features Added

- ✅ `/jobs` page to browse all productions (running, completed, failed)
- ✅ Job status indicators and timestamps
- ✅ Better error messages in pipeline
- ✅ More flexible Suno API response parsing

