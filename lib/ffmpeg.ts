import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { promises as fs } from "fs";

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

  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
  } else if (process.env.FFMPEG_PATH) {
    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
  }

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(thumbnailPath)
      .inputOptions(["-loop", "1"])
      .input(audioPath)
      .videoFilter(
        "zoompan=z='min(zoom+0.0002,1.04)':x='iw/2-(iw/zoom/2)'" +
          ":y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=24,format=yuv420p"
      )
      .videoCodec("libx264")
      .outputOptions([`-preset`, preset, `-crf`, String(crf)])
      .audioCodec("aac")
      .audioBitrate(audioBitrate)
      .audioFrequency(44100)
      .outputOptions([
        "-shortest",
        "-metadata",
        `title=${artists} – ${title} | PIROS TAPE VERZIÓ`,
        "-metadata",
        `artist=Piros Tape`,
      ])
      .on("progress", (p) => {
        if (onProgress && p.percent) {
          onProgress(Math.round(p.percent));
        }
      })
      .on("end", () => resolve())
      .on("error", (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
      .save(outputPath);
  });
}
