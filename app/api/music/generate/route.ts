import { NextRequest, NextResponse } from "next/server";
import { generateMusic, pollClips, downloadAudio } from "@/lib/suno";
import { createAsset } from "@/lib/assets";
import { promises as fs } from "fs";
import path from "path";

export const maxDuration = 600;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, style, title, artists } = body as {
    prompt: string;
    style: string;
    title: string;
    artists?: string;
  };

  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SUNO_API_KEY not configured" }, { status: 500 });
  }

  if (!prompt || !style || !title) {
    return NextResponse.json({ error: "prompt, style, and title are required" }, { status: 400 });
  }

  // Stream progress via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send("log", { message: "Submitting to Suno API..." });
        const initialClips = await generateMusic({ prompt, style, title, apiKey });
        send("log", { message: `${initialClips.length} clips queued, polling...` });

        const clips = await pollClips(initialClips, apiKey, (attempt, statuses) => {
          send("progress", { attempt, statuses, percent: Math.min(90, attempt * 3) });
        });

        send("log", { message: "Clips ready, downloading..." });

        // Download all clips and save as assets
        const outputDir = path.resolve(process.env.OUTPUT_DIR || "./output", "standalone");
        await fs.mkdir(outputDir, { recursive: true });

        const savedAssets = [];
        for (let i = 0; i < clips.length; i++) {
          const clip = clips[i];
          const audioUrl = clip.audio_url || clip.stream_url;
          if (!audioUrl) continue;

          const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_v${i + 1}_${Date.now()}.mp3`;
          const filePath = path.join(outputDir, fileName);
          await downloadAudio(audioUrl, filePath);
          const stat = await fs.stat(filePath);

          const asset = await createAsset({
            type: "song",
            title,
            artists: artists || "Unknown",
            filePath,
            fileName,
            fileSize: stat.size,
            duration: clip.duration,
            sunoClipId: clip.id,
          });
          savedAssets.push(asset);
        }

        send("complete", { assets: savedAssets, clips });
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
