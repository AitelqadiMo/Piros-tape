import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { spawnSync, execSync } from "child_process";
import { promises as fs } from "fs";

/**
 * Sanitize metadata string to prevent FFmpeg argument errors
 * Removes or replaces problematic characters
 */
function sanitizeMetadata(str: string): string {
  return str
    .replace(/[–—]/g, "-")           // Replace en-dash/em-dash with hyphen
    .replace(/[|]/g, "-")             // Replace pipes with hyphens
    .replace(/[^\w\s\-()&.']/g, "")  // Keep only safe ASCII characters
    .substring(0, 200)                // Limit length to prevent buffer issues
    .trim();
}

export interface VideoOptions {
  thumbnailPath: string;
  audioPath: string;
  outputPath: string;
  title: string;
  artists: string;
  crf?: number;
  preset?: string;
  audioBitrate?: string;
  ffmpegPath?: string;
  onProgress?: (percent: number) => void;
}

let cachedFfmpegPath: string | null = null;

function resolveFfmpegBinary(explicitPath?: string): string {
  if (explicitPath) return explicitPath;
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  
  // Return cached path if available
  if (cachedFfmpegPath) return cachedFfmpegPath;
  
  // Try multiple approaches to find ffmpeg-static
  const attempts: string[] = [];
  
  // 1. Try to dynamically require ffmpeg-static
  try {
    // eslint-disable-next-line global-require
    const ffmpegStatic = require("ffmpeg-static");
    if (typeof ffmpegStatic === "string" && ffmpegStatic.length > 0) {
      attempts.push(ffmpegStatic);
    }
  } catch (err) {
    // ffmpeg-static not available via require
  }
  
  // 2. Try common installation paths
  attempts.push(
    path.join(__dirname, "..", "node_modules", "ffmpeg-static", "ffmpeg"),
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
    path.join(process.cwd(), "..", "ffmpeg-static", "ffmpeg")
  );
  
  // 3. Try system ffmpeg as last resort
  attempts.push("ffmpeg");
  
  // Find first available binary
  for (const binPath of attempts) {
    try {
      const result = spawnSync(binPath, ["-version"], { 
        stdio: "pipe",
        timeout: 5000 
      });
      if (result.status === 0) {
        cachedFfmpegPath = binPath;
        return binPath;
      }
    } catch (err) {
      // Try next path
    }
  }
  
  // If nothing works, still return "ffmpeg" and let it fail with a better error
  // when actually used
  return "ffmpeg";
}

function assertFfmpegAvailable(ffmpegPath: string): void {
  const probe = spawnSync(ffmpegPath, ["-version"], { 
    stdio: "pipe",
    timeout: 5000 
  });
  if (probe.error || probe.status !== 0) {
    console.error(`FFmpeg probe failed for path: ${ffmpegPath}`);
    console.error(`Error:`, probe.error);
    throw new Error(
      `FFmpeg is not available at: ${ffmpegPath}. Install ffmpeg, set FFMPEG_PATH environment variable, or ensure ffmpeg-static is properly installed. Attempted: ${ffmpegPath}`
    );
  }
}

/**
 * Utility function to diagnose FFmpeg availability
 * Can be called from API routes to check if FFmpeg is properly configured
 */
export function diagnoseFFmpeg(): { available: boolean; path: string; error?: string } {
  try {
    const resolved = resolveFfmpegBinary();
    assertFfmpegAvailable(resolved);
    return { available: true, path: resolved };
  } catch (err) {
    return {
      available: false,
      path: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function assembleVideo(options: VideoOptions): Promise<void> {
  const {
    thumbnailPath,
    audioPath,
    outputPath,
    title,
    artists,
    crf = 18,
    preset = "slow",
    audioBitrate = "320k",
    ffmpegPath,
    onProgress,
  } = options;

  // Sanitize metadata to prevent FFmpeg errors
  const sanitizedTitle = sanitizeMetadata(title);
  const sanitizedArtists = sanitizeMetadata(artists);

  console.log(`[FFmpeg] Input metadata:`);
  console.log(`[FFmpeg]   Title: "${title}" → "${sanitizedTitle}"`);
  console.log(`[FFmpeg]   Artists: "${artists}" → "${sanitizedArtists}"`);

  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  const resolvedFfmpegPath = resolveFfmpegBinary(ffmpegPath);
  
  console.log(`[FFmpeg] Resolved path: ${resolvedFfmpegPath}`);
  console.log(`[FFmpeg] Explicit path param: ${ffmpegPath}`);
  console.log(`[FFmpeg] Environment FFMPEG_PATH: ${process.env.FFMPEG_PATH}`);
  
  assertFfmpegAvailable(resolvedFfmpegPath);
  
  console.log(`[FFmpeg] Binary verified, setting path...`);
  ffmpeg.setFfmpegPath(resolvedFfmpegPath);
  console.log(`[FFmpeg] Path set, starting video assembly...`);

  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(thumbnailPath)
      .inputOptions(["-loop", "1"])
      .input(audioPath)
      .videoFilter(
        "zoompan=z='min(zoom+0.0002,1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=24,format=yuv420p"
      )
      .videoCodec("libx264")
      .outputOptions([`-preset`, preset, `-crf`, String(crf)])
      .audioCodec("aac")
      .audioBitrate(audioBitrate)
      .audioFrequency(44100)
      .outputOptions(["-shortest"])
      .on("start", (cmd) => {
        console.log(`[FFmpeg] Process started with command:`);
        console.log(`[FFmpeg] ${cmd}`);
      })
      .on("progress", (p) => {
        console.log(`[FFmpeg] Progress: ${Math.round(p.percent || 0)}%`);
        if (onProgress && p.percent) {
          onProgress(Math.round(p.percent));
        }
      })
      .on("end", () => {
        console.log(`[FFmpeg] Encoding complete`);
        resolve();
      })
      .on("error", (err) => {
        console.error(`[FFmpeg] Error details:`, {
          message: err instanceof Error ? err.message : String(err),
        });
        reject(new Error(`FFmpeg error: ${err instanceof Error ? err.message : String(err)}`));
      });
    
    command.save(outputPath);
  });
}
