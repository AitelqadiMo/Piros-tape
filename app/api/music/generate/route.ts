import { NextRequest, NextResponse } from "next/server";
import { generateTwoVariations, saveLyriaAudio } from "@/lib/lyria";
import { createAsset } from "@/lib/assets";
import { promises as fs } from "fs";
import path from "path";

export const maxDuration = 600;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, title, artists, useClip } = body as {
    prompt: string;
    title: string;
    artists?: string;
    useClip?: boolean;
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  if (!prompt || !title) {
    return NextResponse.json({ error: "prompt and title are required" }, { status: 400 });
  }

  // Stream progress via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send("log", { message: "Submitting to Lyria 3 Pro..." });
        send("progress", { percent: 10 });

        send("log", { message: "Generating 2 variations (this may take a few minutes)..." });
        const variations = await generateTwoVariations({
          prompt,
          apiKey,
          useClip,
        });

        send("log", { message: `${variations.length} variations generated` });
        send("progress", { percent: 80 });

        // Save all variations as assets
        const outputDir = path.resolve(process.env.OUTPUT_DIR || "./output", "standalone");
        await fs.mkdir(outputDir, { recursive: true });

        const savedAssets = [];
        for (let i = 0; i < variations.length; i++) {
          const variation = variations[i];
          const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_v${i + 1}_${Date.now()}.mp3`;
          const filePath = path.join(outputDir, fileName);
          await saveLyriaAudio(variation, filePath);
          const stat = await fs.stat(filePath);

          const asset = await createAsset({
            type: "song",
            title,
            artists: artists || "Unknown",
            filePath,
            fileName,
            fileSize: stat.size,
          });
          savedAssets.push(asset);
          send("log", { message: `Variation ${i + 1} saved: ${(stat.size / 1024 / 1024).toFixed(1)} MB` });
        }

        send("progress", { percent: 100 });
        send("complete", { assets: savedAssets });
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
