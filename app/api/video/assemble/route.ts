import { NextRequest, NextResponse } from "next/server";
import { assembleVideo } from "@/lib/ffmpeg";
import { compositeThumbnail } from "@/lib/branding";
import { createAsset, getAsset } from "@/lib/assets";
import { promises as fs } from "fs";
import path from "path";
import { Job } from "@/lib/types";

export const maxDuration = 600;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { songAssetId, thumbnailAssetId, title, artists, style, decade, crf, audioBitrate, applyBranding } = body as {
    songAssetId: string;
    thumbnailAssetId: string;
    title: string;
    artists: string;
    style?: string;
    decade?: string;
    crf?: number;
    audioBitrate?: string;
    applyBranding?: boolean;
  };

  if (!songAssetId || !thumbnailAssetId || !title || !artists) {
    return NextResponse.json({ error: "songAssetId, thumbnailAssetId, title, and artists are required" }, { status: 400 });
  }

  const songAsset = await getAsset(songAssetId);
  const thumbAsset = await getAsset(thumbnailAssetId);

  if (!songAsset || songAsset.type !== "song") {
    return NextResponse.json({ error: "Song asset not found" }, { status: 404 });
  }
  if (!thumbAsset || thumbAsset.type !== "thumbnail") {
    return NextResponse.json({ error: "Thumbnail asset not found" }, { status: 404 });
  }

  try {
    const outputDir = path.resolve(process.env.OUTPUT_DIR || "./output", "standalone");
    await fs.mkdir(outputDir, { recursive: true });

    let thumbnailPath = thumbAsset.filePath;

    // Optionally apply branding
    if (applyBranding !== false) {
      const brandedPath = path.join(outputDir, `branded_${Date.now()}.jpg`);
      await compositeThumbnail(thumbAsset.filePath, brandedPath, {
        title,
        artists,
        style: style || "Funk Soul",
        decade: decade || "1970",
      } as Job);
      thumbnailPath = brandedPath;
    }

    const safeName = title.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
    const fileName = `${safeName}_PIROS_TAPE_${Date.now()}.mp4`;
    const videoPath = path.join(outputDir, fileName);

    await assembleVideo({
      thumbnailPath,
      audioPath: songAsset.filePath,
      outputPath: videoPath,
      title,
      artists,
      crf: crf || 18,
      audioBitrate: audioBitrate || "320k",
    });

    const stat = await fs.stat(videoPath);

    const asset = await createAsset({
      type: "video",
      title,
      artists,
      filePath: videoPath,
      fileName,
      fileSize: stat.size,
      meta: { songAssetId, thumbnailAssetId, crf, audioBitrate },
    });

    return NextResponse.json({ asset });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
