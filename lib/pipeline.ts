import path from "path";
import { promises as fs } from "fs";
import { Job } from "./types";
import { updateJob } from "./jobs";
import {
  buildSunoPrompt,
  buildSunoStyle,
  buildImagePrompt,
  buildYouTubeTitle,
  buildYouTubeDescription,
  buildScenePrompt,
} from "./prompts";
import { generateMusic, pollClips, downloadAudio, SunoClip } from "./suno";
import { generateThumbnail, generateSceneDescription } from "./gemini";
import { compositeThumbnail } from "./branding";
import { assembleVideo } from "./ffmpeg";
import { waitForAction } from "./actions";

type EmitFn = (event: string, data: unknown) => void;

function getOutputDir(jobId: string): string {
  const base = process.env.OUTPUT_DIR || "./output";
  return path.resolve(/*turbopackIgnore: true*/ base, jobId);
}

function safeFileName(title: string): string {
  return title.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
}

export async function runPipeline(job: Job, emit: EmitFn): Promise<void> {
  const sunoKey = process.env.SUNO_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!sunoKey || sunoKey === "your_suno_key_here") {
    throw new Error("SUNO_API_KEY not configured");
  }
  if (!geminiKey || geminiKey === "your_gemini_key_here") {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const outputDir = getOutputDir(job.id);
  await fs.mkdir(outputDir, { recursive: true });

  const audioPath = path.join(outputDir, "song.mp3");
  const rawThumbPath = path.join(outputDir, "thumbnail_raw.jpg");
  const thumbPath = path.join(outputDir, "thumbnail.jpg");
  const safeName = safeFileName(job.title);
  const videoPath = path.join(outputDir, `${safeName}_PIROS_TAPE.mp4`);
  const metadataPath = path.join(outputDir, "metadata.txt");

  await updateJob(job.id, {
    status: "running",
    outputDir,
    currentStep: 1,
    stepStatuses: ["running", "pending", "pending", "pending", "pending"],
    waitingFor: null,
  });

  const log = (message: string, level: "info" | "success" | "error" = "info") => {
    emit("log", { timestamp: new Date().toISOString(), message, level });
  };

  try {
    // ── STEP 1: Suno Music Generation ─────────────────────────────────────
    emit("step", { step: 1, status: "running", progress: 0, message: "Submitting to Suno API..." });
    log("Submitting to Suno API (sunoapi.org)...");

    const sunoPrompt = buildSunoPrompt(job);
    const sunoStyle = buildSunoStyle(job);
    log(`Style: ${sunoStyle}`);
    log(`Prompt length: ${sunoPrompt.length} chars`);

    const initialClips = await generateMusic({
      prompt: sunoPrompt,
      style: sunoStyle,
      title: job.title,
      apiKey: sunoKey,
    });

    log(`${initialClips.length} clips queued — IDs: ${initialClips.map((c) => c.id.slice(0, 8)).join(", ")}`, "success");
    log("Polling for completion (up to 6 minutes)...");

    const completedClips = await pollClips(initialClips, sunoKey, (attempt, statuses) => {
      const progress = Math.min(88, attempt * 3);
      const statusStr = statuses.join(" / ");
      emit("step", { step: 1, status: "running", progress, message: `[${attempt * 10}s] ${statusStr}` });
      log(`[${attempt * 10}s] ${statusStr}`);
    });

    log(`Both clips ready — ${completedClips.map((c) => c.id.slice(0, 8)).join(", ")}`, "success");
    emit("step", { step: 1, status: "done", progress: 100, message: "2 variations ready — awaiting selection" });

    // ── PAUSE: Song Selection ──────────────────────────────────────────────
    const selectionPayload = {
      clips: completedClips.map((c) => ({
        id: c.id,
        streamUrl: c.stream_url,
        audioUrl: c.audio_url,
        title: c.title,
        duration: c.duration,
      })),
    };

    await updateJob(job.id, {
      currentStep: 1,
      stepStatuses: ["done", "pending", "pending", "pending", "pending"],
      waitingFor: "song_selection",
      waitingPayload: selectionPayload,
    });

    emit("awaiting_input", { type: "song_selection", payload: selectionPayload });
    log("Waiting for song selection...");

    const songAction = (await waitForAction(job.id)) as { clipIndex: number };
    const selectedClip: SunoClip = completedClips[songAction.clipIndex] ?? completedClips[0];

    log(`Selected: Variation ${songAction.clipIndex + 1} (${selectedClip.id.slice(0, 8)})`, "success");

    const audioUrl = selectedClip.audio_url || selectedClip.stream_url;
    if (!audioUrl) throw new Error("Selected clip has no downloadable audio URL");

    await downloadAudio(audioUrl, audioPath);
    const audioStat = await fs.stat(audioPath);
    log(`Audio downloaded: ${(audioStat.size / 1024 / 1024).toFixed(1)} MB`, "success");

    // ── STEP 2: Gemini Thumbnail Generation ───────────────────────────────
    await updateJob(job.id, {
      currentStep: 2,
      stepStatuses: ["done", "running", "pending", "pending", "pending"],
      waitingFor: null,
    });

    // Thumbnail generation loop (allows regeneration)
    let thumbnailAccepted = false;
    let thumbAttempt = 0;

    while (!thumbnailAccepted) {
      thumbAttempt++;
      emit("step", { step: 2, status: "running", progress: 0, message: thumbAttempt > 1 ? "Regenerating thumbnail..." : "Generating thumbnail..." });
      log(thumbAttempt > 1 ? `Regenerating thumbnail (attempt ${thumbAttempt})...` : "Submitting to Gemini (Nano Banana 2)...");

      const imagePrompt = buildImagePrompt(job);
      await generateThumbnail(imagePrompt, geminiKey, rawThumbPath);

      const thumbStat = await fs.stat(rawThumbPath);
      log(`Raw thumbnail saved: ${(thumbStat.size / 1024).toFixed(0)} KB`, "success");
      emit("step", { step: 2, status: "done", progress: 100, message: "Thumbnail ready — awaiting review" });

      // ── PAUSE: Thumbnail Review ──────────────────────────────────────────
      const thumbPayload = {
        thumbnailUrl: `/api/jobs/${job.id}/download?file=thumbnail_raw`,
      };

      await updateJob(job.id, {
        stepStatuses: ["done", "done", "pending", "pending", "pending"],
        waitingFor: "thumbnail_review",
        waitingPayload: thumbPayload,
      });

      emit("awaiting_input", { type: "thumbnail_review", payload: thumbPayload });
      log("Waiting for thumbnail review...");

      const thumbAction = (await waitForAction(job.id)) as { action: "accept" | "regenerate" };

      if (thumbAction.action === "accept") {
        thumbnailAccepted = true;
        log("Thumbnail accepted.", "success");
      } else {
        log("Regenerating thumbnail...");
        emit("step", { step: 2, status: "running", progress: 0, message: "Regenerating..." });
        await updateJob(job.id, {
          stepStatuses: ["done", "running", "pending", "pending", "pending"],
          waitingFor: null,
        });
      }
    }

    // ── STEP 3: Branding Composite ─────────────────────────────────────────
    await updateJob(job.id, {
      currentStep: 3,
      stepStatuses: ["done", "done", "running", "pending", "pending"],
      waitingFor: null,
    });

    emit("step", { step: 3, status: "running", progress: 0, message: "Compositing branding..." });
    log("Applying branding overlay...");

    await compositeThumbnail(rawThumbPath, thumbPath, job);
    log("Branded thumbnail saved.", "success");

    emit("step", { step: 3, status: "done", progress: 100, message: "Complete" });

    // ── STEP 4: Video Assembly ─────────────────────────────────────────────
    await updateJob(job.id, {
      currentStep: 4,
      stepStatuses: ["done", "done", "done", "running", "pending"],
    });

    emit("step", { step: 4, status: "running", progress: 0, message: "Assembling video..." });
    log("Starting FFmpeg video assembly (zoompan — may take several minutes)...");

    await assembleVideo({
      thumbnailPath: thumbPath,
      audioPath,
      outputPath: videoPath,
      title: job.title,
      artists: job.artists,
      onProgress: (percent) => {
        emit("step", { step: 4, status: "running", progress: percent, message: `Encoding: ${percent}%` });
      },
    });

    const videoStat = await fs.stat(videoPath);
    log(`Video saved: ${(videoStat.size / 1024 / 1024).toFixed(1)} MB`, "success");
    emit("step", { step: 4, status: "done", progress: 100, message: "Complete" });

    // ── STEP 5: Metadata Package ───────────────────────────────────────────
    await updateJob(job.id, {
      currentStep: 5,
      stepStatuses: ["done", "done", "done", "done", "running"],
    });

    emit("step", { step: 5, status: "running", progress: 0, message: "Building metadata..." });
    log("Generating YouTube metadata...");

    let huScene = "";
    try {
      const scenePrompt = buildScenePrompt(job);
      huScene = await generateSceneDescription(scenePrompt, geminiKey);
      log("Scene description generated.", "success");
    } catch (err) {
      log(`Scene generation skipped: ${err}`, "error");
    }

    const ytTitle = buildYouTubeTitle(job);
    const ytDescription = buildYouTubeDescription(job, huScene);
    const metadataText = `YOUTUBE TITLE:\n${ytTitle}\n\nYOUTUBE DESCRIPTION:\n${ytDescription}`;
    await fs.writeFile(metadataPath, metadataText, "utf-8");
    log("Metadata saved.", "success");

    emit("step", { step: 5, status: "done", progress: 100, message: "Complete" });

    await updateJob(job.id, {
      status: "complete",
      currentStep: 5,
      stepStatuses: ["done", "done", "done", "done", "done"],
      completedAt: new Date().toISOString(),
      waitingFor: null,
    });

    emit("complete", { videoPath, thumbnailPath: thumbPath, metadataPath });
    log("Production complete!", "success");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const updated = await updateJob(job.id, { status: "error", waitingFor: null });
    const step = updated?.currentStep ?? 1;
    log(`Error at step ${step}: ${message}`, "error");
    emit("error", { step, message });
  }
}
