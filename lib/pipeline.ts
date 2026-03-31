import path from "path";
import { promises as fs } from "fs";
import { Job, PipelineStepEvent, PipelineLogEvent } from "./types";
import { updateJob } from "./jobs";
import { buildSunoPrompt, buildImagePrompt, buildYouTubeTitle, buildYouTubeDescription, buildScenePrompt } from "./prompts";
import { generateMusic, pollClipStatus, downloadAudio } from "./suno";
import { generateThumbnail, generateSceneDescription } from "./gemini";
import { compositeThumbnail } from "./branding";
import { assembleVideo } from "./ffmpeg";

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
  });

  const log = (message: string, level: "info" | "success" | "error" = "info") => {
    emit("log", { timestamp: new Date().toISOString(), message, level });
  };

  try {
    // Step 1: Suno Music Generation
    emit("step", { step: 1, status: "running", progress: 0, message: "Submitting to Suno API..." });
    log("Submitting to Suno API...");

    const sunoPrompt = buildSunoPrompt(job);
    log(`Prompt length: ${sunoPrompt.length} chars`);

    const clipId = await generateMusic(sunoPrompt, sunoKey);
    log(`Clip ID: ${clipId} — polling...`, "success");

    const audioUrl = await pollClipStatus(clipId, sunoKey, (attempt, status) => {
      const progress = Math.min(90, attempt * 3);
      emit("step", { step: 1, status: "running", progress, message: `[${attempt * 10}s] status: ${status}` });
      log(`[${attempt * 10}s] status: ${status}`);
    });

    await downloadAudio(audioUrl, audioPath);
    const audioStat = await fs.stat(audioPath);
    log(`Audio saved: ${(audioStat.size / 1024 / 1024).toFixed(1)}MB`, "success");

    emit("step", { step: 1, status: "done", progress: 100, message: "Complete" });
    await updateJob(job.id, {
      currentStep: 2,
      stepStatuses: ["done", "running", "pending", "pending", "pending"],
    });

    // Step 2: Gemini Thumbnail Generation
    emit("step", { step: 2, status: "running", progress: 0, message: "Generating thumbnail..." });
    log("Submitting to Gemini imagen...");

    const imagePrompt = buildImagePrompt(job);
    await generateThumbnail(imagePrompt, geminiKey, rawThumbPath);

    const thumbStat = await fs.stat(rawThumbPath);
    log(`Raw thumbnail saved: ${(thumbStat.size / 1024).toFixed(0)}KB`, "success");

    emit("step", { step: 2, status: "done", progress: 100, message: "Complete" });
    await updateJob(job.id, {
      currentStep: 3,
      stepStatuses: ["done", "done", "running", "pending", "pending"],
    });

    // Step 3: Branding Composite
    emit("step", { step: 3, status: "running", progress: 0, message: "Compositing branding..." });
    log("Compositing branding overlay...");

    await compositeThumbnail(rawThumbPath, thumbPath, job);
    log("Branded thumbnail saved", "success");

    emit("step", { step: 3, status: "done", progress: 100, message: "Complete" });
    await updateJob(job.id, {
      currentStep: 4,
      stepStatuses: ["done", "done", "done", "running", "pending"],
    });

    // Step 4: Video Assembly
    emit("step", { step: 4, status: "running", progress: 0, message: "Assembling video..." });
    log("Starting FFmpeg video assembly...");
    log("Note: zoompan runs in real-time — this may take several minutes");

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
    log(`Video saved: ${(videoStat.size / 1024 / 1024).toFixed(1)}MB`, "success");

    emit("step", { step: 4, status: "done", progress: 100, message: "Complete" });
    await updateJob(job.id, {
      currentStep: 5,
      stepStatuses: ["done", "done", "done", "done", "running"],
    });

    // Step 5: Metadata Package
    emit("step", { step: 5, status: "running", progress: 0, message: "Building metadata..." });
    log("Generating YouTube metadata...");

    let huScene = "";
    try {
      const scenePrompt = buildScenePrompt(job);
      huScene = await generateSceneDescription(scenePrompt, geminiKey);
      log("Scene description generated", "success");
    } catch (err) {
      log(`Scene generation failed, using empty: ${err}`, "error");
    }

    const ytTitle = buildYouTubeTitle(job);
    const ytDescription = buildYouTubeDescription(job, huScene);
    const metadata = `YOUTUBE TITLE:\n${ytTitle}\n\nYOUTUBE DESCRIPTION:\n${ytDescription}`;
    await fs.writeFile(metadataPath, metadata, "utf-8");
    log("Metadata saved", "success");

    emit("step", { step: 5, status: "done", progress: 100, message: "Complete" });

    await updateJob(job.id, {
      status: "complete",
      currentStep: 5,
      stepStatuses: ["done", "done", "done", "done", "done"],
      completedAt: new Date().toISOString(),
    });

    emit("complete", { videoPath, thumbnailPath: thumbPath, metadataPath });
    log("Production complete!", "success");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const currentStep = (await updateJob(job.id, { status: "error" }))?.currentStep || 1;

    log(`Error at step ${currentStep}: ${message}`, "error");
    emit("error", { step: currentStep, message });
  }
}
