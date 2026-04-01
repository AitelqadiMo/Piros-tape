import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";
import { promises as fs } from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const file = request.nextUrl.searchParams.get("file");
  if (!file || !["video", "thumbnail", "thumbnail_raw", "metadata", "audio"].includes(file)) {
    return NextResponse.json({ error: "Invalid file type. Use: video, thumbnail, thumbnail_raw, metadata, audio" }, { status: 400 });
  }

  const inline = request.nextUrl.searchParams.get("inline") === "1";

  const base = process.env.OUTPUT_DIR || "./output";
  const outputDir = job.outputDir || path.resolve(/*turbopackIgnore: true*/ base, jobId);

  let filePath: string;
  let contentType: string;
  let fileName: string;

  const safeName = job.title.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");

  switch (file) {
    case "video":
      filePath = path.join(outputDir, `${safeName}_PIROS_TAPE.mp4`);
      contentType = "video/mp4";
      fileName = `${safeName}_PIROS_TAPE.mp4`;
      break;
    case "thumbnail":
      filePath = path.join(outputDir, "thumbnail.jpg");
      contentType = "image/jpeg";
      fileName = `${safeName}_thumbnail.jpg`;
      break;
    case "thumbnail_raw":
      filePath = path.join(outputDir, "thumbnail_raw.jpg");
      contentType = "image/jpeg";
      fileName = `${safeName}_thumbnail_raw.jpg`;
      break;
    case "metadata":
      filePath = path.join(outputDir, "metadata.txt");
      contentType = "text/plain; charset=utf-8";
      fileName = `${safeName}_metadata.txt`;
      break;
    case "audio":
      filePath = path.join(outputDir, "song.mp3");
      contentType = "audio/mpeg";
      fileName = `${safeName}_song.mp3`;
      break;
    default:
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  try {
    const data = await fs.readFile(filePath);
    const disposition = inline ? `inline; filename="${fileName}"` : `attachment; filename="${fileName}"`;
    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Content-Length": String(data.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
